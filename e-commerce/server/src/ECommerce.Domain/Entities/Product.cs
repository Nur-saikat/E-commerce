using ECommerce.Domain.Common;
using MongoDB.Bson;

namespace ECommerce.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string Description { get; set; } = string.Empty;
    public ObjectId CategoryId { get; set; }
    public ObjectId? BrandId { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal EffectivePrice => DiscountPrice.HasValue && DiscountPrice.Value > 0 && DiscountPrice.Value < Price
        ? DiscountPrice.Value
        : Price;
    public int DiscountPercent => Price <= 0 ? 0 : (int)Math.Round((Price - EffectivePrice) / Price * 100);
    public int Stock { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public List<string> Images { get; set; } = new();
    public string? ThumbnailUrl { get; set; }
    public Dictionary<string, string> Specifications { get; set; } = new();
    public List<ProductVariant> Variants { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public double RatingAverage { get; set; }
    public int ReviewCount { get; set; }
    public int SoldCount { get; set; }
    public int ViewCount { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }

    public int TotalStock => Stock + Variants.Sum(v => v.Stock);
}

public class ProductVariant
{
    public ObjectId Id { get; set; } = ObjectId.GenerateNewId();
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public string? ImageUrl { get; set; }
}
