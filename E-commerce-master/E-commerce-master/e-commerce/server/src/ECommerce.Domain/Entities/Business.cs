using ECommerce.Domain.Common;
using MongoDB.Bson;

namespace ECommerce.Domain.Entities;

public class BusinessDocument
{
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Other";
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long Size { get; set; }
    public string? ContentType { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? UploadedBy { get; set; }
}

public class StaffMember : BaseEntity
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = "FullTime";
    public string Status { get; set; } = "Active";
    public DateTime JoinedOn { get; set; } = DateTime.UtcNow;
    public DateTime? LeftOn { get; set; }
    public decimal Salary { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Notes { get; set; }
    public List<BusinessDocument> Documents { get; set; } = new();
}

public class EmploymentHistory
{
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
}

public class OwnerProfile : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string BusinessName { get; set; } = "Safwan";
    public string Designation { get; set; } = "Founder & Owner";
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? NationalId { get; set; }
    public string? TinNumber { get; set; }
    public string? BinNumber { get; set; }
    public string? Bio { get; set; }
    public List<EmploymentHistory> EmploymentHistory { get; set; } = new();
    public List<BusinessDocument> Documents { get; set; } = new();
}

public class CapitalEntry : BaseEntity
{
    public string Type { get; set; } = "Investment";
    public decimal Amount { get; set; }
    public string Source { get; set; } = "Owner";
    public string PaymentMethod { get; set; } = "Bank Transfer";
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
}

public class ExpenseEntry : BaseEntity
{
    public string Category { get; set; } = "General";
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Vendor { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public bool IsPaid { get; set; } = true;
}

public class StockArrival : BaseEntity
{
    public ObjectId ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public ObjectId? VariantId { get; set; }
    public string? VariantName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost => Math.Round(Quantity * UnitCost, 2);
    public string? Supplier { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime ArrivalDate { get; set; } = DateTime.UtcNow;
    public bool StockApplied { get; set; }
}

public class SupplierReturn : BaseEntity
{
    public ObjectId ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public ObjectId? VariantId { get; set; }
    public string? VariantName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost => Math.Round(Quantity * UnitCost, 2);
    public string? Supplier { get; set; }
    public string? Reference { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public DateTime ReturnDate { get; set; } = DateTime.UtcNow;
    public bool StockRemoved { get; set; }
}

public class StockPurchase : BaseEntity
{
    public string? Supplier { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public bool StockApplied { get; set; }
    public List<StockPurchaseLine> Items { get; set; } = new();
    public int TotalQuantity => Items.Sum(i => i.Quantity);
    public decimal TotalAmount => Math.Round(Items.Sum(i => i.LineTotal), 2);
}

public class StockPurchaseLine
{
    public ObjectId ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public ObjectId? VariantId { get; set; }
    public string? VariantName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal LineTotal => Math.Round(Quantity * UnitCost, 2);
}

public static class BusinessConstants
{
    public static readonly string[] StaffStatuses = { "Active", "OnLeave", "Resigned", "Terminated" };
    public static readonly string[] EmploymentTypes = { "FullTime", "PartTime", "Contract", "Intern" };
    public static readonly string[] DocumentCategories = { "CV", "NID", "Contract", "Certificate", "Other" };
    public static readonly string[] CapitalTypes = { "Investment", "Withdrawal", "Loan", "LoanRepayment" };
    public static readonly string[] ExpenseCategories =
    {
        "Rent", "Salary", "Marketing", "Utilities", "Packaging", "Transport", "Software", "General"
    };
}
