using ECommerce.Domain.Common;
using MongoDB.Bson;

namespace ECommerce.Domain.Entities;

public class ReturnRequest : BaseEntity
{
    public ObjectId OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public List<ReturnItem> Items { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public string RefundPreference { get; set; } = "Original";
    public string? RefundAccountName { get; set; }
    public string? RefundAccountNumber { get; set; }
    public string? RefundBankName { get; set; }
    public string Status { get; set; } = "Requested";
    public decimal RefundAmount { get; set; }
    public int RefundPoints { get; set; }
    public string? RefundMethod { get; set; }
    public string? RefundReference { get; set; }
    public string? AdminNote { get; set; }
    public bool StockRestored { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedBy { get; set; }
}

public class ReturnItem
{
    public ObjectId ProductId { get; set; }
    public ObjectId? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}
