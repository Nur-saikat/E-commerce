using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using ECommerce.Shared.Exceptions;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class VoucherService
{
    private readonly IUnitOfWork _uow;
    private readonly SettingsService _settings;
    private readonly ICurrentUser _currentUser;

    public VoucherService(IUnitOfWork uow, SettingsService settings, ICurrentUser currentUser)
    {
        _uow = uow;
        _settings = settings;
        _currentUser = currentUser;
    }

    public async Task<VoucherWalletDto> GetMyWalletAsync(CancellationToken ct = default)
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(userId)) throw new UnauthorizedException();

        var settings = await _settings.GetEntityAsync(ct);
        var wallet = await _uow.VoucherWallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        var transactions = await _uow.VoucherTransactions.Collection
            .Find(t => t.UserId == userId)
            .SortByDescending(t => t.CreatedAt)
            .Limit(30)
            .ToListAsync(ct);

        return new VoucherWalletDto
        {
            Balance = wallet?.Balance ?? 0,
            LifetimeEarned = wallet?.LifetimeEarned ?? 0,
            LifetimeRedeemed = wallet?.LifetimeRedeemed ?? 0,
            PointValue = settings.VoucherPointValue,
            EarnPercent = settings.VoucherEarnPercent,
            Enabled = settings.VoucherPointsEnabled,
            Transactions = transactions.Select(t => t.ToDto()).ToList()
        };
    }

    public async Task<int> GetBalanceAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return 0;
        var wallet = await _uow.VoucherWallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        return wallet?.Balance ?? 0;
    }

    public static int PointsForAmount(decimal amount, WebsiteSettings settings)
    {
        if (settings.VoucherPointValue <= 0 || amount <= 0) return 0;
        return (int)Math.Floor(amount / settings.VoucherPointValue);
    }

    public static decimal AmountForPoints(int points, WebsiteSettings settings) =>
        points <= 0 || settings.VoucherPointValue <= 0
            ? 0
            : Math.Round(points * settings.VoucherPointValue, 2);

    public async Task<int> CreditAsync(string userId, string? email, int points, string type,
        string? orderId, string? orderNumber, string? note, CancellationToken ct = default)
    {
        if (points <= 0) return await GetBalanceAsync(userId, ct);

        var now = DateTime.UtcNow;
        var filter = Builders<VoucherWallet>.Filter.Eq(w => w.UserId, userId);
        var update = Builders<VoucherWallet>.Update
            .Inc(w => w.Balance, points)
            .Inc(w => w.LifetimeEarned, points)
            .SetOnInsert(w => w.UserId, userId)
            .SetOnInsert(w => w.UserEmail, email ?? string.Empty)
            .SetOnInsert(w => w.CreatedAt, now)
            .Set(w => w.UpdatedAt, now);

        var wallet = await _uow.VoucherWallets.Collection.FindOneAndUpdateAsync(
            filter, update,
            new FindOneAndUpdateOptions<VoucherWallet> { IsUpsert = true, ReturnDocument = ReturnDocument.After },
            ct) ?? throw new InvalidOperationException("Unable to update voucher wallet");

        await _uow.VoucherTransactions.AddAsync(new VoucherTransaction
        {
            UserId = userId,
            UserEmail = email ?? wallet.UserEmail,
            Points = points,
            BalanceAfter = wallet.Balance,
            Type = type,
            OrderId = orderId,
            OrderNumber = orderNumber,
            Note = note,
            CreatedBy = _currentUser.UserId
        }, ct);

        return wallet.Balance;
    }

    public async Task<int> DebitAsync(string userId, string? email, int points, string? orderId,
        string? orderNumber, string? note, CancellationToken ct = default)
    {
        if (points <= 0) return await GetBalanceAsync(userId, ct);
        if (string.IsNullOrWhiteSpace(userId))
            throw new BadRequestException("Sign in to redeem voucher points");

        var filter = Builders<VoucherWallet>.Filter.And(
            Builders<VoucherWallet>.Filter.Eq(w => w.UserId, userId),
            Builders<VoucherWallet>.Filter.Gte(w => w.Balance, points));
        var update = Builders<VoucherWallet>.Update
            .Inc(w => w.Balance, -points)
            .Inc(w => w.LifetimeRedeemed, points)
            .Set(w => w.UpdatedAt, DateTime.UtcNow);

        var wallet = await _uow.VoucherWallets.Collection.FindOneAndUpdateAsync(
            filter, update,
            new FindOneAndUpdateOptions<VoucherWallet> { ReturnDocument = ReturnDocument.After },
            ct) ?? throw new BadRequestException("You do not have enough voucher points for this order");

        await _uow.VoucherTransactions.AddAsync(new VoucherTransaction
        {
            UserId = userId,
            UserEmail = email ?? wallet.UserEmail,
            Points = -points,
            BalanceAfter = wallet.Balance,
            Type = VoucherTransactionTypes.Redeemed,
            OrderId = orderId,
            OrderNumber = orderNumber,
            Note = note,
            CreatedBy = _currentUser.UserId
        }, ct);

        return wallet.Balance;
    }
}
