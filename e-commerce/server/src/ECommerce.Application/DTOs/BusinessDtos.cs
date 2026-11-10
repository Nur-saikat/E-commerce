using ECommerce.Shared.Common;

namespace ECommerce.Application.DTOs;

public class BusinessDocumentDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long Size { get; set; }
    public string? ContentType { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? UploadedBy { get; set; }
}

public class BusinessDocumentRequest
{
    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Other";
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long Size { get; set; }
    public string? ContentType { get; set; }
}

public class StaffMemberDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime JoinedOn { get; set; }
    public DateTime? LeftOn { get; set; }
    public decimal Salary { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Notes { get; set; }
    public List<BusinessDocumentDto> Documents { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class StaffRequest
{
    public string? EmployeeCode { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = "FullTime";
    public string Status { get; set; } = "Active";
    public DateTime JoinedOn { get; set; }
    public DateTime? LeftOn { get; set; }
    public decimal Salary { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Notes { get; set; }
    public List<BusinessDocumentRequest> Documents { get; set; } = new();
}

public class StaffQuery : PagedQuery
{
    public string? Status { get; set; }
    public string? Department { get; set; }
}

public class EmploymentHistoryDto
{
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
}

public class OwnerProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? NationalId { get; set; }
    public string? TinNumber { get; set; }
    public string? BinNumber { get; set; }
    public string? Bio { get; set; }
    public List<EmploymentHistoryDto> EmploymentHistory { get; set; } = new();
    public List<BusinessDocumentDto> Documents { get; set; } = new();
    public DateTime? UpdatedAt { get; set; }
}

public class OwnerProfileRequest
{
    public string FullName { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? NationalId { get; set; }
    public string? TinNumber { get; set; }
    public string? BinNumber { get; set; }
    public string? Bio { get; set; }
    public List<EmploymentHistoryDto> EmploymentHistory { get; set; } = new();
    public List<BusinessDocumentRequest> Documents { get; set; } = new();
}

public class CapitalEntryDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Source { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime EntryDate { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CapitalEntryRequest
{
    public string Type { get; set; } = "Investment";
    public decimal Amount { get; set; }
    public string Source { get; set; } = "Owner";
    public string PaymentMethod { get; set; } = "Bank Transfer";
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime EntryDate { get; set; }
}

public class ExpenseEntryDto
{
    public string Id { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Vendor { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime ExpenseDate { get; set; }
    public bool IsPaid { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ExpenseEntryRequest
{
    public string Category { get; set; } = "General";
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Vendor { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime ExpenseDate { get; set; }
    public bool IsPaid { get; set; } = true;
}

public class LedgerQuery : PagedQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Type { get; set; }
    public string? Category { get; set; }
}

public class StockArrivalDto
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string? VariantName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
    public string? Supplier { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime ArrivalDate { get; set; }
    public bool StockApplied { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StockArrivalRequest
{
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public string? Supplier { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime ArrivalDate { get; set; }
}

public class StockArrivalQuery : PagedQuery
{
    public string? ProductId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}

public class BusinessProductOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int TotalStock { get; set; }
    public decimal CostPrice { get; set; }
    public string? ThumbnailUrl { get; set; }
    public List<BusinessVariantOptionDto> Variants { get; set; } = new();
}

public class BusinessVariantOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Stock { get; set; }
}

public class ProfitLossQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? GroupBy { get; set; }
}

public class ProfitLossPointDto
{
    public string Period { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal CostOfGoods { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetProfit { get; set; }
    public int Orders { get; set; }
    public decimal Purchases { get; set; }
}

public class ProfitLossDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public string GroupBy { get; set; } = "month";
    public decimal Revenue { get; set; }
    public decimal CostOfGoods { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal Margin { get; set; }
    public int Orders { get; set; }
    public decimal Purchases { get; set; }
    public decimal CapitalIn { get; set; }
    public decimal CapitalOut { get; set; }
    public List<ProfitLossPointDto> Series { get; set; } = new();
}

public class BusinessFinancialsDto
{
    public decimal Revenue { get; set; }
    public decimal CostOfGoods { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal Margin { get; set; }
    public int Orders { get; set; }
    public decimal Purchases { get; set; }
}

public class DepartmentBreakdownDto
{
    public string Department { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal MonthlySalary { get; set; }
}

public class BusinessOverviewDto
{
    public BusinessFinancialsDto Today { get; set; } = new();
    public BusinessFinancialsDto ThisMonth { get; set; } = new();
    public BusinessFinancialsDto Lifetime { get; set; } = new();
    public decimal CapitalInvested { get; set; }
    public decimal CapitalWithdrawn { get; set; }
    public decimal NetCapital { get; set; }
    public decimal TotalPurchases { get; set; }
    public decimal InventoryValue { get; set; }
    public int TotalStaff { get; set; }
    public int ActiveStaff { get; set; }
    public int TotalPaidOrders { get; set; }
    public int LowStockCount { get; set; }
    public OwnerProfileDto Owner { get; set; } = new();
    public List<ProfitLossPointDto> MonthlySeries { get; set; } = new();
    public List<StockArrivalDto> RecentArrivals { get; set; } = new();
    public List<ExpenseEntryDto> RecentExpenses { get; set; } = new();
    public List<StaffMemberDto> RecentStaff { get; set; } = new();
    public List<DepartmentBreakdownDto> StaffByDepartment { get; set; } = new();
    public List<LowStockItemDto> LowStockProducts { get; set; } = new();
}
