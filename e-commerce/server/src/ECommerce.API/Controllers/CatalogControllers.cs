using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api/categories")]
public class CategoriesController : ApiControllerBase
{
    private readonly CatalogService _catalog;
    private readonly ICurrentUser _currentUser;

    public CategoriesController(CatalogService catalog, ICurrentUser currentUser)
    {
        _catalog = catalog;
        _currentUser = currentUser;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive, CancellationToken ct) =>
        Success(await _catalog.GetCategoriesAsync(includeInactive && _currentUser.HasPermission(Permissions.CategoriesManage), ct));

    [HttpGet("{idOrSlug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string idOrSlug, CancellationToken ct) =>
        Success(await _catalog.GetCategoryAsync(idOrSlug, ct));

    [HttpPost]
    [HasPermission(Permissions.CategoriesManage)]
    public async Task<IActionResult> Create([FromBody] CategoryRequest request, CancellationToken ct) =>
        Success(await _catalog.CreateCategoryAsync(request, _currentUser.UserId, ct), "Category created successfully");

    [HttpPut("{id}")]
    [HasPermission(Permissions.CategoriesManage)]
    public async Task<IActionResult> Update(string id, [FromBody] CategoryRequest request, CancellationToken ct) =>
        Success(await _catalog.UpdateCategoryAsync(id, request, _currentUser.UserId, ct), "Category updated successfully");

    [HttpDelete("{id}")]
    [HasPermission(Permissions.CategoriesManage)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _catalog.DeleteCategoryAsync(id, _currentUser.UserId, ct);
        return Success("Category deleted successfully");
    }
}

[Route("api/brands")]
public class BrandsController : ApiControllerBase
{
    private readonly CatalogService _catalog;
    private readonly ICurrentUser _currentUser;

    public BrandsController(CatalogService catalog, ICurrentUser currentUser)
    {
        _catalog = catalog;
        _currentUser = currentUser;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive, CancellationToken ct) =>
        Success(await _catalog.GetBrandsAsync(includeInactive && _currentUser.HasPermission(Permissions.BrandsManage), ct));

    [HttpGet("{idOrSlug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string idOrSlug, CancellationToken ct) =>
        Success(await _catalog.GetBrandAsync(idOrSlug, ct));

    [HttpPost]
    [HasPermission(Permissions.BrandsManage)]
    public async Task<IActionResult> Create([FromBody] BrandRequest request, CancellationToken ct) =>
        Success(await _catalog.CreateBrandAsync(request, _currentUser.UserId, ct), "Brand created successfully");

    [HttpPut("{id}")]
    [HasPermission(Permissions.BrandsManage)]
    public async Task<IActionResult> Update(string id, [FromBody] BrandRequest request, CancellationToken ct) =>
        Success(await _catalog.UpdateBrandAsync(id, request, _currentUser.UserId, ct), "Brand updated successfully");

    [HttpDelete("{id}")]
    [HasPermission(Permissions.BrandsManage)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _catalog.DeleteBrandAsync(id, _currentUser.UserId, ct);
        return Success("Brand deleted successfully");
    }
}
