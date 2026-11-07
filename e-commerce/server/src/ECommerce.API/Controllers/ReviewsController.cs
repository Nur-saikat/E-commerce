using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace ECommerce.API.Controllers;

[Route("api")]
public class ReviewsController : ApiControllerBase
{
    private readonly ReviewService _reviews;
    private readonly ICurrentUser _currentUser;

    public ReviewsController(ReviewService reviews, ICurrentUser currentUser)
    {
        _reviews = reviews;
        _currentUser = currentUser;
    }

    [HttpGet("products/{productId}/reviews")]
    [AllowAnonymous]
    public async Task<IActionResult> ForProduct(string productId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        CancellationToken ct = default) =>
        Success(await _reviews.GetProductReviewsAsync(productId, page, pageSize, ct));

    [HttpPost("products/{productId}/reviews")]
    [Authorize]
    public async Task<IActionResult> Create(string productId, [FromBody] CreateReviewRequest request, CancellationToken ct)
    {
        var userId = ObjectId.TryParse(_currentUser.UserId, out var id)
            ? id
            : throw new Shared.Exceptions.UnauthorizedException();
        var userName = User.FindFirst(AppClaimTypes.FullName)?.Value ?? _currentUser.Email ?? "Customer";
        return Success(await _reviews.CreateAsync(productId, request, userId, userName, ct),
            "Review submitted and awaiting approval");
    }

    [HttpGet("reviews/my")]
    [Authorize]
    public async Task<IActionResult> MyReviews([FromQuery] PagedQuery query, CancellationToken ct)
    {
        var userId = ObjectId.TryParse(_currentUser.UserId, out var id)
            ? id
            : throw new Shared.Exceptions.UnauthorizedException();
        return Paged(await _reviews.GetMyReviewsAsync(userId, query, ct));
    }

    [HttpGet("admin/reviews")]
    [HasPermission(Permissions.ReviewsManage)]
    public async Task<IActionResult> AdminList([FromQuery] PagedQuery query, [FromQuery] bool? approved, CancellationToken ct) =>
        Paged(await _reviews.GetForAdminAsync(query, approved, ct));

    [HttpPost("reviews/{id}/approve")]
    [HasPermission(Permissions.ReviewsManage)]
    public async Task<IActionResult> Approve(string id, CancellationToken ct)
    {
        await _reviews.ApproveAsync(id, _currentUser.UserId, ct);
        return Success("Review approved");
    }

    [HttpPost("reviews/{id}/reject")]
    [HasPermission(Permissions.ReviewsManage)]
    public async Task<IActionResult> Reject(string id, CancellationToken ct)
    {
        await _reviews.RejectAsync(id, _currentUser.UserId, ct);
        return Success("Review rejected");
    }

    [HttpDelete("reviews/{id}")]
    [HasPermission(Permissions.ReviewsManage)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _reviews.DeleteAsync(id, _currentUser.UserId, ct);
        return Success("Review deleted");
    }
}
