using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api/account/addresses")]
[Authorize]
public class AddressesController : ApiControllerBase
{
    private readonly AccountService _account;

    public AddressesController(AccountService account)
    {
        _account = account;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Success(await _account.GetAddressesAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AddressRequest request, CancellationToken ct) =>
        Success(await _account.AddAddressAsync(request, ct), "Address added");

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] AddressRequest request, CancellationToken ct) =>
        Success(await _account.UpdateAddressAsync(id, request, ct), "Address updated");

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _account.DeleteAddressAsync(id, ct);
        return Success("Address deleted");
    }

    [HttpPost("{id}/default")]
    public async Task<IActionResult> SetDefault(string id, CancellationToken ct) =>
        Success(await _account.SetDefaultAsync(id, ct), "Default address updated");
}
