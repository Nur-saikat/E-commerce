using ECommerce.Shared.Common;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected string? GuestCartId =>
        Request.Headers.TryGetValue("X-Cart-Id", out var value) ? value.FirstOrDefault() : null;

    protected static IActionResult Success<T>(T? data, string message = "Request completed successfully") =>
        new OkObjectResult(ApiResponse<T>.Ok(data, message));

    protected static IActionResult Success(string message = "Request completed successfully") =>
        new OkObjectResult(ApiResponse.Ok(message));

    protected static IActionResult Paged<T>(PagedResult<T> result, string message = "Request completed successfully")
    {
        var response = ApiResponse<List<T>>.Ok(result.Items, message);
        response.Pagination = result.ToMeta();
        return new OkObjectResult(response);
    }
}
