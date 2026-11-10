using ECommerce.Shared.Common;

namespace ECommerce.Application.DTOs;

public class ReturnItemRequest
{
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public int Quantity { get; set; }
}

public class CreateReturnRequest
{
    public string OrderId { get; set; } = string.Empty;
    public List<ReturnItemRequest> Items { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public string RefundPreference { get; set; } = "Original";
    public string? AccountName { get; set; }
    public string? AccountNumber { get; set; }
    public string? BankName { get; set; }
}

public class ReturnItemDto
{
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}

public class ReturnRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public List<ReturnItemDto> Items { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public string RefundPreference { get; set; } = string.Empty;
    public string? RefundAccountName { get; set; }
    public string? RefundAccountNumber { get; set; }
    public string? RefundBankName { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal RefundAmount { get; set; }
    public int RefundPoints { get; set; }
    public string? RefundMethod { get; set; }
    public string? RefundReference { get; set; }
    public string? AdminNote { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReturnQuery : PagedQuery
{
    public string? Status { get; set; }
    public string? OrderId { get; set; }
}

public class UpdateReturnStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
    public string? Destination { get; set; }
    public string? AccountName { get; set; }
    public string? AccountNumber { get; set; }
    public string? BankName { get; set; }
    public string? Reference { get; set; }
}
