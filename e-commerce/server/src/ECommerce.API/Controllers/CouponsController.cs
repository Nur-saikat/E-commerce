using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace ECommerce.API.Controllers;

[Route("api/coupons")]
public class CouponsController : ApiControllerBase
{
    private readonly CouponService _coupons;
    private readonly ICurrentUser _currentUser;

    public CouponsController(CouponService coupons, ICurrentUser currentUser)
    {
        _coupons = coupons;
        _currentUser = currentUser;
    }

    [HttpPost("validate")]
    [AllowAnonymous]
    public async Task<IActionResult> Validate([FromBody] CouponValidationRequest request, CancellationToken ct)
    {
        ObjectId? userId = _currentUser.IsAuthenticated && ObjectId.TryParse(_currentUser.UserId, out var id) ? id : null;
        var result = await _coupons.ValidateAsync(request.Code, request.Subtotal, userId, ct);
        return Success(result, result.Valid ? "Coupon applied" : result.Message ?? "Coupon is not valid");
    }

    [HttpGet]
    [HasPermission(Permissions.CouponsManage)]
    public async Task<IActionResult> GetAll([FromQuery] PagedQuery query, CancellationToken ct) =>
        Paged(await _coupons.GetAllAsync(query, ct));

    [HttpPost]
    [HasPermission(Permissions.CouponsManage)]
    public async Task<IActionResult> Create([FromBody] CouponRequest request, CancellationToken ct) =>
        Success(await _coupons.CreateAsync(request, _currentUser.UserId, ct), "Coupon created");

    [HttpPut("{id}")]
    [HasPermission(Permissions.CouponsManage)]
    public async Task<IActionResult> Update(string id, [FromBody] CouponRequest request, CancellationToken ct) =>
        Success(await _coupons.UpdateAsync(id, request, _currentUser.UserId, ct), "Coupon updated");

    [HttpDelete("{id}")]
    [HasPermission(Permissions.CouponsManage)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _coupons.DeleteAsync(id, _currentUser.UserId, ct);
        return Success("Coupon deleted");
    }
}
