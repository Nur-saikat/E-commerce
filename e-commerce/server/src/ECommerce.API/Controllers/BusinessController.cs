using ECommerce.API.Authorization;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.Common.Options;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using ECommerce.Shared.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Bson;

namespace ECommerce.API.Controllers;

public class BusinessDocumentUploadRequest
{
    public IFormFile? File { get; set; }
    public string? Title { get; set; }
    public string Category { get; set; } = "Other";
}

[Route("api/admin/business")]
[Authorize]
public class BusinessController : ApiControllerBase
{
    private readonly BusinessService _business;
    private readonly IFileStorage _storage;
    private readonly ICurrentUser _currentUser;
    private readonly AppOptions _options;

    public BusinessController(BusinessService business, IFileStorage storage,
        ICurrentUser currentUser, IOptions<AppOptions> options)
    {
        _business = business;
        _storage = storage;
        _currentUser = currentUser;
        _options = options.Value;
    }

    [HttpGet("overview")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Overview(CancellationToken ct) =>
        Success(await _business.GetOverviewAsync(ct));

    [HttpGet("profile")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Profile(CancellationToken ct) =>
        Success(await _business.GetOwnerProfileAsync(ct));

    [HttpPut("profile")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> SaveProfile([FromBody] OwnerProfileRequest request, CancellationToken ct) =>
        Success(await _business.SaveOwnerProfileAsync(request, ct), "Business profile saved");

    [HttpGet("staff")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Staff([FromQuery] StaffQuery query, CancellationToken ct) =>
        Paged(await _business.GetStaffAsync(query, ct));

    [HttpGet("staff/{id}")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> StaffMember(string id, CancellationToken ct) =>
        Success(await _business.GetStaffMemberAsync(id, ct));

    [HttpPost("staff")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> CreateStaff([FromBody] StaffRequest request, CancellationToken ct) =>
        Success(await _business.CreateStaffAsync(request, ct), "Staff member created");

    [HttpPut("staff/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> UpdateStaff(string id, [FromBody] StaffRequest request, CancellationToken ct) =>
        Success(await _business.UpdateStaffAsync(id, request, ct), "Staff member updated");

    [HttpDelete("staff/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> DeleteStaff(string id, CancellationToken ct)
    {
        await _business.DeleteStaffAsync(id, ct);
        return Success("Staff member deleted");
    }

    [HttpGet("capital")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Capital([FromQuery] LedgerQuery query, CancellationToken ct) =>
        Paged(await _business.GetCapitalEntriesAsync(query, ct));

    [HttpPost("capital")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> CreateCapital([FromBody] CapitalEntryRequest request, CancellationToken ct) =>
        Success(await _business.CreateCapitalEntryAsync(request, ct), "Capital entry created");

    [HttpPut("capital/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> UpdateCapital(string id, [FromBody] CapitalEntryRequest request, CancellationToken ct) =>
        Success(await _business.UpdateCapitalEntryAsync(id, request, ct), "Capital entry updated");

    [HttpDelete("capital/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> DeleteCapital(string id, CancellationToken ct)
    {
        await _business.DeleteCapitalEntryAsync(id, ct);
        return Success("Capital entry deleted");
    }

    [HttpGet("expenses")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Expenses([FromQuery] LedgerQuery query, CancellationToken ct) =>
        Paged(await _business.GetExpensesAsync(query, ct));

    [HttpPost("expenses")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> CreateExpense([FromBody] ExpenseEntryRequest request, CancellationToken ct) =>
        Success(await _business.CreateExpenseAsync(request, ct), "Expense created");

    [HttpPut("expenses/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> UpdateExpense(string id, [FromBody] ExpenseEntryRequest request, CancellationToken ct) =>
        Success(await _business.UpdateExpenseAsync(id, request, ct), "Expense updated");

    [HttpDelete("expenses/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> DeleteExpense(string id, CancellationToken ct)
    {
        await _business.DeleteExpenseAsync(id, ct);
        return Success("Expense deleted");
    }

    [HttpGet("arrivals")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Arrivals([FromQuery] StockArrivalQuery query, CancellationToken ct) =>
        Paged(await _business.GetArrivalsAsync(query, ct));

    [HttpPost("arrivals")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> CreateArrival([FromBody] StockArrivalRequest request, CancellationToken ct) =>
        Success(await _business.CreateArrivalAsync(request, ct), "Stock arrival recorded");

    [HttpDelete("arrivals/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> DeleteArrival(string id, CancellationToken ct)
    {
        await _business.DeleteArrivalAsync(id, ct);
        return Success("Stock arrival deleted");
    }

    [HttpGet("purchases")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Purchases([FromQuery] StockPurchaseQuery query, CancellationToken ct) =>
        Paged(await _business.GetPurchasesAsync(query, ct));

    [HttpPost("purchases")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> CreatePurchase([FromBody] StockPurchaseRequest request, CancellationToken ct) =>
        Success(await _business.CreatePurchaseAsync(request, ct), "Purchase recorded");

    [HttpDelete("purchases/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> DeletePurchase(string id, CancellationToken ct)
    {
        await _business.DeletePurchaseAsync(id, ct);
        return Success("Purchase deleted");
    }

    [HttpGet("supplier-returns")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> SupplierReturns([FromQuery] SupplierReturnQuery query, CancellationToken ct) =>
        Paged(await _business.GetSupplierReturnsAsync(query, ct));

    [HttpPost("supplier-returns")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> CreateSupplierReturn([FromBody] SupplierReturnRequest request, CancellationToken ct) =>
        Success(await _business.CreateSupplierReturnAsync(request, ct), "Supplier return recorded");

    [HttpDelete("supplier-returns/{id}")]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> DeleteSupplierReturn(string id, CancellationToken ct)
    {
        await _business.DeleteSupplierReturnAsync(id, ct);
        return Success("Supplier return deleted");
    }

    [HttpGet("products")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> Products([FromQuery] string? search, CancellationToken ct) =>
        Success(await _business.GetProductOptionsAsync(search, ct));

    [HttpGet("profit-loss")]
    [HasPermission(Permissions.BusinessView)]
    public async Task<IActionResult> ProfitLoss([FromQuery] ProfitLossQuery query, CancellationToken ct) =>
        Success(await _business.GetProfitLossAsync(query, ct));

    [HttpPost("documents")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [HasPermission(Permissions.BusinessManage)]
    public async Task<IActionResult> UploadDocument([FromForm] BusinessDocumentUploadRequest request, CancellationToken ct)
    {
        var file = request.File;
        if (file is null || file.Length == 0)
            throw new BadRequestException("Please choose a file to upload");
        if (file.Length > _options.MaxDocumentBytes)
            throw new BadRequestException($"Files must be smaller than {_options.MaxDocumentBytes / (1024 * 1024)}MB");
        if (!_options.AllowedDocumentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            throw new BadRequestException("Only PDF, Word and image documents are supported");

        await using var stream = file.OpenReadStream();
        var url = await _storage.SaveDocumentAsync(stream, file.FileName, file.ContentType, _options.MaxDocumentBytes, ct);
        var category = BusinessConstants.DocumentCategories.Contains(request.Category) ? request.Category : "Other";

        return Success(new BusinessDocumentDto
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Title = string.IsNullOrWhiteSpace(request.Title)
                ? Path.GetFileNameWithoutExtension(file.FileName)
                : request.Title.Trim(),
            Category = category,
            Url = url,
            FileName = Path.GetFileName(url),
            Size = file.Length,
            ContentType = file.ContentType,
            UploadedAt = DateTime.UtcNow,
            UploadedBy = _currentUser.UserId
        }, "Document uploaded");
    }
}
