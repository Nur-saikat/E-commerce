using System.Security.Cryptography;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.Common.Options;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using ECommerce.Shared.Exceptions;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class AuthService
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;
    private readonly IEmailSender _email;
    private readonly ICurrentUser _currentUser;
    private readonly AppOptions _appOptions;

    public AuthService(IUnitOfWork uow, IPasswordHasher hasher, ITokenService tokens,
        IEmailSender email, ICurrentUser currentUser, IOptions<AppOptions> appOptions)
    {
        _uow = uow;
        _hasher = hasher;
        _tokens = tokens;
        _email = email;
        _currentUser = currentUser;
        _appOptions = appOptions.Value;
    }

    private const int OtpExpiryMinutes = 10;
    private const int OtpResendSeconds = 60;
    private const int OtpMaxAttempts = 5;

    public async Task<OtpChallengeResponse> RequestRegistrationOtpAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _uow.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct) is not null)
            throw new ConflictException("An account with this email already exists");

        var pending = await _uow.RegistrationOtps.FirstOrDefaultAsync(o => o.Email == email, ct);
        if (pending is not null && pending.UpdatedAt > DateTime.UtcNow.AddSeconds(-OtpResendSeconds))
            throw new BadRequestException($"Please wait {OtpResendSeconds} seconds before requesting another code");

        var now = DateTime.UtcNow;
        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var otp = pending ?? new RegistrationOtp { Email = email };
        otp.CodeHash = code.ToSha256();
        otp.ExpiresAt = now.AddMinutes(OtpExpiryMinutes);
        otp.Attempts = 0;
        otp.FirstName = request.FirstName.Trim();
        otp.LastName = request.LastName.Trim();
        otp.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        otp.PasswordHash = _hasher.Hash(request.Password);
        otp.UpdatedAt = now;

        if (pending is null) await _uow.RegistrationOtps.AddAsync(otp, ct);
        else await _uow.RegistrationOtps.UpdateAsync(otp, ct);

        try
        {
            await _email.SendAsync(email, "Your Safwan verification code",
                $"<p>Use this code to finish creating your Safwan account:</p>" +
                $"<p style=\"font-size:26px;font-weight:700;letter-spacing:8px\">{code}</p>" +
                $"<p>The code expires in {OtpExpiryMinutes} minutes.</p>", ct);
        }
        catch
        {
            // Email delivery must not block sign-up; the code can be resent.
        }

        return new OtpChallengeResponse
        {
            Email = email,
            ExpiresInSeconds = OtpExpiryMinutes * 60,
            ResendAfterSeconds = OtpResendSeconds,
            Otp = _appOptions.ExposeOtp ? code : null
        };
    }

    public async Task<AuthResponse> VerifyRegistrationOtpAsync(VerifyRegistrationRequest request, string? ip, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var otp = await _uow.RegistrationOtps.FirstOrDefaultAsync(o => o.Email == email, ct)
            ?? throw new BadRequestException("No pending registration for this email. Please request a new code.");

        if (otp.ExpiresAt < DateTime.UtcNow)
        {
            await _uow.RegistrationOtps.Collection.DeleteOneAsync(o => o.Id == otp.Id, ct);
            throw new BadRequestException("This code has expired. Please request a new one.");
        }

        if (!string.Equals(otp.CodeHash, request.Code.Trim().ToSha256(), StringComparison.Ordinal))
        {
            otp.Attempts += 1;
            otp.UpdatedAt = DateTime.UtcNow;
            await _uow.RegistrationOtps.UpdateAsync(otp, ct);
            if (otp.Attempts >= OtpMaxAttempts)
            {
                await _uow.RegistrationOtps.Collection.DeleteOneAsync(o => o.Id == otp.Id, ct);
                throw new BadRequestException("Too many incorrect codes. Please request a new one.");
            }
            throw new BadRequestException("That code is incorrect. Please try again.");
        }

        if (await _uow.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct) is not null)
            throw new ConflictException("An account with this email already exists");

        var user = new User
        {
            FirstName = otp.FirstName,
            LastName = otp.LastName,
            Email = email,
            Phone = otp.Phone,
            PasswordHash = otp.PasswordHash,
            Role = AppRoles.Customer,
            Permissions = new List<string>(),
            EmailVerified = true
        };
        await _uow.Users.AddAsync(user, ct);
        await _uow.RegistrationOtps.Collection.DeleteOneAsync(o => o.Id == otp.Id, ct);

        return await IssueTokensAsync(user, ip, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _uow.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);
        if (user is null || !_hasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password");
        if (!user.IsActive)
            throw new ForbiddenException("Your account has been deactivated. Please contact support.");

        user.LastLoginAt = DateTime.UtcNow;
        return await IssueTokensAsync(user, ip, ct);
    }

    public async Task<AuthResponse> RefreshAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        var hash = _tokens.HashRefreshToken(refreshToken);
        var filter = new BsonDocument("RefreshTokens", new BsonDocument("$elemMatch", new BsonDocument
        {
            { "TokenHash", hash },
            { "RevokedAt", BsonNull.Value },
            { "ExpiresAt", new BsonDocument("$gt", DateTime.UtcNow) }
        }));
        var user = await _uow.Users.Collection.Find(filter).FirstOrDefaultAsync(ct)
            ?? throw new UnauthorizedException("Invalid or expired refresh token");

        var existing = user.RefreshTokens.FirstOrDefault(t => t.TokenHash == hash);
        if (existing is null) throw new UnauthorizedException("Invalid refresh token");

        var newToken = _tokens.GenerateRefreshToken();
        existing.RevokedAt = DateTime.UtcNow;
        existing.ReplacedByTokenHash = _tokens.HashRefreshToken(newToken);
        await StoreRefreshTokenAsync(user, newToken, ip, ct);
        await _uow.Users.UpdateAsync(user, ct);

        var permissions = await ResolvePermissionsAsync(user, ct);
        var accessToken = _tokens.CreateAccessToken(user.Id.ToString(), user.Email, user.FullName, user.Role, permissions);
        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = newToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_tokens.AccessTokenMinutes),
            User = user.ToDto()
        };
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated || !ObjectId.TryParse(_currentUser.UserId, out var userId)) return;
        var user = await _uow.Users.GetByIdAsync(userId, ct);
        if (user is null) return;

        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var hash = _tokens.HashRefreshToken(refreshToken);
            var token = user.RefreshTokens.FirstOrDefault(t => t.TokenHash == hash);
            if (token is not null) token.RevokedAt = DateTime.UtcNow;
        }
        else
        {
            foreach (var token in user.RefreshTokens.Where(t => t.RevokedAt is null))
                token.RevokedAt = DateTime.UtcNow;
        }
        await _uow.Users.UpdateAsync(user, ct);
    }

    public async Task<UserDto> MeAsync(CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated || !ObjectId.TryParse(_currentUser.UserId, out var userId))
            throw new UnauthorizedException();
        var user = await _uow.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, ct)
            ?? throw new UnauthorizedException();
        var dto = user.ToDto();
        dto.Permissions = await ResolvePermissionsAsync(user, ct);
        return dto;
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _uow.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);
        const string genericMessage = "If an account exists for this email, a reset link has been sent.";

        if (user is null)
            return new ForgotPasswordResponse { Message = genericMessage };

        var token = StringExtensions.RandomToken();
        user.PasswordResetToken = token.ToSha256();
        user.PasswordResetExpiresAt = DateTime.UtcNow.AddHours(1);
        await _uow.Users.UpdateAsync(user, ct);

        var resetUrl = $"{_appOptions.FrontendBaseUrl}/reset-password?token={Uri.EscapeDataString(token)}";
        try
        {
            await _email.SendAsync(user.Email, "Reset your password",
                $"<p>Reset your password using <a href=\"{resetUrl}\">this link</a>. The link expires in one hour.</p>", ct);
        }
        catch
        {
            // Email delivery failures are logged by the email service.
        }

        return new ForgotPasswordResponse
        {
            Message = genericMessage,
            ResetToken = _appOptions.ExposeResetToken ? token : null,
            ResetUrl = _appOptions.ExposeResetToken ? resetUrl : null
        };
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var hash = request.Token.Trim().ToSha256();
        var user = await _uow.Users.FirstOrDefaultAsync(u =>
            u.PasswordResetToken == hash && !u.IsDeleted, ct);
        if (user is null || user.PasswordResetExpiresAt is null || user.PasswordResetExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("This reset link is invalid or has expired");

        user.PasswordHash = _hasher.Hash(request.Password);
        user.PasswordResetToken = null;
        user.PasswordResetExpiresAt = null;
        foreach (var token in user.RefreshTokens) token.RevokedAt ??= DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _uow.Users.UpdateAsync(user, ct);
    }

    public async Task VerifyEmailAsync(string token, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token)) throw new BadRequestException("Invalid verification token");
        var user = await _uow.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token && !u.IsDeleted, ct);
        if (user is null || user.EmailVerificationExpiresAt is null || user.EmailVerificationExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("This verification link is invalid or has expired");

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _uow.Users.UpdateAsync(user, ct);
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await GetCurrentUserAsync(ct);
        if (!_hasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BadRequestException("Current password is incorrect");

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = user.Id.ToString();
        await _uow.Users.UpdateAsync(user, ct);
    }

    public async Task<UserDto> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await GetCurrentUserAsync(ct);
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Phone = request.Phone;
        if (!string.IsNullOrWhiteSpace(request.AvatarUrl)) user.AvatarUrl = request.AvatarUrl;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = user.Id.ToString();
        await _uow.Users.UpdateAsync(user, ct);
        return user.ToDto();
    }

    public async Task<List<string>> GetEffectivePermissionsAsync(User user, CancellationToken ct = default) =>
        await ResolvePermissionsAsync(user, ct);

    private async Task<User> GetCurrentUserAsync(CancellationToken ct)
    {
        if (!_currentUser.IsAuthenticated || !ObjectId.TryParse(_currentUser.UserId, out var userId))
            throw new UnauthorizedException();
        return await _uow.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, ct)
            ?? throw new UnauthorizedException();
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, string? ip, CancellationToken ct)
    {
        var permissions = await ResolvePermissionsAsync(user, ct);
        user.Permissions = permissions;

        var accessToken = _tokens.CreateAccessToken(user.Id.ToString(), user.Email, user.FullName, user.Role, permissions);
        var refreshToken = _tokens.GenerateRefreshToken();
        await StoreRefreshTokenAsync(user, refreshToken, ip, ct);

        user.RefreshTokens = user.RefreshTokens
            .Where(t => t.ExpiresAt > DateTime.UtcNow.AddDays(-1))
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .ToList();

        await _uow.Users.UpdateAsync(user, ct);

        var dto = user.ToDto();
        dto.Permissions = permissions;
        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_tokens.AccessTokenMinutes),
            User = dto
        };
    }

    private async Task StoreRefreshTokenAsync(User user, string token, string? ip, CancellationToken ct)
    {
        user.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = _tokens.HashRefreshToken(token),
            ExpiresAt = DateTime.UtcNow.AddDays(_tokens.RefreshTokenDays),
            CreatedByIp = ip
        });
    }

    private async Task<List<string>> ResolvePermissionsAsync(User user, CancellationToken ct)
    {
        if (user.Role == AppRoles.Customer) return new List<string>();
        var role = await _uow.Roles.FirstOrDefaultAsync(r => r.Name == user.Role && !r.IsDeleted, ct);
        if (role is not null && role.Permissions.Count > 0) return role.Permissions;
        return Permissions.RoleDefaults.GetValueOrDefault(user.Role, Array.Empty<string>()).ToList();
    }
}
