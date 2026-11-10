using ECommerce.API.Authorization;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api/returns")]
[Authorize]
public class ReturnsController : ApiControllerBase
{
    private readonly ReturnService _returns;

    public ReturnsController(ReturnService returns)
    {
        _returns = returns;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReturnRequest request, CancellationToken ct) =>
        Success(await _returns.CreateAsync(request, ct), "Return request submitted");

    [HttpGet("my")]
    public async Task<IActionResult> MyReturns([FromQuery] ReturnQuery query, CancellationToken ct) =>
        Paged(await _returns.GetMineAsync(query, ct));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct) =>
        Success(await _returns.GetByIdAsync(id, ct));
}

[Route("api/admin/returns")]
[Authorize]
public class AdminReturnsController : ApiControllerBase
{
    private readonly ReturnService _returns;

    public AdminReturnsController(ReturnService returns)
    {
        _returns = returns;
    }

    [HttpGet]
    [HasPermission(Permissions.OrdersView)]
    public async Task<IActionResult> List([FromQuery] ReturnQuery query, CancellationToken ct) =>
        Paged(await _returns.GetAdminAsync(query, ct));

    [HttpGet("{id}")]
    [HasPermission(Permissions.OrdersView)]
    public async Task<IActionResult> GetById(string id, CancellationToken ct) =>
        Success(await _returns.GetByIdAsync(id, ct));

    [HttpPut("{id}/status")]
    [HasPermission(Permissions.OrdersManage)]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateReturnStatusRequest request, CancellationToken ct) =>
        Success(await _returns.UpdateStatusAsync(id, request, ct), "Return updated");
}
