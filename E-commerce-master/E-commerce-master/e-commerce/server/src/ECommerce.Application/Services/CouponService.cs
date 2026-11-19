using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class CouponService
{
    private readonly IUnitOfWork _uow;

    public CouponService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<CouponValidationResult> ValidateAsync(string code, decimal subtotal, ObjectId? userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
            return new CouponValidationResult { Valid = false, Message = "Coupon code is required" };

        var normalized = code.Trim().ToUpperInvariant();
        var coupon = await _uow.Coupons.FirstOrDefaultAsync(c => c.Code == normalized && !c.IsDeleted, ct);
        if (coupon is null)
            return new CouponValidationResult { Valid = false, Message = "Coupon not found" };
        if (!coupon.IsActive)
            return new CouponValidationResult { Valid = false, Message = "This coupon is no longer active" };
        if (coupon.StartsAt.HasValue && coupon.StartsAt > DateTime.UtcNow)
            return new CouponValidationResult { Valid = false, Message = "This coupon is not active yet" };
        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt < DateTime.UtcNow)
            return new CouponValidationResult { Valid = false, Message = "This coupon has expired" };
        if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit)
            return new CouponValidationResult { Valid = false, Message = "This coupon has reached its usage limit" };
        if (coupon.MinimumPurchase > 0 && subtotal < coupon.MinimumPurchase)
            return new CouponValidationResult
            {
                Valid = false,
                Message = $"Minimum purchase of {coupon.MinimumPurchase:0.00} required"
            };
        if (coupon.UserIds.Count > 0 && (!userId.HasValue || !coupon.UserIds.Contains(userId.Value)))
            return new CouponValidationResult { Valid = false, Message = "This coupon is not available for your account" };

        if (userId.HasValue && coupon.PerUserLimit > 0)
        {
            var used = await _uow.Orders.CountAsync(Builders<Order>.Filter.And(
                Builders<Order>.Filter.Eq(o => o.UserId, userId.Value),
                Builders<Order>.Filter.Eq(o => o.CouponCode, coupon.Code),
                Builders<Order>.Filter.Ne(o => o.Status, "Cancelled"),
                Builders<Order>.Filter.Ne(o => o.Status, "Refunded"),
                Builders<Order>.Filter.Eq(o => o.IsDeleted, false)), ct);
            if (used >= coupon.PerUserLimit)
                return new CouponValidationResult { Valid = false, Message = "You have already used this coupon" };
        }

        var discount = coupon.Type == "Percentage"
            ? Math.Round(subtotal * coupon.Value / 100m, 2)
            : Math.Min(coupon.Value, subtotal);
        if (coupon.MaximumDiscount.HasValue && coupon.MaximumDiscount.Value > 0)
            discount = Math.Min(discount, coupon.MaximumDiscount.Value);
        discount = Math.Max(0, Math.Round(discount, 2));

        return new CouponValidationResult
        {
            Valid = true,
            Code = coupon.Code,
            Discount = discount,
            Message = "Coupon applied",
            Coupon = coupon.ToDto()
        };
    }

    public async Task<PagedResult<CouponDto>> GetAllAsync(PagedQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<Coupon>>
        {
            Builders<Coupon>.Filter.Eq(c => c.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Search))
            filters.Add(Builders<Coupon>.Filter.Regex(c => c.Code,
                new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(query.Search), "i")));

        var filter = Builders<Coupon>.Filter.And(filters);
        var total = await _uow.Coupons.CountAsync(filter, ct);
        var coupons = await _uow.Coupons.Collection.Find(filter)
            .Sort(Builders<Coupon>.Sort.Descending(c => c.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);
        return new PagedResult<CouponDto>(coupons.Select(c => c.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<CouponDto> CreateAsync(CouponRequest request, string? adminId, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (await _uow.Coupons.FirstOrDefaultAsync(c => c.Code == code && !c.IsDeleted, ct) is not null)
            throw new ConflictException("A coupon with this code already exists");

        var coupon = new Coupon
        {
            Code = code,
            Description = request.Description,
            Type = request.Type,
            Value = request.Value,
            MinimumPurchase = request.MinimumPurchase,
            MaximumDiscount = request.MaximumDiscount,
            StartsAt = request.StartsAt,
            ExpiresAt = request.ExpiresAt,
            UsageLimit = request.UsageLimit,
            PerUserLimit = request.PerUserLimit,
            UserIds = ParseIds(request.UserIds),
            IsActive = request.IsActive,
            CreatedBy = adminId
        };
        await _uow.Coupons.AddAsync(coupon, ct);
        return coupon.ToDto();
    }

    public async Task<CouponDto> UpdateAsync(string id, CouponRequest request, string? adminId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Coupon not found");
        var coupon = await _uow.Coupons.FirstOrDefaultAsync(c => c.Id == objectId && !c.IsDeleted, ct)
            ?? throw new NotFoundException("Coupon not found");

        var code = request.Code.Trim().ToUpperInvariant();
        if (await _uow.Coupons.FirstOrDefaultAsync(c => c.Code == code && c.Id != coupon.Id && !c.IsDeleted, ct) is not null)
            throw new ConflictException("A coupon with this code already exists");

        coupon.Code = code;
        coupon.Description = request.Description;
        coupon.Type = request.Type;
        coupon.Value = request.Value;
        coupon.MinimumPurchase = request.MinimumPurchase;
        coupon.MaximumDiscount = request.MaximumDiscount;
        coupon.StartsAt = request.StartsAt;
        coupon.ExpiresAt = request.ExpiresAt;
        coupon.UsageLimit = request.UsageLimit;
        coupon.PerUserLimit = request.PerUserLimit;
        coupon.UserIds = ParseIds(request.UserIds);
        coupon.IsActive = request.IsActive;
        coupon.UpdatedAt = DateTime.UtcNow;
        coupon.UpdatedBy = adminId;
        await _uow.Coupons.UpdateAsync(coupon, ct);
        return coupon.ToDto();
    }

    public async Task DeleteAsync(string id, string? adminId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Coupon not found");
        var coupon = await _uow.Coupons.FirstOrDefaultAsync(c => c.Id == objectId && !c.IsDeleted, ct)
            ?? throw new NotFoundException("Coupon not found");
        coupon.IsDeleted = true;
        coupon.IsActive = false;
        coupon.UpdatedAt = DateTime.UtcNow;
        coupon.UpdatedBy = adminId;
        await _uow.Coupons.UpdateAsync(coupon, ct);
    }

    public async Task IncrementUsageAsync(string code, CancellationToken ct = default)
    {
        await _uow.Coupons.UpdateOneAsync(
            Builders<Coupon>.Filter.Eq(c => c.Code, code),
            Builders<Coupon>.Update.Inc(c => c.UsedCount, 1), ct);
    }

    private static List<ObjectId> ParseIds(IEnumerable<string>? ids) =>
        (ids ?? Enumerable.Empty<string>())
        .Select(i => ObjectId.TryParse(i, out var id) ? (ObjectId?)id : null)
        .Where(i => i.HasValue).Select(i => i!.Value).ToList();
}
