using ECommerce.Domain.Common;
using MongoDB.Bson;

namespace ECommerce.Domain.Entities;

public class Coupon : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "Percentage";
    public decimal Value { get; set; }
    public decimal MinimumPurchase { get; set; }
    public decimal? MaximumDiscount { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? UsageLimit { get; set; }
    public int PerUserLimit { get; set; } = 1;
    public int UsedCount { get; set; }
    public List<ObjectId> UserIds { get; set; } = new();
    public bool IsActive { get; set; } = true;

    public bool IsCurrentlyValid =>
        IsActive && !IsDeleted &&
        (StartsAt is null || StartsAt <= DateTime.UtcNow) &&
        (ExpiresAt is null || ExpiresAt >= DateTime.UtcNow) &&
        (UsageLimit is null || UsedCount < UsageLimit);
}

public class Banner : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? ImageUrl { get; set; }
    public string? LinkUrl { get; set; }
    public string? ButtonText { get; set; }
    public string Position { get; set; } = "Hero";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
}

public class Testimonial : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? AvatarUrl { get; set; }
    public int Rating { get; set; } = 5;
    public string Quote { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
