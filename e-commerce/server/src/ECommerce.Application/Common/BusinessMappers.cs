using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;

namespace ECommerce.Application.Common;

public static class BusinessMappers
{
    public static BusinessDocumentDto ToDto(this BusinessDocument d) => new()
    {
        Id = d.Id,
        Title = d.Title,
        Category = d.Category,
        Url = d.Url,
        FileName = d.FileName,
        Size = d.Size,
        ContentType = d.ContentType,
        UploadedAt = d.UploadedAt,
        UploadedBy = d.UploadedBy
    };

    public static StaffMemberDto ToDto(this StaffMember s) => new()
    {
        Id = s.Id.ToString(),
        EmployeeCode = s.EmployeeCode,
        FullName = s.FullName,
        Email = s.Email,
        Phone = s.Phone,
        Designation = s.Designation,
        Department = s.Department,
        EmploymentType = s.EmploymentType,
        Status = s.Status,
        JoinedOn = s.JoinedOn,
        LeftOn = s.LeftOn,
        Salary = s.Salary,
        Address = s.Address,
        EmergencyContactName = s.EmergencyContactName,
        EmergencyContactPhone = s.EmergencyContactPhone,
        Notes = s.Notes,
        Documents = s.Documents.Select(d => d.ToDto()).ToList(),
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    public static OwnerProfileDto ToDto(this OwnerProfile p) => new()
    {
        Id = p.Id.ToString(),
        FullName = p.FullName,
        BusinessName = p.BusinessName,
        Designation = p.Designation,
        Email = p.Email,
        Phone = p.Phone,
        Address = p.Address,
        DateOfBirth = p.DateOfBirth,
        NationalId = p.NationalId,
        TinNumber = p.TinNumber,
        BinNumber = p.BinNumber,
        Bio = p.Bio,
        EmploymentHistory = p.EmploymentHistory.Select(h => new EmploymentHistoryDto
        {
            Company = h.Company,
            Role = h.Role,
            Location = h.Location,
            StartDate = h.StartDate,
            EndDate = h.EndDate,
            Description = h.Description
        }).ToList(),
        Documents = p.Documents.Select(d => d.ToDto()).ToList(),
        UpdatedAt = p.UpdatedAt
    };

    public static CapitalEntryDto ToDto(this CapitalEntry e) => new()
    {
        Id = e.Id.ToString(),
        Type = e.Type,
        Amount = e.Amount,
        Source = e.Source,
        PaymentMethod = e.PaymentMethod,
        Reference = e.Reference,
        Note = e.Note,
        EntryDate = e.EntryDate,
        CreatedBy = e.CreatedBy,
        CreatedAt = e.CreatedAt
    };

    public static ExpenseEntryDto ToDto(this ExpenseEntry e) => new()
    {
        Id = e.Id.ToString(),
        Category = e.Category,
        Title = e.Title,
        Amount = e.Amount,
        Vendor = e.Vendor,
        PaymentMethod = e.PaymentMethod,
        Reference = e.Reference,
        Note = e.Note,
        ExpenseDate = e.ExpenseDate,
        IsPaid = e.IsPaid,
        CreatedBy = e.CreatedBy,
        CreatedAt = e.CreatedAt
    };

    public static StockArrivalDto ToDto(this StockArrival a) => new()
    {
        Id = a.Id.ToString(),
        ProductId = a.ProductId.ToString(),
        ProductName = a.ProductName,
        VariantId = a.VariantId?.ToString(),
        VariantName = a.VariantName,
        Quantity = a.Quantity,
        UnitCost = a.UnitCost,
        TotalCost = a.TotalCost,
        Supplier = a.Supplier,
        Reference = a.Reference,
        Note = a.Note,
        ArrivalDate = a.ArrivalDate,
        StockApplied = a.StockApplied,
        CreatedBy = a.CreatedBy,
        CreatedAt = a.CreatedAt
    };

    public static SupplierReturnDto ToDto(this SupplierReturn r) => new()
    {
        Id = r.Id.ToString(),
        ProductId = r.ProductId.ToString(),
        ProductName = r.ProductName,
        VariantId = r.VariantId?.ToString(),
        VariantName = r.VariantName,
        Quantity = r.Quantity,
        UnitCost = r.UnitCost,
        TotalCost = r.TotalCost,
        Supplier = r.Supplier,
        Reference = r.Reference,
        Reason = r.Reason,
        Note = r.Note,
        ReturnDate = r.ReturnDate,
        StockRemoved = r.StockRemoved,
        CreatedBy = r.CreatedBy,
        CreatedAt = r.CreatedAt
    };

    public static StockPurchaseDto ToDto(this StockPurchase p) => new()
    {
        Id = p.Id.ToString(),
        Supplier = p.Supplier,
        Reference = p.Reference,
        Note = p.Note,
        PurchaseDate = p.PurchaseDate,
        StockApplied = p.StockApplied,
        TotalQuantity = p.TotalQuantity,
        TotalAmount = p.TotalAmount,
        Items = p.Items.Select(i => new StockPurchaseLineDto
        {
            ProductId = i.ProductId.ToString(),
            ProductName = i.ProductName,
            VariantId = i.VariantId?.ToString(),
            VariantName = i.VariantName,
            Quantity = i.Quantity,
            UnitCost = i.UnitCost,
            LineTotal = i.LineTotal
        }).ToList(),
        CreatedBy = p.CreatedBy,
        CreatedAt = p.CreatedAt
    };
}
