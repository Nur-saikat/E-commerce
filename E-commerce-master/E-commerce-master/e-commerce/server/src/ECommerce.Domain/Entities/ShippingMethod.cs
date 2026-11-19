using ECommerce.Domain.Common;

namespace ECommerce.Domain.Entities;

public class ShippingMethod : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Cost { get; set; }
    public int EstimatedDaysMin { get; set; }
    public int EstimatedDaysMax { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }
}

public class Address : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class InventoryTransaction : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Type { get; set; } = "Adjustment";
    public int QuantityChange { get; set; }
    public int StockAfter { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
}

public class Notification : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "Info";
    public string? Link { get; set; }
    public bool IsRead { get; set; }
}
