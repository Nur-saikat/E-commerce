using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api/products")]
public class ProductsController : ApiControllerBase
{
    private readonly CatalogService _catalog;
    private readonly ICurrentUser _currentUser;

    public ProductsController(CatalogService catalog, ICurrentUser currentUser)
    {
        _catalog = catalog;
        _currentUser = currentUser;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] ProductQuery query, CancellationToken ct)
    {
        if (query.IncludeInactive && !_currentUser.HasPermission(Permissions.ProductsManage))
            query.IncludeInactive = false;
        return Paged(await _catalog.GetProductsAsync(query, ct));
    }

    [HttpGet("featured")]
    [AllowAnonymous]
    public async Task<IActionResult> Featured([FromQuery] int limit = 8, CancellationToken ct = default) =>
        Success(await _catalog.GetCollectionAsync("featured", Math.Clamp(limit, 1, 48), ct));

    [HttpGet("latest")]
    [AllowAnonymous]
    public async Task<IActionResult> Latest([FromQuery] int limit = 8, CancellationToken ct = default) =>
        Success(await _catalog.GetCollectionAsync("latest", Math.Clamp(limit, 1, 48), ct));

    [HttpGet("bestsellers")]
    [AllowAnonymous]
    public async Task<IActionResult> Bestsellers([FromQuery] int limit = 8, CancellationToken ct = default) =>
        Success(await _catalog.GetCollectionAsync("bestsellers", Math.Clamp(limit, 1, 48), ct));

    [HttpGet("trending")]
    [AllowAnonymous]
    public async Task<IActionResult> Trending([FromQuery] int limit = 8, CancellationToken ct = default) =>
        Success(await _catalog.GetCollectionAsync("trending", Math.Clamp(limit, 1, 48), ct));

    [HttpGet("deals")]
    [AllowAnonymous]
    public async Task<IActionResult> Deals([FromQuery] int limit = 8, CancellationToken ct = default) =>
        Success(await _catalog.GetCollectionAsync("deals", Math.Clamp(limit, 1, 48), ct));

    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> Search([FromQuery] ProductQuery query, CancellationToken ct) =>
        Paged(await _catalog.GetProductsAsync(query, ct));

    [HttpGet("suggest")]
    [AllowAnonymous]
    public async Task<IActionResult> Suggest([FromQuery] string term, CancellationToken ct) =>
        Success(await _catalog.SuggestAsync(term ?? string.Empty, ct));

    [HttpGet("filters")]
    [AllowAnonymous]
    public async Task<IActionResult> Filters([FromQuery] string? categoryId, [FromQuery] string? categorySlug, CancellationToken ct) =>
        Success(await _catalog.GetFilterOptionsAsync(categoryId, categorySlug, ct));

    [HttpGet("by-ids")]
    [AllowAnonymous]
    public async Task<IActionResult> ByIds([FromQuery] string ids, CancellationToken ct)
    {
        var list = (ids ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return Success(await _catalog.GetByIdsAsync(list, ct));
    }

    [HttpGet("{idOrSlug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string idOrSlug, [FromQuery] bool includeInactive, CancellationToken ct)
    {
        var canSeeInactive = includeInactive && _currentUser.HasPermission(Permissions.ProductsManage);
        return Success(await _catalog.GetProductAsync(idOrSlug, canSeeInactive, ct));
    }

    [HttpPost]
    [HasPermission(Permissions.ProductsManage)]
    public async Task<IActionResult> Create([FromBody] ProductRequest request, CancellationToken ct) =>
        Success(await _catalog.CreateProductAsync(request, _currentUser.UserId, ct), "Product created successfully");

    [HttpPut("{id}")]
    [HasPermission(Permissions.ProductsManage)]
    public async Task<IActionResult> Update(string id, [FromBody] ProductRequest request, CancellationToken ct) =>
        Success(await _catalog.UpdateProductAsync(id, request, _currentUser.UserId, ct), "Product updated successfully");

    [HttpDelete("{id}")]
    [HasPermission(Permissions.ProductsManage)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _catalog.DeleteProductAsync(id, _currentUser.UserId, ct);
        return Success("Product deleted successfully");
    }
}
