using System.Globalization;
using System.Text.RegularExpressions;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class BusinessService
{
    private static readonly DateTime LedgerStart = new(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private readonly IUnitOfWork _uow;
    private readonly ICurrentUser _currentUser;

    public BusinessService(IUnitOfWork uow, ICurrentUser currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<OwnerProfileDto> GetOwnerProfileAsync(CancellationToken ct = default)
    {
        var profile = await _uow.OwnerProfiles.FirstOrDefaultAsync(p => !p.IsDeleted, ct);
        return profile is null
            ? new OwnerProfileDto { BusinessName = "Safwan", Designation = "Founder & Owner" }
            : profile.ToDto();
    }

    public async Task<OwnerProfileDto> SaveOwnerProfileAsync(OwnerProfileRequest request, CancellationToken ct = default)
    {
        var profile = await _uow.OwnerProfiles.FirstOrDefaultAsync(p => !p.IsDeleted, ct);
        var isNew = profile is null;
        profile ??= new OwnerProfile();

        profile.FullName = request.FullName.Trim();
        profile.BusinessName = request.BusinessName.Trim();
        profile.Designation = request.Designation.Trim();
        profile.Email = request.Email.Trim();
        profile.Phone = request.Phone?.Trim() ?? string.Empty;
        profile.Address = request.Address?.Trim();
        profile.DateOfBirth = request.DateOfBirth;
        profile.NationalId = request.NationalId?.Trim();
        profile.TinNumber = request.TinNumber?.Trim();
        profile.BinNumber = request.BinNumber?.Trim();
        profile.Bio = request.Bio?.Trim();
        profile.EmploymentHistory = (request.EmploymentHistory ?? new()).Select(h => new EmploymentHistory
        {
            Company = h.Company.Trim(),
            Role = h.Role.Trim(),
            Location = h.Location?.Trim(),
            StartDate = h.StartDate,
            EndDate = h.EndDate,
            Description = h.Description?.Trim()
        }).ToList();
        profile.Documents = MapDocuments(request.Documents, profile.Documents);
        profile.UpdatedAt = DateTime.UtcNow;
        profile.UpdatedBy = _currentUser.UserId;

        if (isNew)
        {
            profile.CreatedBy = _currentUser.UserId;
            await _uow.OwnerProfiles.AddAsync(profile, ct);
        }
        else
        {
            await _uow.OwnerProfiles.UpdateAsync(profile, ct);
        }

        return profile.ToDto();
    }

    public async Task<PagedResult<StaffMemberDto>> GetStaffAsync(StaffQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<StaffMember>>
        {
            Builders<StaffMember>.Filter.Eq(s => s.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<StaffMember>.Filter.Or(
                Builders<StaffMember>.Filter.Regex(s => s.FullName, pattern),
                Builders<StaffMember>.Filter.Regex(s => s.Email, pattern),
                Builders<StaffMember>.Filter.Regex(s => s.EmployeeCode, pattern),
                Builders<StaffMember>.Filter.Regex(s => s.Designation, pattern)));
        }
        if (!string.IsNullOrWhiteSpace(query.Status))
            filters.Add(Builders<StaffMember>.Filter.Eq(s => s.Status, query.Status));
        if (!string.IsNullOrWhiteSpace(query.Department))
            filters.Add(Builders<StaffMember>.Filter.Eq(s => s.Department, query.Department));

        var filter = Builders<StaffMember>.Filter.And(filters);
        var total = await _uow.StaffMembers.CountAsync(filter, ct);
        var items = await _uow.StaffMembers.Collection.Find(filter)
            .Sort(Builders<StaffMember>.Sort.Descending(s => s.JoinedOn))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<StaffMemberDto>(items.Select(s => s.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<StaffMemberDto> GetStaffMemberAsync(string id, CancellationToken ct = default)
    {
        var staff = await FindStaffAsync(id, ct);
        return staff.ToDto();
    }

    public async Task<StaffMemberDto> CreateStaffAsync(StaffRequest request, CancellationToken ct = default)
    {
        var code = string.IsNullOrWhiteSpace(request.EmployeeCode)
            ? await GenerateEmployeeCodeAsync(ct)
            : request.EmployeeCode.Trim();
        await EnsureEmployeeCodeUniqueAsync(code, null, ct);

        var staff = new StaffMember
        {
            EmployeeCode = code,
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            Phone = request.Phone?.Trim() ?? string.Empty,
            Designation = request.Designation.Trim(),
            Department = request.Department.Trim(),
            EmploymentType = request.EmploymentType,
            Status = request.Status,
            JoinedOn = request.JoinedOn == default ? DateTime.UtcNow : request.JoinedOn,
            LeftOn = request.LeftOn,
            Salary = Math.Round(request.Salary, 2),
            Address = request.Address?.Trim(),
            EmergencyContactName = request.EmergencyContactName?.Trim(),
            EmergencyContactPhone = request.EmergencyContactPhone?.Trim(),
            Notes = request.Notes?.Trim(),
            Documents = MapDocuments(request.Documents, null),
            CreatedBy = _currentUser.UserId
        };
        await _uow.StaffMembers.AddAsync(staff, ct);
        return staff.ToDto();
    }

    public async Task<StaffMemberDto> UpdateStaffAsync(string id, StaffRequest request, CancellationToken ct = default)
    {
        var staff = await FindStaffAsync(id, ct);
        var code = string.IsNullOrWhiteSpace(request.EmployeeCode) ? staff.EmployeeCode : request.EmployeeCode.Trim();
        if (!string.Equals(code, staff.EmployeeCode, StringComparison.Ordinal))
            await EnsureEmployeeCodeUniqueAsync(code, staff.Id, ct);

        staff.EmployeeCode = code;
        staff.FullName = request.FullName.Trim();
        staff.Email = request.Email.Trim();
        staff.Phone = request.Phone?.Trim() ?? string.Empty;
        staff.Designation = request.Designation.Trim();
        staff.Department = request.Department.Trim();
        staff.EmploymentType = request.EmploymentType;
        staff.Status = request.Status;
        staff.JoinedOn = request.JoinedOn == default ? staff.JoinedOn : request.JoinedOn;
        staff.LeftOn = request.LeftOn;
        staff.Salary = Math.Round(request.Salary, 2);
        staff.Address = request.Address?.Trim();
        staff.EmergencyContactName = request.EmergencyContactName?.Trim();
        staff.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
        staff.Notes = request.Notes?.Trim();
        staff.Documents = MapDocuments(request.Documents, staff.Documents);
        staff.UpdatedAt = DateTime.UtcNow;
        staff.UpdatedBy = _currentUser.UserId;
        await _uow.StaffMembers.UpdateAsync(staff, ct);
        return staff.ToDto();
    }

    public async Task DeleteStaffAsync(string id, CancellationToken ct = default)
    {
        var staff = await FindStaffAsync(id, ct);
        staff.IsDeleted = true;
        staff.UpdatedAt = DateTime.UtcNow;
        staff.UpdatedBy = _currentUser.UserId;
        await _uow.StaffMembers.UpdateAsync(staff, ct);
    }

    public async Task<PagedResult<CapitalEntryDto>> GetCapitalEntriesAsync(LedgerQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<CapitalEntry>>
        {
            Builders<CapitalEntry>.Filter.Eq(e => e.IsDeleted, false)
        };
        if (query.From.HasValue) filters.Add(Builders<CapitalEntry>.Filter.Gte(e => e.EntryDate, query.From.Value.Date));
        if (query.To.HasValue) filters.Add(Builders<CapitalEntry>.Filter.Lt(e => e.EntryDate, query.To.Value.Date.AddDays(1)));
        if (!string.IsNullOrWhiteSpace(query.Type)) filters.Add(Builders<CapitalEntry>.Filter.Eq(e => e.Type, query.Type));

        var filter = Builders<CapitalEntry>.Filter.And(filters);
        var total = await _uow.CapitalEntries.CountAsync(filter, ct);
        var items = await _uow.CapitalEntries.Collection.Find(filter)
            .Sort(Builders<CapitalEntry>.Sort.Descending(e => e.EntryDate))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<CapitalEntryDto>(items.Select(e => e.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<CapitalEntryDto> CreateCapitalEntryAsync(CapitalEntryRequest request, CancellationToken ct = default)
    {
        var entry = new CapitalEntry
        {
            Type = request.Type,
            Amount = Math.Round(request.Amount, 2),
            Source = request.Source.Trim(),
            PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Bank Transfer" : request.PaymentMethod.Trim(),
            Reference = request.Reference?.Trim(),
            Note = request.Note?.Trim(),
            EntryDate = request.EntryDate == default ? DateTime.UtcNow : request.EntryDate,
            CreatedBy = _currentUser.UserId
        };
        await _uow.CapitalEntries.AddAsync(entry, ct);
        return entry.ToDto();
    }

    public async Task<CapitalEntryDto> UpdateCapitalEntryAsync(string id, CapitalEntryRequest request, CancellationToken ct = default)
    {
        var entry = await FindCapitalAsync(id, ct);
        entry.Type = request.Type;
        entry.Amount = Math.Round(request.Amount, 2);
        entry.Source = request.Source.Trim();
        entry.PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Bank Transfer" : request.PaymentMethod.Trim();
        entry.Reference = request.Reference?.Trim();
        entry.Note = request.Note?.Trim();
        if (request.EntryDate != default) entry.EntryDate = request.EntryDate;
        entry.UpdatedAt = DateTime.UtcNow;
        entry.UpdatedBy = _currentUser.UserId;
        await _uow.CapitalEntries.UpdateAsync(entry, ct);
        return entry.ToDto();
    }

    public async Task DeleteCapitalEntryAsync(string id, CancellationToken ct = default)
    {
        var entry = await FindCapitalAsync(id, ct);
        entry.IsDeleted = true;
        entry.UpdatedAt = DateTime.UtcNow;
        entry.UpdatedBy = _currentUser.UserId;
        await _uow.CapitalEntries.UpdateAsync(entry, ct);
    }

    public async Task<PagedResult<ExpenseEntryDto>> GetExpensesAsync(LedgerQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<ExpenseEntry>>
        {
            Builders<ExpenseEntry>.Filter.Eq(e => e.IsDeleted, false)
        };
        if (query.From.HasValue) filters.Add(Builders<ExpenseEntry>.Filter.Gte(e => e.ExpenseDate, query.From.Value.Date));
        if (query.To.HasValue) filters.Add(Builders<ExpenseEntry>.Filter.Lt(e => e.ExpenseDate, query.To.Value.Date.AddDays(1)));
        if (!string.IsNullOrWhiteSpace(query.Category))
            filters.Add(Builders<ExpenseEntry>.Filter.Eq(e => e.Category, query.Category));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<ExpenseEntry>.Filter.Or(
                Builders<ExpenseEntry>.Filter.Regex(e => e.Title, pattern),
                Builders<ExpenseEntry>.Filter.Regex(e => e.Vendor, pattern),
                Builders<ExpenseEntry>.Filter.Regex(e => e.Reference, pattern)));
        }

        var filter = Builders<ExpenseEntry>.Filter.And(filters);
        var total = await _uow.ExpenseEntries.CountAsync(filter, ct);
        var items = await _uow.ExpenseEntries.Collection.Find(filter)
            .Sort(Builders<ExpenseEntry>.Sort.Descending(e => e.ExpenseDate))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<ExpenseEntryDto>(items.Select(e => e.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<ExpenseEntryDto> CreateExpenseAsync(ExpenseEntryRequest request, CancellationToken ct = default)
    {
        var expense = new ExpenseEntry
        {
            Category = request.Category,
            Title = request.Title.Trim(),
            Amount = Math.Round(request.Amount, 2),
            Vendor = request.Vendor?.Trim(),
            PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim(),
            Reference = request.Reference?.Trim(),
            Note = request.Note?.Trim(),
            ExpenseDate = request.ExpenseDate == default ? DateTime.UtcNow : request.ExpenseDate,
            IsPaid = request.IsPaid,
            CreatedBy = _currentUser.UserId
        };
        await _uow.ExpenseEntries.AddAsync(expense, ct);
        return expense.ToDto();
    }

    public async Task<ExpenseEntryDto> UpdateExpenseAsync(string id, ExpenseEntryRequest request, CancellationToken ct = default)
    {
        var expense = await FindExpenseAsync(id, ct);
        expense.Category = request.Category;
        expense.Title = request.Title.Trim();
        expense.Amount = Math.Round(request.Amount, 2);
        expense.Vendor = request.Vendor?.Trim();
        expense.PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim();
        expense.Reference = request.Reference?.Trim();
        expense.Note = request.Note?.Trim();
        if (request.ExpenseDate != default) expense.ExpenseDate = request.ExpenseDate;
        expense.IsPaid = request.IsPaid;
        expense.UpdatedAt = DateTime.UtcNow;
        expense.UpdatedBy = _currentUser.UserId;
        await _uow.ExpenseEntries.UpdateAsync(expense, ct);
        return expense.ToDto();
    }

    public async Task DeleteExpenseAsync(string id, CancellationToken ct = default)
    {
        var expense = await FindExpenseAsync(id, ct);
        expense.IsDeleted = true;
        expense.UpdatedAt = DateTime.UtcNow;
        expense.UpdatedBy = _currentUser.UserId;
        await _uow.ExpenseEntries.UpdateAsync(expense, ct);
    }

    public async Task<PagedResult<StockArrivalDto>> GetArrivalsAsync(StockArrivalQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<StockArrival>>
        {
            Builders<StockArrival>.Filter.Eq(a => a.IsDeleted, false)
        };
        if (query.From.HasValue) filters.Add(Builders<StockArrival>.Filter.Gte(a => a.ArrivalDate, query.From.Value.Date));
        if (query.To.HasValue) filters.Add(Builders<StockArrival>.Filter.Lt(a => a.ArrivalDate, query.To.Value.Date.AddDays(1)));
        if (!string.IsNullOrWhiteSpace(query.ProductId) && ObjectId.TryParse(query.ProductId, out var productId))
            filters.Add(Builders<StockArrival>.Filter.Eq(a => a.ProductId, productId));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<StockArrival>.Filter.Or(
                Builders<StockArrival>.Filter.Regex(a => a.ProductName, pattern),
                Builders<StockArrival>.Filter.Regex(a => a.Supplier, pattern),
                Builders<StockArrival>.Filter.Regex(a => a.Reference, pattern)));
        }

        var filter = Builders<StockArrival>.Filter.And(filters);
        var total = await _uow.StockArrivals.CountAsync(filter, ct);
        var items = await _uow.StockArrivals.Collection.Find(filter)
            .Sort(Builders<StockArrival>.Sort.Descending(a => a.ArrivalDate))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<StockArrivalDto>(items.Select(a => a.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<StockArrivalDto> CreateArrivalAsync(StockArrivalRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(request.ProductId, out var productId))
            throw new BadRequestException("Invalid product");

        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Product not found");

        ObjectId? variantId = null;
        string? variantName = null;
        int stockAfter;
        if (!string.IsNullOrWhiteSpace(request.VariantId))
        {
            if (!ObjectId.TryParse(request.VariantId, out var vid))
                throw new BadRequestException("Invalid variant");
            var variant = product.Variants.FirstOrDefault(v => v.Id == vid)
                ?? throw new NotFoundException("Variant not found");
            variantId = vid;
            variantName = variant.Name;
            stockAfter = variant.Stock + request.Quantity;

            await _uow.Products.Collection.UpdateOneAsync(
                Builders<Product>.Filter.And(
                    Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                    Builders<Product>.Filter.ElemMatch(p => p.Variants, v => v.Id == vid)),
                Builders<Product>.Update.Inc("Variants.$.Stock", request.Quantity), cancellationToken: ct);
        }
        else
        {
            stockAfter = product.Stock + request.Quantity;
            await _uow.Products.UpdateOneAsync(
                Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                Builders<Product>.Update.Inc(p => p.Stock, request.Quantity), ct);
        }

        var arrival = new StockArrival
        {
            ProductId = product.Id,
            ProductName = product.Name,
            VariantId = variantId,
            VariantName = variantName,
            Quantity = request.Quantity,
            UnitCost = Math.Round(request.UnitCost, 2),
            Supplier = request.Supplier?.Trim(),
            Reference = request.Reference?.Trim(),
            Note = request.Note?.Trim(),
            ArrivalDate = request.ArrivalDate == default ? DateTime.UtcNow : request.ArrivalDate,
            StockApplied = true,
            CreatedBy = _currentUser.UserId
        };

        try
        {
            await _uow.StockArrivals.AddAsync(arrival, ct);
            await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id.ToString(),
                VariantId = variantId?.ToString(),
                ProductName = product.Name,
                Type = "Arrival",
                QuantityChange = request.Quantity,
                StockAfter = stockAfter,
                Reference = arrival.Reference ?? arrival.Id.ToString(),
                Note = string.IsNullOrWhiteSpace(arrival.Note) ? "Stock arrival" : arrival.Note,
                CreatedBy = _currentUser.UserId
            }, ct);
            if (arrival.UnitCost > 0)
            {
                await _uow.Products.UpdateOneAsync(
                    Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                    Builders<Product>.Update.Set(p => p.CostPrice, arrival.UnitCost), ct);
            }
        }
        catch
        {
            await AdjustProductStockAsync(product.Id, variantId, -request.Quantity, ct);
            throw;
        }

        return arrival.ToDto();
    }

    public async Task DeleteArrivalAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Stock arrival not found");
        var arrival = await _uow.StockArrivals.FirstOrDefaultAsync(a => a.Id == objectId && !a.IsDeleted, ct)
            ?? throw new NotFoundException("Stock arrival not found");

        if (arrival.StockApplied)
        {
            var available = arrival.VariantId.HasValue
                ? (await _uow.Products.FirstOrDefaultAsync(p => p.Id == arrival.ProductId, ct))?.Variants
                    .FirstOrDefault(v => v.Id == arrival.VariantId.Value)?.Stock ?? 0
                : (await _uow.Products.FirstOrDefaultAsync(p => p.Id == arrival.ProductId, ct))?.Stock ?? 0;
            if (available < arrival.Quantity)
                throw new BadRequestException("This arrival can no longer be reversed because the stock has already been sold");

            var reversed = await AdjustProductStockAsync(arrival.ProductId, arrival.VariantId, -arrival.Quantity, ct);
            if (!reversed)
                throw new BadRequestException("Could not reverse stock for this arrival");
        }

        arrival.IsDeleted = true;
        arrival.UpdatedAt = DateTime.UtcNow;
        arrival.UpdatedBy = _currentUser.UserId;
        await _uow.StockArrivals.UpdateAsync(arrival, ct);
    }

    public async Task<PagedResult<SupplierReturnDto>> GetSupplierReturnsAsync(SupplierReturnQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<SupplierReturn>>
        {
            Builders<SupplierReturn>.Filter.Eq(r => r.IsDeleted, false)
        };
        if (query.From.HasValue) filters.Add(Builders<SupplierReturn>.Filter.Gte(r => r.ReturnDate, UtcDate(query.From.Value)));
        if (query.To.HasValue) filters.Add(Builders<SupplierReturn>.Filter.Lt(r => r.ReturnDate, UtcDate(query.To.Value).AddDays(1)));
        if (!string.IsNullOrWhiteSpace(query.ProductId) && ObjectId.TryParse(query.ProductId, out var productId))
            filters.Add(Builders<SupplierReturn>.Filter.Eq(r => r.ProductId, productId));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<SupplierReturn>.Filter.Or(
                Builders<SupplierReturn>.Filter.Regex(r => r.ProductName, pattern),
                Builders<SupplierReturn>.Filter.Regex(r => r.Supplier, pattern),
                Builders<SupplierReturn>.Filter.Regex(r => r.Reference, pattern),
                Builders<SupplierReturn>.Filter.Regex(r => r.Reason, pattern)));
        }

        var filter = Builders<SupplierReturn>.Filter.And(filters);
        var total = await _uow.SupplierReturns.CountAsync(filter, ct);
        var items = await _uow.SupplierReturns.Collection.Find(filter)
            .Sort(Builders<SupplierReturn>.Sort.Descending(r => r.ReturnDate))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<SupplierReturnDto>(items.Select(r => r.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<SupplierReturnDto> CreateSupplierReturnAsync(SupplierReturnRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(request.ProductId, out var productId))
            throw new BadRequestException("Invalid product");
        if (request.Quantity <= 0)
            throw new BadRequestException("Quantity must be at least 1");

        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Product not found");

        ObjectId? variantId = null;
        string? variantName = null;
        int available;
        if (!string.IsNullOrWhiteSpace(request.VariantId))
        {
            if (!ObjectId.TryParse(request.VariantId, out var vid))
                throw new BadRequestException("Invalid variant");
            var variant = product.Variants.FirstOrDefault(v => v.Id == vid)
                ?? throw new NotFoundException("Variant not found");
            variantId = vid;
            variantName = variant.Name;
            available = variant.Stock;
        }
        else
        {
            available = product.Stock;
        }

        if (request.Quantity > available)
            throw new BadRequestException($"Only {available} unit(s) of {product.Name} are in stock to return");

        var removed = await AdjustProductStockAsync(product.Id, variantId, -request.Quantity, ct);
        if (!removed)
            throw new BadRequestException("Could not remove stock for this supplier return");

        var stockAfter = available - request.Quantity;
        var supplierReturn = new SupplierReturn
        {
            ProductId = product.Id,
            ProductName = product.Name,
            VariantId = variantId,
            VariantName = variantName,
            Quantity = request.Quantity,
            UnitCost = Math.Round(request.UnitCost, 2),
            Supplier = request.Supplier?.Trim(),
            Reference = request.Reference?.Trim(),
            Reason = request.Reason?.Trim(),
            Note = request.Note?.Trim(),
            ReturnDate = request.ReturnDate == default ? DateTime.UtcNow : UtcDate(request.ReturnDate),
            StockRemoved = true,
            CreatedBy = _currentUser.UserId
        };

        try
        {
            await _uow.SupplierReturns.AddAsync(supplierReturn, ct);
            await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id.ToString(),
                VariantId = variantId?.ToString(),
                ProductName = product.Name,
                Type = "SupplierReturn",
                QuantityChange = -request.Quantity,
                StockAfter = stockAfter,
                Reference = supplierReturn.Reference ?? supplierReturn.Id.ToString(),
                Note = string.IsNullOrWhiteSpace(supplierReturn.Reason) ? "Returned to supplier" : supplierReturn.Reason,
                CreatedBy = _currentUser.UserId
            }, ct);
        }
        catch
        {
            await AdjustProductStockAsync(product.Id, variantId, request.Quantity, ct);
            throw;
        }

        return supplierReturn.ToDto();
    }

    public async Task DeleteSupplierReturnAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Supplier return not found");
        var supplierReturn = await _uow.SupplierReturns.FirstOrDefaultAsync(r => r.Id == objectId && !r.IsDeleted, ct)
            ?? throw new NotFoundException("Supplier return not found");

        if (supplierReturn.StockRemoved)
        {
            var restored = await AdjustProductStockAsync(
                supplierReturn.ProductId, supplierReturn.VariantId, supplierReturn.Quantity, ct);
            if (!restored)
                throw new BadRequestException("Could not restore stock for this supplier return");
        }

        supplierReturn.IsDeleted = true;
        supplierReturn.UpdatedAt = DateTime.UtcNow;
        supplierReturn.UpdatedBy = _currentUser.UserId;
        await _uow.SupplierReturns.UpdateAsync(supplierReturn, ct);
    }

    public async Task<PagedResult<StockPurchaseDto>> GetPurchasesAsync(StockPurchaseQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<StockPurchase>>
        {
            Builders<StockPurchase>.Filter.Eq(p => p.IsDeleted, false)
        };
        if (query.From.HasValue) filters.Add(Builders<StockPurchase>.Filter.Gte(p => p.PurchaseDate, UtcDate(query.From.Value)));
        if (query.To.HasValue) filters.Add(Builders<StockPurchase>.Filter.Lt(p => p.PurchaseDate, UtcDate(query.To.Value).AddDays(1)));
        if (!string.IsNullOrWhiteSpace(query.ProductId) && ObjectId.TryParse(query.ProductId, out var productId))
            filters.Add(Builders<StockPurchase>.Filter.ElemMatch(p => p.Items, i => i.ProductId == productId));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<StockPurchase>.Filter.Or(
                Builders<StockPurchase>.Filter.Regex(p => p.Supplier, pattern),
                Builders<StockPurchase>.Filter.Regex(p => p.Reference, pattern),
                Builders<StockPurchase>.Filter.Regex(p => p.Note, pattern),
                Builders<StockPurchase>.Filter.ElemMatch(p => p.Items,
                    Builders<StockPurchaseLine>.Filter.Regex(i => i.ProductName, pattern))));
        }

        var filter = Builders<StockPurchase>.Filter.And(filters);
        var total = await _uow.StockPurchases.CountAsync(filter, ct);
        var items = await _uow.StockPurchases.Collection.Find(filter)
            .Sort(Builders<StockPurchase>.Sort.Descending(p => p.PurchaseDate))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<StockPurchaseDto>(items.Select(p => p.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<StockPurchaseDto> CreatePurchaseAsync(StockPurchaseRequest request, CancellationToken ct = default)
    {
        if (request.Items.Count == 0)
            throw new BadRequestException("Add at least one product to the purchase");

        var lines = new List<StockPurchaseLine>();
        var seen = new HashSet<string>();
        foreach (var item in request.Items)
        {
            if (!ObjectId.TryParse(item.ProductId, out var productId))
                throw new BadRequestException("Invalid product");
            if (item.Quantity <= 0)
                throw new BadRequestException("Quantity must be at least 1");
            if (!seen.Add($"{productId}:{item.VariantId}"))
                throw new BadRequestException("The same product and variant cannot appear twice in one purchase");

            var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted, ct)
                ?? throw new NotFoundException("Product not found");

            ObjectId? variantId = null;
            string? variantName = null;
            if (!string.IsNullOrWhiteSpace(item.VariantId))
            {
                if (!ObjectId.TryParse(item.VariantId, out var vid))
                    throw new BadRequestException("Invalid variant");
                var variant = product.Variants.FirstOrDefault(v => v.Id == vid)
                    ?? throw new NotFoundException("Variant not found");
                variantId = vid;
                variantName = variant.Name;
            }

            lines.Add(new StockPurchaseLine
            {
                ProductId = product.Id,
                ProductName = product.Name,
                VariantId = variantId,
                VariantName = variantName,
                Quantity = item.Quantity,
                UnitCost = Math.Round(item.UnitCost, 2)
            });
        }

        var purchase = new StockPurchase
        {
            Supplier = request.Supplier?.Trim(),
            Reference = request.Reference?.Trim(),
            Note = request.Note?.Trim(),
            PurchaseDate = request.PurchaseDate == default ? DateTime.UtcNow : UtcDate(request.PurchaseDate),
            Items = lines,
            CreatedBy = _currentUser.UserId
        };

        var applied = new List<StockPurchaseLine>();
        var saved = false;
        try
        {
            foreach (var line in lines)
            {
                if (!await AdjustProductStockAsync(line.ProductId, line.VariantId, line.Quantity, ct))
                    throw new BadRequestException($"Could not add stock for {line.ProductName}");
                applied.Add(line);
            }

            purchase.StockApplied = true;
            await _uow.StockPurchases.AddAsync(purchase, ct);
            saved = true;

            var products = new Dictionary<ObjectId, Product>();
            foreach (var line in lines)
            {
                if (!products.TryGetValue(line.ProductId, out var product))
                {
                    product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == line.ProductId, ct);
                    if (product is not null) products[line.ProductId] = product;
                }

                var stockAfter = line.VariantId.HasValue
                    ? product?.Variants.FirstOrDefault(v => v.Id == line.VariantId.Value)?.Stock ?? 0
                    : product?.Stock ?? 0;

                await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
                {
                    ProductId = line.ProductId.ToString(),
                    VariantId = line.VariantId?.ToString(),
                    ProductName = line.ProductName,
                    Type = "Purchase",
                    QuantityChange = line.Quantity,
                    StockAfter = stockAfter,
                    Reference = purchase.Reference ?? purchase.Id.ToString(),
                    Note = string.IsNullOrWhiteSpace(purchase.Note) ? "Product purchase" : purchase.Note,
                    CreatedBy = _currentUser.UserId
                }, ct);

                if (line.UnitCost > 0)
                {
                    await _uow.Products.UpdateOneAsync(
                        Builders<Product>.Filter.Eq(p => p.Id, line.ProductId),
                        Builders<Product>.Update.Set(p => p.CostPrice, line.UnitCost), ct);
                }
            }
        }
        catch
        {
            foreach (var line in applied)
                await AdjustProductStockAsync(line.ProductId, line.VariantId, -line.Quantity, ct);

            if (saved)
            {
                purchase.IsDeleted = true;
                purchase.UpdatedAt = DateTime.UtcNow;
                purchase.UpdatedBy = _currentUser.UserId;
                await _uow.StockPurchases.UpdateAsync(purchase, ct);
            }

            throw;
        }

        return purchase.ToDto();
    }

    public async Task DeletePurchaseAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Purchase not found");
        var purchase = await _uow.StockPurchases.FirstOrDefaultAsync(p => p.Id == objectId && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Purchase not found");

        if (purchase.StockApplied)
        {
            foreach (var line in purchase.Items)
            {
                var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == line.ProductId, ct);
                var available = line.VariantId.HasValue
                    ? product?.Variants.FirstOrDefault(v => v.Id == line.VariantId.Value)?.Stock ?? 0
                    : product?.Stock ?? 0;
                if (available < line.Quantity)
                    throw new BadRequestException(
                        $"This purchase can no longer be reversed because {line.ProductName} stock has already been sold");
            }

            var reversed = new List<StockPurchaseLine>();
            try
            {
                foreach (var line in purchase.Items)
                {
                    if (!await AdjustProductStockAsync(line.ProductId, line.VariantId, -line.Quantity, ct))
                        throw new BadRequestException($"Could not reverse stock for {line.ProductName}");
                    reversed.Add(line);
                }
            }
            catch
            {
                foreach (var line in reversed)
                    await AdjustProductStockAsync(line.ProductId, line.VariantId, line.Quantity, ct);
                throw;
            }
        }

        purchase.IsDeleted = true;
        purchase.UpdatedAt = DateTime.UtcNow;
        purchase.UpdatedBy = _currentUser.UserId;
        await _uow.StockPurchases.UpdateAsync(purchase, ct);
    }

    public async Task<List<BusinessProductOptionDto>> GetProductOptionsAsync(string? search, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<Product>>
        {
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
            filters.Add(Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Regex(p => p.Name, pattern),
                Builders<Product>.Filter.Regex(p => p.Sku, pattern)));
        }

        var products = await _uow.Products.Collection
            .Find(Builders<Product>.Filter.And(filters))
            .Sort(Builders<Product>.Sort.Ascending(p => p.Name))
            .Limit(50)
            .ToListAsync(ct);

        return products.Select(p => new BusinessProductOptionDto
        {
            Id = p.Id.ToString(),
            Name = p.Name,
            Sku = p.Sku,
            Stock = p.Stock,
            TotalStock = p.TotalStock,
            CostPrice = p.CostPrice,
            ThumbnailUrl = p.ThumbnailUrl ?? p.Images.FirstOrDefault(),
            Variants = p.Variants.Select(v => new BusinessVariantOptionDto
            {
                Id = v.Id.ToString(),
                Name = v.Name,
                Sku = v.Sku,
                Stock = v.Stock
            }).ToList()
        }).ToList();
    }

    public async Task<ProfitLossDto> GetProfitLossAsync(ProfitLossQuery query, CancellationToken ct = default)
    {
        var groupBy = string.Equals(query.GroupBy, "day", StringComparison.OrdinalIgnoreCase) ? "day" : "month";
        var to = UtcDate(query.To ?? DateTime.UtcNow);
        var from = query.From.HasValue
            ? UtcDate(query.From.Value)
            : (groupBy == "day"
                ? to.AddDays(-29)
                : new DateTime(to.Year, to.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11));
        if (from > to) throw new BadRequestException("The start date must be before the end date");

        var data = await LoadRangeAsync(from, to.AddDays(1), ct);
        var fallback = await GetFallbackCostsAsync(data.Orders, ct);
        var series = BuildSeries(groupBy, from, to, data, fallback);

        var result = new ProfitLossDto
        {
            From = from,
            To = to,
            GroupBy = groupBy,
            Revenue = R(series.Sum(p => p.Revenue)),
            CostOfGoods = R(series.Sum(p => p.CostOfGoods)),
            Expenses = R(series.Sum(p => p.Expenses)),
            Orders = series.Sum(p => p.Orders),
            Purchases = R(series.Sum(p => p.Purchases)),
            PurchaseReturns = R(series.Sum(p => p.PurchaseReturns)),
            CapitalIn = R(data.Capital.Where(c => c.Type is "Investment" or "Loan").Sum(c => c.Amount)),
            CapitalOut = R(data.Capital.Where(c => c.Type is "Withdrawal" or "LoanRepayment").Sum(c => c.Amount)),
            Series = series
        };
        result.GrossProfit = R(result.Revenue - result.CostOfGoods);
        result.NetProfit = R(result.GrossProfit - result.Expenses);
        result.Margin = result.Revenue > 0 ? R(result.NetProfit / result.Revenue * 100) : 0;
        return result;
    }

    public async Task<BusinessOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var seriesStart = monthStart.AddMonths(-11);

        var all = await LoadRangeAsync(LedgerStart, now.Date.AddDays(1), ct);
        var fallback = await GetFallbackCostsAsync(all.Orders, ct);

        var products = await _uow.Products.FindAsync(p => !p.IsDeleted, ct);
        var staff = await _uow.StaffMembers.FindAsync(s => !s.IsDeleted, ct);
        var activeStaff = staff.Where(s => s.Status == "Active").ToList();

        var todayOrders = all.Orders.Where(o => o.CreatedAt >= todayStart).ToList();
        var todayExpenses = all.Expenses.Where(e => e.ExpenseDate >= todayStart).ToList();
        var todayArrivals = all.Arrivals.Where(a => a.ArrivalDate >= todayStart).ToList();
        var todayPurchases = all.Purchases.Where(p => p.PurchaseDate >= todayStart).ToList();
        var todaySupplierReturns = all.SupplierReturns.Where(r => r.ReturnDate >= todayStart).ToList();

        var monthOrders = all.Orders.Where(o => o.CreatedAt >= monthStart).ToList();
        var monthExpenses = all.Expenses.Where(e => e.ExpenseDate >= monthStart).ToList();
        var monthArrivals = all.Arrivals.Where(a => a.ArrivalDate >= monthStart).ToList();
        var monthPurchases = all.Purchases.Where(p => p.PurchaseDate >= monthStart).ToList();
        var monthSupplierReturns = all.SupplierReturns.Where(r => r.ReturnDate >= monthStart).ToList();

        var lifetime = Summarize(all.Orders, all.Expenses, all.Arrivals, all.Purchases, all.SupplierReturns, fallback);
        var capitalInvested = all.Capital.Where(c => c.Type == "Investment").Sum(c => c.Amount);
        var capitalWithdrawn = all.Capital.Where(c => c.Type == "Withdrawal").Sum(c => c.Amount);
        var netCapital = all.Capital.Sum(c => c.Type is "Investment" or "Loan" ? c.Amount : -c.Amount);

        var lowStock = products
            .Where(p => p.TotalStock <= p.LowStockThreshold)
            .OrderBy(p => p.TotalStock)
            .ToList();

        return new BusinessOverviewDto
        {
            Today = Summarize(todayOrders, todayExpenses, todayArrivals, todayPurchases, todaySupplierReturns, fallback),
            ThisMonth = Summarize(monthOrders, monthExpenses, monthArrivals, monthPurchases, monthSupplierReturns, fallback),
            Lifetime = lifetime,
            CapitalInvested = R(capitalInvested),
            CapitalWithdrawn = R(capitalWithdrawn),
            NetCapital = R(netCapital),
            TotalPurchases = R(
                all.Arrivals.Sum(a => a.TotalCost)
                + all.Purchases.Sum(p => p.TotalAmount)
                - all.SupplierReturns.Sum(r => r.TotalCost)),
            TotalPurchaseReturns = R(all.SupplierReturns.Sum(r => r.TotalCost)),
            InventoryValue = R(products.Sum(p => p.TotalStock * p.CostPrice)),
            TotalStaff = staff.Count,
            ActiveStaff = activeStaff.Count,
            TotalPaidOrders = all.Orders.Count,
            LowStockCount = lowStock.Count,
            Owner = await GetOwnerProfileAsync(ct),
            MonthlySeries = BuildSeries("month", seriesStart, now.Date, all, fallback),
            RecentArrivals = all.Arrivals.OrderByDescending(a => a.ArrivalDate).Take(5).Select(a => a.ToDto()).ToList(),
            RecentPurchases = all.Purchases.OrderByDescending(p => p.PurchaseDate).Take(5).Select(p => p.ToDto()).ToList(),
            RecentSupplierReturns = all.SupplierReturns.OrderByDescending(r => r.ReturnDate).Take(5).Select(r => r.ToDto()).ToList(),
            RecentExpenses = all.Expenses.OrderByDescending(e => e.ExpenseDate).Take(5).Select(e => e.ToDto()).ToList(),
            RecentStaff = staff.OrderByDescending(s => s.JoinedOn).Take(5).Select(s => s.ToDto()).ToList(),
            StaffByDepartment = activeStaff
                .GroupBy(s => string.IsNullOrWhiteSpace(s.Department) ? "Unassigned" : s.Department)
                .Select(g => new DepartmentBreakdownDto
                {
                    Department = g.Key,
                    Count = g.Count(),
                    MonthlySalary = R(g.Sum(s => s.Salary))
                })
                .OrderByDescending(g => g.Count)
                .ToList(),
            LowStockProducts = lowStock.Take(5).Select(p => new LowStockItemDto
            {
                ProductId = p.Id.ToString(),
                Name = p.Name,
                Sku = p.Sku,
                Stock = p.TotalStock,
                LowStockThreshold = p.LowStockThreshold
            }).ToList()
        };
    }

    private async Task<RangeData> LoadRangeAsync(DateTime from, DateTime toExclusive, CancellationToken ct)
    {
        var orders = await _uow.Orders.Collection.Find(Builders<Order>.Filter.And(
            Builders<Order>.Filter.Eq(o => o.IsDeleted, false),
            Builders<Order>.Filter.Eq(o => o.PaymentStatus, PaymentStatus.Paid),
            Builders<Order>.Filter.Gte(o => o.CreatedAt, from),
            Builders<Order>.Filter.Lt(o => o.CreatedAt, toExclusive))).ToListAsync(ct);

        var expenses = await _uow.ExpenseEntries.FindAsync(Builders<ExpenseEntry>.Filter.And(
            Builders<ExpenseEntry>.Filter.Eq(e => e.IsDeleted, false),
            Builders<ExpenseEntry>.Filter.Gte(e => e.ExpenseDate, from),
            Builders<ExpenseEntry>.Filter.Lt(e => e.ExpenseDate, toExclusive)), ct: ct);

        var arrivals = await _uow.StockArrivals.FindAsync(Builders<StockArrival>.Filter.And(
            Builders<StockArrival>.Filter.Eq(a => a.IsDeleted, false),
            Builders<StockArrival>.Filter.Gte(a => a.ArrivalDate, from),
            Builders<StockArrival>.Filter.Lt(a => a.ArrivalDate, toExclusive)), ct: ct);

        var purchases = await _uow.StockPurchases.FindAsync(Builders<StockPurchase>.Filter.And(
            Builders<StockPurchase>.Filter.Eq(p => p.IsDeleted, false),
            Builders<StockPurchase>.Filter.Gte(p => p.PurchaseDate, from),
            Builders<StockPurchase>.Filter.Lt(p => p.PurchaseDate, toExclusive)), ct: ct);

        var supplierReturns = await _uow.SupplierReturns.FindAsync(Builders<SupplierReturn>.Filter.And(
            Builders<SupplierReturn>.Filter.Eq(r => r.IsDeleted, false),
            Builders<SupplierReturn>.Filter.Gte(r => r.ReturnDate, from),
            Builders<SupplierReturn>.Filter.Lt(r => r.ReturnDate, toExclusive)), ct: ct);

        var capital = await _uow.CapitalEntries.FindAsync(Builders<CapitalEntry>.Filter.And(
            Builders<CapitalEntry>.Filter.Eq(e => e.IsDeleted, false),
            Builders<CapitalEntry>.Filter.Gte(e => e.EntryDate, from),
            Builders<CapitalEntry>.Filter.Lt(e => e.EntryDate, toExclusive)), ct: ct);

        return new RangeData(orders, expenses, arrivals, purchases, supplierReturns, capital);
    }

    private async Task<Dictionary<ObjectId, decimal>> GetFallbackCostsAsync(List<Order> orders, CancellationToken ct)
    {
        var ids = orders.SelectMany(o => o.Items)
            .Where(i => i.UnitCost <= 0)
            .Select(i => i.ProductId)
            .Distinct()
            .ToList();
        if (ids.Count == 0) return new Dictionary<ObjectId, decimal>();

        var products = await _uow.Products.FindAsync(p => ids.Contains(p.Id), ct);
        return products.ToDictionary(p => p.Id, p => p.CostPrice);
    }

    private static List<ProfitLossPointDto> BuildSeries(string groupBy, DateTime from, DateTime to,
        RangeData data, Dictionary<ObjectId, decimal> fallback)
    {
        var revenue = new Dictionary<string, decimal>();
        var cogs = new Dictionary<string, decimal>();
        var expense = new Dictionary<string, decimal>();
        var purchases = new Dictionary<string, decimal>();
        var purchaseReturns = new Dictionary<string, decimal>();
        var orders = new Dictionary<string, int>();

        foreach (var order in data.Orders)
        {
            var key = PeriodKey(order.CreatedAt, groupBy);
            revenue[key] = revenue.GetValueOrDefault(key) + OrderRevenue(order);
            cogs[key] = cogs.GetValueOrDefault(key) + OrderCost(order, fallback);
            orders[key] = orders.GetValueOrDefault(key) + 1;
        }
        foreach (var item in data.Expenses)
        {
            var key = PeriodKey(item.ExpenseDate, groupBy);
            expense[key] = expense.GetValueOrDefault(key) + item.Amount;
        }
        foreach (var arrival in data.Arrivals)
        {
            var key = PeriodKey(arrival.ArrivalDate, groupBy);
            purchases[key] = purchases.GetValueOrDefault(key) + arrival.TotalCost;
        }
        foreach (var purchase in data.Purchases)
        {
            var key = PeriodKey(purchase.PurchaseDate, groupBy);
            purchases[key] = purchases.GetValueOrDefault(key) + purchase.TotalAmount;
        }
        foreach (var supplierReturn in data.SupplierReturns)
        {
            var key = PeriodKey(supplierReturn.ReturnDate, groupBy);
            purchases[key] = purchases.GetValueOrDefault(key) - supplierReturn.TotalCost;
            purchaseReturns[key] = purchaseReturns.GetValueOrDefault(key) + supplierReturn.TotalCost;
        }

        var points = new List<ProfitLossPointDto>();
        foreach (var (start, end) in EnumeratePeriods(groupBy, from, to))
        {
            var key = PeriodKey(start, groupBy);
            var point = new ProfitLossPointDto
            {
                Period = key,
                Label = groupBy == "day"
                    ? start.ToString("MMM d", CultureInfo.InvariantCulture)
                    : start.ToString("MMM yyyy", CultureInfo.InvariantCulture),
                Revenue = R(revenue.GetValueOrDefault(key)),
                CostOfGoods = R(cogs.GetValueOrDefault(key)),
                Expenses = R(expense.GetValueOrDefault(key)),
                Purchases = R(purchases.GetValueOrDefault(key)),
                PurchaseReturns = R(purchaseReturns.GetValueOrDefault(key)),
                Orders = orders.GetValueOrDefault(key)
            };
            point.GrossProfit = R(point.Revenue - point.CostOfGoods);
            point.NetProfit = R(point.GrossProfit - point.Expenses);
            points.Add(point);
        }
        return points;
    }

    private static IEnumerable<(DateTime Start, DateTime End)> EnumeratePeriods(string groupBy, DateTime from, DateTime to)
    {
        if (groupBy == "day")
        {
            for (var day = from.Date; day <= to.Date; day = day.AddDays(1))
                yield return (day, day);
            yield break;
        }

        var month = new DateTime(from.Year, from.Month, 1);
        var last = new DateTime(to.Year, to.Month, 1);
        while (month <= last)
        {
            yield return (month, month);
            month = month.AddMonths(1);
        }
    }

    private static string PeriodKey(DateTime value, string groupBy) =>
        groupBy == "day"
            ? value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : value.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    private static decimal OrderRevenue(Order order) => Math.Max(0, order.Subtotal - order.Discount);

    private static decimal OrderCost(Order order, Dictionary<ObjectId, decimal> fallback) =>
        order.Items.Sum(i => (i.UnitCost > 0 ? i.UnitCost : fallback.GetValueOrDefault(i.ProductId)) * i.Quantity);

    private static BusinessFinancialsDto Summarize(List<Order> orders, List<ExpenseEntry> expenses,
        List<StockArrival> arrivals, List<StockPurchase> purchases, List<SupplierReturn> supplierReturns,
        Dictionary<ObjectId, decimal> fallback)
    {
        var revenue = orders.Sum(OrderRevenue);
        var cogs = orders.Sum(o => OrderCost(o, fallback));
        var expenseTotal = expenses.Sum(e => e.Amount);
        var gross = revenue - cogs;
        var net = gross - expenseTotal;
        var purchased = arrivals.Sum(a => a.TotalCost) + purchases.Sum(p => p.TotalAmount);
        var purchaseReturns = supplierReturns.Sum(r => r.TotalCost);
        return new BusinessFinancialsDto
        {
            Revenue = R(revenue),
            CostOfGoods = R(cogs),
            GrossProfit = R(gross),
            Expenses = R(expenseTotal),
            NetProfit = R(net),
            Margin = revenue > 0 ? R(net / revenue * 100) : 0,
            Orders = orders.Count,
            Purchases = R(purchased - purchaseReturns),
            PurchaseReturns = R(purchaseReturns)
        };
    }

    private async Task<bool> AdjustProductStockAsync(ObjectId productId, ObjectId? variantId, int change, CancellationToken ct)
    {
        if (variantId.HasValue)
        {
            var filter = Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.Id, productId),
                Builders<Product>.Filter.ElemMatch(p => p.Variants, v => v.Id == variantId.Value && v.Stock >= -change));
            var result = await _uow.Products.Collection.UpdateOneAsync(
                filter, Builders<Product>.Update.Inc("Variants.$.Stock", change), cancellationToken: ct);
            return result.ModifiedCount == 1;
        }

        var rootFilter = Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.Id, productId),
            Builders<Product>.Filter.Gte(p => p.Stock, -change));
        var rootResult = await _uow.Products.Collection.UpdateOneAsync(
            rootFilter, Builders<Product>.Update.Inc(p => p.Stock, change), cancellationToken: ct);
        return rootResult.ModifiedCount == 1;
    }

    private async Task<StaffMember> FindStaffAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Staff member not found");
        return await _uow.StaffMembers.FirstOrDefaultAsync(s => s.Id == objectId && !s.IsDeleted, ct)
            ?? throw new NotFoundException("Staff member not found");
    }

    private async Task<CapitalEntry> FindCapitalAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Capital entry not found");
        return await _uow.CapitalEntries.FirstOrDefaultAsync(e => e.Id == objectId && !e.IsDeleted, ct)
            ?? throw new NotFoundException("Capital entry not found");
    }

    private async Task<ExpenseEntry> FindExpenseAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Expense not found");
        return await _uow.ExpenseEntries.FirstOrDefaultAsync(e => e.Id == objectId && !e.IsDeleted, ct)
            ?? throw new NotFoundException("Expense not found");
    }

    private async Task EnsureEmployeeCodeUniqueAsync(string code, ObjectId? excludeId, CancellationToken ct)
    {
        var existing = await _uow.StaffMembers.FirstOrDefaultAsync(s =>
            s.EmployeeCode == code && s.Id != excludeId && !s.IsDeleted, ct);
        if (existing is not null)
            throw new ConflictException("A staff member with this employee code already exists");
    }

    private async Task<string> GenerateEmployeeCodeAsync(CancellationToken ct)
    {
        var count = await _uow.StaffMembers.CountAsync(
            Builders<StaffMember>.Filter.Eq(s => s.IsDeleted, false), ct);
        for (var i = 0; i < 100; i++)
        {
            var code = $"EMP-{count + 1 + i:0000}";
            if (await _uow.StaffMembers.FirstOrDefaultAsync(s => s.EmployeeCode == code, ct) is null)
                return code;
        }
        return $"EMP-{Guid.NewGuid().ToString("n")[..8].ToUpperInvariant()}";
    }

    private List<BusinessDocument> MapDocuments(List<BusinessDocumentRequest>? requested, List<BusinessDocument>? existing)
    {
        var existingMap = (existing ?? new()).ToDictionary(d => d.Id);
        return (requested ?? new()).Select(d =>
        {
            var existingDoc = !string.IsNullOrWhiteSpace(d.Id) && existingMap.TryGetValue(d.Id, out var found) ? found : null;
            return new BusinessDocument
            {
                Id = string.IsNullOrWhiteSpace(d.Id) ? ObjectId.GenerateNewId().ToString() : d.Id,
                Title = d.Title.Trim(),
                Category = d.Category,
                Url = d.Url.Trim(),
                FileName = d.FileName,
                Size = d.Size,
                ContentType = d.ContentType,
                UploadedAt = existingDoc?.UploadedAt ?? DateTime.UtcNow,
                UploadedBy = existingDoc?.UploadedBy ?? _currentUser.UserId
            };
        }).ToList();
    }

    private static decimal R(decimal value) => Math.Round(value, 2);

    private static DateTime UtcDate(DateTime value) =>
        DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);

    private sealed record RangeData(
        List<Order> Orders,
        List<ExpenseEntry> Expenses,
        List<StockArrival> Arrivals,
        List<StockPurchase> Purchases,
        List<SupplierReturn> SupplierReturns,
        List<CapitalEntry> Capital);
}
