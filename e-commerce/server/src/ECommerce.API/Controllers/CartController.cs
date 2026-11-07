using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace ECommerce.API.Controllers;

[Route("api/cart")]
public class CartController : ApiControllerBase
{
    private readonly CartService _cart;
    private readonly ICurrentUser _currentUser;

    public CartController(CartService cart, ICurrentUser currentUser)
    {
        _cart = cart;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Success(await _cart.GetAsync(GuestCartId, ct));

    [HttpPost("items")]
    public async Task<IActionResult> Add([FromBody] AddToCartRequest request, CancellationToken ct) =>
        Success(await _cart.AddAsync(request, GuestCartId, ct), "Item added to cart");

    [HttpPut("items/{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateCartItemRequest request, CancellationToken ct) =>
        Success(await _cart.UpdateItemAsync(id, request, GuestCartId, ct), "Cart updated");

    [HttpDelete("items/{id}")]
    public async Task<IActionResult> Remove(string id, CancellationToken ct) =>
        Success(await _cart.RemoveItemAsync(id, GuestCartId, ct), "Item removed from cart");

    [HttpDelete("clear")]
    public async Task<IActionResult> Clear(CancellationToken ct) =>
        Success(await _cart.ClearAsync(GuestCartId, ct), "Cart cleared");

    [HttpPost("apply-coupon")]
    public async Task<IActionResult> ApplyCoupon([FromBody] ApplyCouponRequest request, CancellationToken ct) =>
        Success(await _cart.ApplyCouponAsync(request.CouponCode, GuestCartId, ct), "Coupon applied");

    [HttpDelete("coupon")]
    public async Task<IActionResult> RemoveCoupon(CancellationToken ct) =>
        Success(await _cart.RemoveCouponAsync(GuestCartId, ct), "Coupon removed");

    [HttpPost("merge")]
    [Authorize]
    public async Task<IActionResult> Merge([FromQuery] string guestId, CancellationToken ct) =>
        Success(await _cart.MergeAsync(guestId, ct), "Cart merged");
}

[Route("api/wishlist")]
[Authorize]
public class WishlistController : ApiControllerBase
{
    private readonly WishlistService _wishlist;
    private readonly ICurrentUser _currentUser;

    public WishlistController(WishlistService wishlist, ICurrentUser currentUser)
    {
        _wishlist = wishlist;
        _currentUser = currentUser;
    }

    private ObjectId UserId =>
        ObjectId.TryParse(_currentUser.UserId, out var id) ? id : throw new Shared.Exceptions.UnauthorizedException();

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Success(await _wishlist.GetAsync(UserId, ct));

    [HttpGet("contains/{productId}")]
    public async Task<IActionResult> Contains(string productId, CancellationToken ct) =>
        Success(await _wishlist.ContainsAsync(UserId, productId, ct));

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddToCartRequest request, CancellationToken ct) =>
        Success(await _wishlist.AddAsync(UserId, request.ProductId, ct), "Product added to wishlist");

    [HttpDelete("{productId}")]
    public async Task<IActionResult> Remove(string productId, CancellationToken ct) =>
        Success(await _wishlist.RemoveAsync(UserId, productId, ct), "Product removed from wishlist");
}
