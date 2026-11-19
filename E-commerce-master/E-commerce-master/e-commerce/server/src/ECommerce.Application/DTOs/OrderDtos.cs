using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;

namespace ECommerce.Application.DTOs;

public class AddressInput
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class AddressDto : AddressInput
{
    public string Id { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class AddressRequest : AddressInput
{
    public bool IsDefault { get; set; }
}

public class CheckoutRequest
{
    public AddressInput ShippingAddress { get; set; } = new();
    public AddressInput? BillingAddress { get; set; }
    public string? ShippingMethodId { get; set; }
    public string? CouponCode { get; set; }
    public string PaymentMethod { get; set; } = PaymentProviders.Cod;
    public string? Notes { get; set; }
    public string? GuestEmail { get; set; }
    public bool SaveAddress { get; set; }
    public bool UseVoucherPoints { get; set; }
}

public class OrderItemDto
{
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? VariantName { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}

public class OrderStatusHistoryDto
{
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? ChangedBy { get; set; }
}

public class OrderDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public List<OrderItemDto> Items { get; set; } = new();
    public AddressInput ShippingAddress { get; set; } = new();
    public AddressInput? BillingAddress { get; set; }
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
    public decimal RefundedAmount { get; set; }
    public string? RefundMethod { get; set; }
    public string? RefundReference { get; set; }
    public DateTime? RefundedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string? PaymentTransactionId { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Notes { get; set; }
    public List<OrderStatusHistoryDto> StatusHistory { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public bool CanCancel { get; set; }
}

public class OrderSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public string? FirstItemImage { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OrderQuery : PagedQuery
{
    public string? Status { get; set; }
    public string? PaymentStatus { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? TrackingNumber { get; set; }
}

public class CancelOrderRequest
{
    public string? Reason { get; set; }
    public bool RestoreStock { get; set; } = true;
}

public class RefundRequest
{
    public string Destination { get; set; } = RefundDestinations.Original;
    public string? AccountName { get; set; }
    public string? AccountNumber { get; set; }
    public string? BankName { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
}

public class MobilePaymentSubmitRequest
{
    public string OrderId { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string SenderNumber { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string? GuestEmail { get; set; }
}

public class MobilePaymentVerifyRequest
{
    public bool Approve { get; set; } = true;
    public string? Reference { get; set; }
    public string? Note { get; set; }
}

public class CouponDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal MinimumPurchase { get; set; }
    public decimal? MaximumDiscount { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? UsageLimit { get; set; }
    public int PerUserLimit { get; set; }
    public int UsedCount { get; set; }
    public List<string> UserIds { get; set; } = new();
    public bool IsActive { get; set; }
    public bool IsValid { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CouponRequest
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
    public List<string> UserIds { get; set; } = new();
    public bool IsActive { get; set; } = true;
}

public class CouponValidationResult
{
    public bool Valid { get; set; }
    public string? Code { get; set; }
    public decimal Discount { get; set; }
    public string? Message { get; set; }
    public CouponDto? Coupon { get; set; }
}

public class CouponValidationRequest
{
    public string Code { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
}

public class ShippingMethodDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Cost { get; set; }
    public int EstimatedDaysMin { get; set; }
    public int EstimatedDaysMax { get; set; }
    public bool IsActive { get; set; }
    public bool IsDefault { get; set; }
}

public class ShippingMethodRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Cost { get; set; }
    public int EstimatedDaysMin { get; set; }
    public int EstimatedDaysMax { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }
}

public class PaymentInitiateRequest
{
    public string OrderId { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string SuccessUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty;
    public string? GuestEmail { get; set; }
}

public class PaymentInitiateResponse
{
    public string OrderId { get; set; } = string.Empty;
    public string PaymentId { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string? TransactionId { get; set; }
    public string? RedirectUrl { get; set; }
    public string? ClientSecret { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class PaymentVerifyRequest
{
    public string OrderId { get; set; } = string.Empty;
    public string? TransactionId { get; set; }
    public string? GuestEmail { get; set; }
}

public class PaymentDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? TransactionId { get; set; }
    public string? SenderNumber { get; set; }
    public string? FailureReason { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CheckoutConfigDto
{
    public List<ShippingMethodDto> ShippingMethods { get; set; } = new();
    public decimal TaxRate { get; set; }
    public decimal FreeShippingThreshold { get; set; }
    public decimal FlatShippingRate { get; set; }
    public List<string> EnabledPaymentMethods { get; set; } = new();
    public List<MobileBankingOptionDto> MobileBanking { get; set; } = new();
    public bool VoucherPointsEnabled { get; set; }
    public decimal VoucherPointValue { get; set; } = 1;
    public decimal VoucherEarnPercent { get; set; }
    public decimal VoucherMaxRedeemPercent { get; set; } = 100;
    public string Currency { get; set; } = "USD";
    public string CurrencySymbol { get; set; } = "$";
}

public class MobileBankingOptionDto
{
    public string Provider { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
}
