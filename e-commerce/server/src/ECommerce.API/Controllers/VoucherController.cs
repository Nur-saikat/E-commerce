using ECommerce.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.API.Controllers;

[Route("api/vouchers")]
[Authorize]
public class VoucherController : ApiControllerBase
{
    private readonly VoucherService _vouchers;

    public VoucherController(VoucherService vouchers)
    {
        _vouchers = vouchers;
    }

    [HttpGet("wallet")]
    public async Task<IActionResult> Wallet(CancellationToken ct) =>
        Success(await _vouchers.GetMyWalletAsync(ct));
}
