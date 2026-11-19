using ECommerce.Domain.Common;
using MongoDB.Bson;

namespace ECommerce.Domain.Entities;

public class ProductReview : BaseEntity
{
    public ObjectId ProductId { get; set; }
    public ObjectId UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string Comment { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public bool IsVerifiedPurchase { get; set; }
}

public class Cart : BaseEntity
{
    public ObjectId? UserId { get; set; }
    public string? GuestId { get; set; }
    public List<CartItem> Items { get; set; } = new();
    public string? CouponCode { get; set; }

    public int TotalQuantity => Items.Sum(i => i.Quantity);
    public decimal Subtotal => Items.Sum(i => i.UnitPrice * i.Quantity);
}

public class CartItem
{
    public ObjectId Id { get; set; } = ObjectId.GenerateNewId();
    public ObjectId ProductId { get; set; }
    public ObjectId? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? VariantName { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}

public class Wishlist : BaseEntity
{
    public ObjectId UserId { get; set; }
    public List<WishlistItem> Items { get; set; } = new();
}

public class WishlistItem
{
    public ObjectId ProductId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
