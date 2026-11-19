using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api")]
public class SiteController : ApiControllerBase
{
    private readonly HomeService _home;
    private readonly ContentService _content;
    private readonly SettingsService _settings;
    private readonly ICurrentUser _currentUser;

    public SiteController(HomeService home, ContentService content, SettingsService settings, ICurrentUser currentUser)
    {
        _home = home;
        _content = content;
        _settings = settings;
        _currentUser = currentUser;
    }

    [HttpGet("home")]
    [AllowAnonymous]
    public async Task<IActionResult> Home([FromQuery] string? recentlyViewed, CancellationToken ct) =>
        Success(await _home.GetFeedAsync(recentlyViewed, ct));

    [HttpGet("banners")]
    [AllowAnonymous]
    public async Task<IActionResult> Banners([FromQuery] string? position, [FromQuery] bool includeInactive, CancellationToken ct) =>
        Success(await _content.GetBannersAsync(position,
            includeInactive && _currentUser.HasPermission(Permissions.ContentManage), ct));

    [HttpGet("testimonials")]
    [AllowAnonymous]
    public async Task<IActionResult> Testimonials([FromQuery] bool includeInactive, CancellationToken ct) =>
        Success(await _content.GetTestimonialsAsync(
            includeInactive && _currentUser.HasPermission(Permissions.ContentManage), ct));

    [HttpGet("settings")]
    [AllowAnonymous]
    public async Task<IActionResult> Settings(CancellationToken ct) => Success(await _settings.GetAsync(ct));

    [HttpGet("shipping-methods")]
    [AllowAnonymous]
    public async Task<IActionResult> ShippingMethods(CancellationToken ct) =>
        Success(await _settings.GetShippingMethodsAsync(false, ct));

    [HttpGet("checkout/config")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckoutConfig(CancellationToken ct) =>
        Success(await _settings.GetCheckoutConfigAsync(ct));

    [HttpPost("contact")]
    [AllowAnonymous]
    public async Task<IActionResult> Contact([FromBody] ContactRequest request, CancellationToken ct)
    {
        await _content.SubmitContactAsync(request, ct);
        return Success("Thanks for reaching out. We will reply shortly.");
    }

    [HttpPost("newsletter")]
    [AllowAnonymous]
    public async Task<IActionResult> Subscribe([FromBody] NewsletterRequest request, CancellationToken ct) =>
        Success(await _content.SubscribeAsync(request, ct), "You are subscribed");

    [HttpGet("notifications")]
    [Authorize]
    public async Task<IActionResult> Notifications([FromQuery] int limit = 20, CancellationToken ct = default) =>
        Success(await _content.GetMyNotificationsAsync(Math.Clamp(limit, 1, 50), ct));

    [HttpPost("notifications/{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkNotificationRead(string id, CancellationToken ct)
    {
        await _content.MarkNotificationReadAsync(id, ct);
        return Success();
    }

    [HttpPost("notifications/read-all")]
    [Authorize]
    public async Task<IActionResult> MarkAllNotificationsRead(CancellationToken ct)
    {
        await _content.MarkAllNotificationsReadAsync(ct);
        return Success();
    }
}
