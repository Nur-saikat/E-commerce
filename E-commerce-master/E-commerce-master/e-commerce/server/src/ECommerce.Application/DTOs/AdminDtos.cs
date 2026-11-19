using ECommerce.Shared.Common;

namespace ECommerce.Application.DTOs;

public class DashboardStatsDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
    public int TotalCustomers { get; set; }
    public int TotalProducts { get; set; }
    public int PendingOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int CancelledOrders { get; set; }
    public int LowStockProducts { get; set; }
    public decimal RevenueThisMonth { get; set; }
    public decimal RevenueToday { get; set; }
    public int OrdersToday { get; set; }
}

public class SalesPointDto
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
}

public class TopProductDto
{
    public string ProductId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public int SoldCount { get; set; }
    public decimal Revenue { get; set; }
}

public class LowStockItemDto
{
    public string ProductId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int LowStockThreshold { get; set; }
}

public class CategorySalesDto
{
    public string CategoryName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
}

public class DashboardDto
{
    public DashboardStatsDto Stats { get; set; } = new();
    public List<SalesPointDto> SalesChart { get; set; } = new();
    public List<TopProductDto> TopProducts { get; set; } = new();
    public List<LowStockItemDto> LowStockProducts { get; set; } = new();
    public List<OrderSummaryDto> RecentOrders { get; set; } = new();
    public List<CategorySalesDto> SalesByCategory { get; set; } = new();
}

public class CustomerDto
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool EmailVerified { get; set; }
    public int OrderCount { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class UpdateCustomerRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    public string? Role { get; set; }
}

public class InventoryItemDto
{
    public string ProductId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public int Stock { get; set; }
    public int LowStockThreshold { get; set; }
    public int TotalStock { get; set; }
    public decimal CostPrice { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<InventoryVariantDto> Variants { get; set; } = new();
}

public class InventoryVariantDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Stock { get; set; }
}

public class StockAdjustmentRequest
{
    public int QuantityChange { get; set; }
    public string? VariantId { get; set; }
    public string? Note { get; set; }
    public string Type { get; set; } = "Adjustment";
}

public class InventoryTransactionDto
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string Type { get; set; } = string.Empty;
    public int QuantityChange { get; set; }
    public int StockAfter { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SalesReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
    public decimal AverageOrderValue { get; set; }
    public List<SalesPointDto> Points { get; set; } = new();
    public List<TopProductDto> TopProducts { get; set; } = new();
    public List<CategorySalesDto> ByCategory { get; set; } = new();
}

public class OrderReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalValue { get; set; }
    public Dictionary<string, int> ByStatus { get; set; } = new();
    public List<SalesPointDto> Points { get; set; } = new();
}

public class FilterOptionsDto
{
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
    public List<string> Colors { get; set; } = new();
    public List<string> Sizes { get; set; } = new();
    public List<BrandDto> Brands { get; set; } = new();
    public List<CategoryDto> Categories { get; set; } = new();
    public List<int> Ratings { get; set; } = new() { 4, 3, 2, 1 };
}

public class InventoryQuery : PagedQuery
{
    public bool LowStockOnly { get; set; }
    public bool OutOfStockOnly { get; set; }
}

public class CustomerQuery : PagedQuery
{
    public bool ActiveOnly { get; set; }
}

public class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RoleDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
    public bool IsSystem { get; set; }
}

public class RoleUpdateRequest
{
    public List<string> Permissions { get; set; } = new();
}

public class PermissionDto
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
