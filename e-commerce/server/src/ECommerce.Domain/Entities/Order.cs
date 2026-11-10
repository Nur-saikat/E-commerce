using ECommerce.Domain.Common;
using MongoDB.Bson;

namespace ECommerce.Domain.Entities;

public class Order : BaseEntity
{
    public string OrderNumber { get; set; } = string.Empty;
    public ObjectId? UserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public List<OrderItem> Items { get; set; } = new();
    public AddressSnapshot ShippingAddress { get; set; } = new();
    public AddressSnapshot? BillingAddress { get; set; }
    public string ShippingMethodName { get; set; } = string.Empty;
    public decimal ShippingCost { get; set; }
    public string? CouponCode { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }
    public int PointsRedeemed { get; set; }
    public decimal PointsDiscount { get; set; }
    public int PointsEarned { get; set; }
    public bool PointsAwarded { get; set; }
    public decimal RefundedAmount { get; set; }
    public string? RefundMethod { get; set; }
    public string? RefundReference { get; set; }
    public DateTime? RefundedAt { get; set; }
    public string Status { get; set; } = "Pending";
    public string PaymentMethod { get; set; } = "COD";
    public string PaymentStatus { get; set; } = "Pending";
    public string? PaymentTransactionId { get; set; }
    public string? Notes { get; set; }
    public bool InventoryCommitted { get; set; }
    public List<OrderStatusHistory> StatusHistory { get; set; } = new();
    public DateTime? ShippedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public string? TrackingNumber { get; set; }
    public bool StockRestored { get; set; }
}

public class OrderItem
{
    public ObjectId ProductId { get; set; }
    public ObjectId? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? VariantName { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal UnitCost { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}

public class AddressSnapshot
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class OrderStatusHistory
{
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string? ChangedBy { get; set; }
}

public class Payment : BaseEntity
{
    public ObjectId OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public ObjectId? UserId { get; set; }
    public string Provider { get; set; } = "COD";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Status { get; set; } = "Pending";
    public string? TransactionId { get; set; }
    public string? ProviderReference { get; set; }
    public string? SenderNumber { get; set; }
    public string? FailureReason { get; set; }
    public string? RawResponse { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedBy { get; set; }
}
