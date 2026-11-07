using System.Net;
using System.Text;
using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api/orders")]
public class OrdersController : ApiControllerBase
{
    private readonly OrderService _orders;
    private readonly SettingsService _settings;

    public OrdersController(OrderService orders, SettingsService settings)
    {
        _orders = orders;
        _settings = settings;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request, CancellationToken ct) =>
        Success(await _orders.CreateAsync(request, GuestCartId, ct), "Order placed successfully");

    [HttpGet("my-orders")]
    [Authorize]
    public async Task<IActionResult> MyOrders([FromQuery] OrderQuery query, CancellationToken ct) =>
        Paged(await _orders.GetMyOrdersAsync(query, ct));

    [HttpGet("track")]
    [AllowAnonymous]
    public async Task<IActionResult> Track([FromQuery] string orderNumber, [FromQuery] string email, CancellationToken ct) =>
        Success(await _orders.TrackAsync(orderNumber, email, ct));

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(string id, CancellationToken ct) =>
        Success(await _orders.GetByIdAsync(id, ct));

    [HttpPost("{id}/cancel")]
    [Authorize]
    public async Task<IActionResult> Cancel(string id, [FromBody] CancelOrderRequest request, CancellationToken ct) =>
        Success(await _orders.CancelAsync(id, request, ct), "Order cancelled");

    [HttpPut("{id}/status")]
    [HasPermission(Permissions.OrdersManage)]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct) =>
        Success(await _orders.UpdateStatusAsync(id, request, ct), "Order status updated");

    [HttpPost("{id}/refund")]
    [HasPermission(Permissions.OrdersManage)]
    public async Task<IActionResult> Refund(string id, [FromBody] CancelOrderRequest? request, CancellationToken ct) =>
        Success(await _orders.RefundAsync(id, request?.Reason, ct), "Order refunded");

    [HttpGet("{id}/payments")]
    [Authorize]
    public async Task<IActionResult> Payments(string id, CancellationToken ct) =>
        Success(await _orders.GetPaymentsAsync(id, ct));

    [HttpGet("{id}/invoice")]
    [Authorize]
    public async Task<IActionResult> Invoice(string id, [FromQuery] bool download, CancellationToken ct)
    {
        var order = await _orders.GetByIdAsync(id, ct);
        var settings = await _settings.GetEntityAsync(ct);
        var html = BuildInvoiceHtml(order, settings.StoreName, settings.CurrencySymbol, settings.Email ?? string.Empty);

        if (!download) return Content(html, "text/html", Encoding.UTF8);

        Response.Headers.ContentDisposition = $"attachment; filename=\"{order.OrderNumber}.html\"";
        return Content(html, "text/html", Encoding.UTF8);
    }

    private static string BuildInvoiceHtml(OrderDto order, string storeName, string currency, string storeEmail)
    {
        var sb = new StringBuilder();
        var enc = new Func<string, string>(value => WebUtility.HtmlEncode(value));
        sb.Append("<!doctype html><html><head><meta charset=\"utf-8\"><title>");
        sb.Append(enc(order.OrderNumber)).Append("</title><style>");
        sb.Append("body{font-family:Segoe UI,Arial,sans-serif;color:#1f2937;margin:40px;font-size:14px}");
        sb.Append("h1{font-size:22px;margin:0 0 4px}.muted{color:#6b7280}.row{display:flex;justify-content:space-between;gap:40px}");
        sb.Append("table{width:100%;border-collapse:collapse;margin:28px 0}th,td{padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:left}");
        sb.Append("th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}");
        sb.Append("td.num,th.num{text-align:right}.totals{width:280px;margin-left:auto}.totals div{display:flex;justify-content:space-between;padding:6px 0}");
        sb.Append(".grand{font-weight:700;font-size:16px;border-top:1px solid #111827;margin-top:6px;padding-top:10px}");
        sb.Append("@media print{body{margin:16px}}</style></head><body>");
        sb.Append("<div class=\"row\"><div><h1>").Append(enc(storeName)).Append("</h1>");
        sb.Append("<div class=\"muted\">").Append(enc(storeEmail)).Append("</div></div><div style=\"text-align:right\">");
        sb.Append("<h1>Invoice</h1><div class=\"muted\">").Append(enc(order.OrderNumber)).Append("</div>");
        sb.Append("<div class=\"muted\">").Append(order.CreatedAt.ToString("MMM dd, yyyy")).Append("</div>");
        sb.Append("<div class=\"muted\">Status: ").Append(enc(order.Status)).Append("</div></div></div>");

        sb.Append("<div class=\"row\" style=\"margin-top:28px\"><div><strong>Ship to</strong><br>");
        sb.Append(enc(order.ShippingAddress.FullName)).Append("<br>").Append(enc(order.ShippingAddress.Street)).Append("<br>");
        sb.Append(enc(order.ShippingAddress.City)).Append(", ").Append(enc(order.ShippingAddress.State)).Append(' ');
        sb.Append(enc(order.ShippingAddress.PostalCode)).Append("<br>").Append(enc(order.ShippingAddress.Country)).Append("<br>");
        sb.Append(enc(order.ShippingAddress.Phone)).Append("</div><div><strong>Bill to</strong><br>");
        sb.Append("<div class=\"muted\">").Append(enc(order.CustomerName)).Append("<br>").Append(enc(order.CustomerEmail)).Append("</div></div></div>");

        sb.Append("<table><thead><tr><th>Item</th><th>SKU</th><th class=\"num\">Qty</th><th class=\"num\">Unit</th><th class=\"num\">Total</th></tr></thead><tbody>");
        foreach (var item in order.Items)
        {
            sb.Append("<tr><td>").Append(enc(item.ProductName));
            if (!string.IsNullOrWhiteSpace(item.VariantName)) sb.Append(" <span class=\"muted\">(").Append(enc(item.VariantName)).Append(")</span>");
            sb.Append("</td><td>").Append(enc(item.Sku)).Append("</td><td class=\"num\">").Append(item.Quantity)
                .Append("</td><td class=\"num\">").Append(currency).Append(item.UnitPrice.ToString("0.00"))
                .Append("</td><td class=\"num\">").Append(currency).Append(item.LineTotal.ToString("0.00")).Append("</td></tr>");
        }
        sb.Append("</tbody></table>");

        sb.Append("<div class=\"totals\"><div><span class=\"muted\">Subtotal</span><span>").Append(currency)
            .Append(order.Subtotal.ToString("0.00")).Append("</span></div>");
        if (order.Discount > 0)
            sb.Append("<div><span class=\"muted\">Discount ").Append(enc(order.CouponCode ?? string.Empty)).Append("</span><span>-")
                .Append(currency).Append(order.Discount.ToString("0.00")).Append("</span></div>");
        sb.Append("<div><span class=\"muted\">Shipping</span><span>").Append(currency).Append(order.ShippingCost.ToString("0.00"))
            .Append("</span></div><div><span class=\"muted\">Tax</span><span>").Append(currency).Append(order.TaxAmount.ToString("0.00"))
            .Append("</span></div><div class=\"grand\"><span>Total</span><span>").Append(currency).Append(order.Total.ToString("0.00"))
            .Append("</span></div></div>");
        sb.Append("<p class=\"muted\" style=\"margin-top:40px\">Thank you for shopping with ").Append(enc(storeName)).Append(".</p>");
        sb.Append("</body></html>");
        return sb.ToString();
    }
}
