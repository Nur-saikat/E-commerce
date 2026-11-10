namespace ECommerce.Application.Common.Interfaces;

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public interface ITokenService
{
    string CreateAccessToken(string userId, string email, string fullName, string role, IEnumerable<string> permissions);
    string GenerateRefreshToken();
    string HashRefreshToken(string token);
    int AccessTokenMinutes { get; }
    int RefreshTokenDays { get; }
}

public interface IFileStorage
{
    Task<string> SaveAsync(Stream stream, string fileName, string contentType, CancellationToken ct = default);
    Task<string> SaveDocumentAsync(Stream stream, string fileName, string contentType, long maxBytes, CancellationToken ct = default);
    Task DeleteAsync(string url);
}

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}

public interface IPaymentProvider
{
    string Name { get; }
    bool IsEnabled { get; }
    Task<PaymentInitiationResult> InitiateAsync(PaymentInitiationRequest request, CancellationToken ct = default);
    Task<PaymentVerificationResult> VerifyAsync(string transactionId, CancellationToken ct = default);
}

public class PaymentInitiationRequest
{
    public string OrderId { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string SuccessUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty;
}

public class PaymentInitiationResult
{
    public bool Success { get; set; }
    public string? TransactionId { get; set; }
    public string? RedirectUrl { get; set; }
    public string? ClientSecret { get; set; }
    public string? Message { get; set; }
    public string? RawResponse { get; set; }
}

public class PaymentVerificationResult
{
    public bool Success { get; set; }
    public string Status { get; set; } = "Pending";
    public string? TransactionId { get; set; }
    public string? Message { get; set; }
    public string? RawResponse { get; set; }
}
