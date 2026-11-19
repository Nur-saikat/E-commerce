using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api/admin")]
[Authorize]
public class AdminController : ApiControllerBase
{
    private readonly AdminService _admin;
    private readonly OrderService _orders;

    public AdminController(AdminService admin, OrderService orders)
    {
        _admin = admin;
        _orders = orders;
    }

    [HttpGet("dashboard")]
    [HasPermission(Permissions.DashboardView)]
    public async Task<IActionResult> Dashboard(CancellationToken ct) => Success(await _admin.GetDashboardAsync(ct));

    [HttpGet("reports/sales")]
    [HasPermission(Permissions.ReportsView)]
    public async Task<IActionResult> SalesReport([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct) =>
        Success(await _admin.GetSalesReportAsync(from, to, ct));

    [HttpGet("reports/orders")]
    [HasPermission(Permissions.ReportsView)]
    public async Task<IActionResult> OrderReport([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct) =>
        Success(await _admin.GetOrderReportAsync(from, to, ct));

    [HttpGet("orders")]
    [HasPermission(Permissions.OrdersView)]
    public async Task<IActionResult> Orders([FromQuery] OrderQuery query, CancellationToken ct) =>
        Paged(await _orders.GetAdminOrdersAsync(query, ct));

    [HttpGet("customers")]
    [HasPermission(Permissions.CustomersView)]
    public async Task<IActionResult> Customers([FromQuery] CustomerQuery query, CancellationToken ct) =>
        Paged(await _admin.GetCustomersAsync(query, ct));

    [HttpPut("customers/{id}")]
    [HasPermission(Permissions.CustomersManage)]
    public async Task<IActionResult> UpdateCustomer(string id, [FromBody] UpdateCustomerRequest request, CancellationToken ct) =>
        Success(await _admin.UpdateCustomerAsync(id, request, ct), "Customer updated");

    [HttpGet("inventory")]
    [HasPermission(Permissions.InventoryManage)]
    public async Task<IActionResult> Inventory([FromQuery] InventoryQuery query, CancellationToken ct) =>
        Paged(await _admin.GetInventoryAsync(query, ct));

    [HttpPost("inventory/{productId}/adjust")]
    [HasPermission(Permissions.InventoryManage)]
    public async Task<IActionResult> AdjustStock(string productId, [FromBody] StockAdjustmentRequest request, CancellationToken ct) =>
        Success(await _admin.AdjustStockAsync(productId, request, ct), "Stock adjusted");

    [HttpGet("inventory/transactions")]
    [HasPermission(Permissions.InventoryManage)]
    public async Task<IActionResult> InventoryTransactions([FromQuery] PagedQuery query, CancellationToken ct) =>
        Paged(await _admin.GetInventoryTransactionsAsync(query, ct));

    [HttpGet("audit-logs")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> AuditLogs([FromQuery] PagedQuery query, CancellationToken ct) =>
        Success(await _admin.GetAuditLogsAsync(query, ct));

    [HttpGet("roles")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> Roles(CancellationToken ct) => Success(await _admin.GetRolesAsync(ct));

    [HttpGet("permissions")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> GetPermissions(CancellationToken ct) => Success(await _admin.GetPermissionsAsync(ct));

    [HttpPut("roles/{roleName}/permissions")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> UpdateRolePermissions(string roleName, [FromBody] RoleUpdateRequest request, CancellationToken ct) =>
        Success(await _admin.UpdateRolePermissionsAsync(roleName, request.Permissions, ct), "Role permissions updated");
}

[Route("api/admin")]
[Authorize]
public class AdminContentController : ApiControllerBase
{
    private readonly ContentService _content;
    private readonly SettingsService _settings;
    private readonly ICurrentUser _currentUser;

    public AdminContentController(ContentService content, SettingsService settings, ICurrentUser currentUser)
    {
        _content = content;
        _settings = settings;
        _currentUser = currentUser;
    }

    [HttpGet("banners")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> Banners([FromQuery] string? position, CancellationToken ct) =>
        Success(await _content.GetBannersAsync(position, true, ct));

    [HttpPost("banners")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> CreateBanner([FromBody] BannerRequest request, CancellationToken ct) =>
        Success(await _content.CreateBannerAsync(request, ct), "Banner created");

    [HttpPut("banners/{id}")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> UpdateBanner(string id, [FromBody] BannerRequest request, CancellationToken ct) =>
        Success(await _content.UpdateBannerAsync(id, request, ct), "Banner updated");

    [HttpDelete("banners/{id}")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> DeleteBanner(string id, CancellationToken ct)
    {
        await _content.DeleteBannerAsync(id, ct);
        return Success("Banner deleted");
    }

    [HttpGet("testimonials")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> Testimonials(CancellationToken ct) =>
        Success(await _content.GetTestimonialsAsync(true, ct));

    [HttpPost("testimonials")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> CreateTestimonial([FromBody] TestimonialRequest request, CancellationToken ct) =>
        Success(await _content.CreateTestimonialAsync(request, ct), "Testimonial created");

    [HttpPut("testimonials/{id}")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> UpdateTestimonial(string id, [FromBody] TestimonialRequest request, CancellationToken ct) =>
        Success(await _content.UpdateTestimonialAsync(id, request, ct), "Testimonial updated");

    [HttpDelete("testimonials/{id}")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> DeleteTestimonial(string id, CancellationToken ct)
    {
        await _content.DeleteTestimonialAsync(id, ct);
        return Success("Testimonial deleted");
    }

    [HttpGet("contact-messages")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> ContactMessages([FromQuery] PagedQuery query, CancellationToken ct) =>
        Paged(await _content.GetContactMessagesAsync(query, ct));

    [HttpPost("contact-messages/{id}/read")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> MarkContactRead(string id, CancellationToken ct)
    {
        await _content.MarkContactReadAsync(id, ct);
        return Success("Message marked as read");
    }

    [HttpDelete("contact-messages/{id}")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> DeleteContactMessage(string id, CancellationToken ct)
    {
        await _content.DeleteContactAsync(id, ct);
        return Success("Message deleted");
    }

    [HttpGet("newsletter-subscribers")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> Subscribers([FromQuery] PagedQuery query, CancellationToken ct) =>
        Paged(await _content.GetSubscribersAsync(query, ct));

    [HttpDelete("newsletter-subscribers/{id}")]
    [HasPermission(Permissions.ContentManage)]
    public async Task<IActionResult> RemoveSubscriber(string id, CancellationToken ct)
    {
        await _content.UnsubscribeAsync(id, ct);
        return Success("Subscriber removed");
    }

    [HttpPut("settings")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> UpdateSettings([FromBody] SettingsRequest request, CancellationToken ct) =>
        Success(await _settings.UpdateAsync(request, _currentUser.UserId, ct), "Settings updated");

    [HttpGet("shipping-methods")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> ShippingMethods(CancellationToken ct) =>
        Success(await _settings.GetShippingMethodsAsync(true, ct));

    [HttpPost("shipping-methods")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> CreateShippingMethod([FromBody] ShippingMethodRequest request, CancellationToken ct) =>
        Success(await _settings.CreateShippingMethodAsync(request, _currentUser.UserId, ct), "Shipping method created");

    [HttpPut("shipping-methods/{id}")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> UpdateShippingMethod(string id, [FromBody] ShippingMethodRequest request, CancellationToken ct) =>
        Success(await _settings.UpdateShippingMethodAsync(id, request, _currentUser.UserId, ct), "Shipping method updated");

    [HttpDelete("shipping-methods/{id}")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<IActionResult> DeleteShippingMethod(string id, CancellationToken ct)
    {
        await _settings.DeleteShippingMethodAsync(id, _currentUser.UserId, ct);
        return Success("Shipping method deleted");
    }
}
