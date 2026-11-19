namespace ECommerce.Application.DTOs;

public class AddToCartRequest
{
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class UpdateCartItemRequest
{
    public int Quantity { get; set; }
}

public class ApplyCouponRequest
{
    public string CouponCode { get; set; } = string.Empty;
}

public class CartItemDto
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
    public int StockAvailable { get; set; }
    public bool IsAvailable { get; set; }
}

public class CartSummaryDto
{
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public string? CouponCode { get; set; }
    public decimal Shipping { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public int ItemCount { get; set; }
    public decimal FreeShippingThreshold { get; set; }
    public decimal AmountToFreeShipping { get; set; }
}

public class CartDto
{
    public string? Id { get; set; }
    public string? GuestId { get; set; }
    public List<CartItemDto> Items { get; set; } = new();
    public CartSummaryDto Summary { get; set; } = new();
}

public class WishlistItemDto
{
    public string ProductId { get; set; } = string.Empty;
    public ProductSummaryDto? Product { get; set; }
    public DateTime AddedAt { get; set; }
}

public class WishlistDto
{
    public List<WishlistItemDto> Items { get; set; } = new();
}
