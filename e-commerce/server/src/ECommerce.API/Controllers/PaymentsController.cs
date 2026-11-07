using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ECommerce.Application.Common.Options;
using ECommerce.Application.DTOs;
using ECommerce.Application.Services;
using ECommerce.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ECommerce.API.Controllers;

[Route("api/payments")]
public class PaymentsController : ApiControllerBase
{
    private readonly PaymentService _payments;
    private readonly PaymentOptions _paymentOptions;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        PaymentService payments,
        IOptions<PaymentOptions> paymentOptions,
        ILogger<PaymentsController> logger)
    {
        _payments = payments;
        _paymentOptions = paymentOptions.Value;
        _logger = logger;
    }

    [HttpGet("providers")]
    [AllowAnonymous]
    public async Task<IActionResult> Providers(CancellationToken ct) =>
        Success(await _payments.GetAvailableProvidersAsync(ct));

    [HttpPost("initiate")]
    [AllowAnonymous]
    public async Task<IActionResult> Initiate([FromBody] PaymentInitiateRequest request, CancellationToken ct) =>
        Success(await _payments.InitiateAsync(request, ct), "Payment initiated");

    [HttpPost("verify")]
    [AllowAnonymous]
    public async Task<IActionResult> Verify([FromBody] PaymentVerifyRequest request, CancellationToken ct) =>
        Success(await _payments.VerifyAsync(request, ct), "Payment verified");

    [HttpPost("webhook/{provider}")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(string provider, CancellationToken ct)
    {
        var transactionId = Request.Query["transactionId"].FirstOrDefault();
        string rawPayload;

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(ct);
            transactionId ??= form["tran_id"].FirstOrDefault() ?? form["val_id"].FirstOrDefault();
            rawPayload = string.Join("&", form.Select(kv => $"{kv.Key}={kv.Value}"));
        }
        else
        {
            using var reader = new StreamReader(Request.Body);
            rawPayload = await reader.ReadToEndAsync(ct);
            if (string.IsNullOrWhiteSpace(transactionId))
                transactionId = ExtractStripeSessionId(rawPayload);
        }

        if (string.IsNullOrWhiteSpace(transactionId))
            return BadRequest(Shared.Common.ApiResponse.Fail("A transaction id is required"));

        if (!HasValidStripeSignature(provider, rawPayload))
        {
            _logger.LogWarning("Rejected Stripe webhook with an invalid signature");
            return Unauthorized(Shared.Common.ApiResponse.Fail("Invalid webhook signature"));
        }

        var handled = await _payments.HandleWebhookAsync(provider, transactionId, rawPayload, ct);
        return Success(handled, handled ? "Webhook processed" : "Webhook ignored");
    }

    private bool HasValidStripeSignature(string provider, string rawPayload)
    {
        if (!string.Equals(provider, PaymentProviders.Stripe, StringComparison.OrdinalIgnoreCase))
            return true;

        var secret = _paymentOptions.Stripe.WebhookSecret;
        if (string.IsNullOrWhiteSpace(secret))
        {
            _logger.LogWarning(
                "Stripe webhook secret is not configured; relying on server-side session verification");
            return true;
        }

        var header = Request.Headers["Stripe-Signature"].ToString();
        if (string.IsNullOrWhiteSpace(header)) return false;

        long timestamp = 0;
        var signatures = new List<string>();
        foreach (var part in header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var pair = part.Split('=', 2);
            if (pair.Length != 2) continue;

            if (pair[0] == "t" && long.TryParse(pair[1], out var parsed))
                timestamp = parsed;
            else if (pair[0] == "v1" && pair[1].Length > 0)
                signatures.Add(pair[1]);
        }

        if (timestamp == 0 || signatures.Count == 0) return false;
        if (Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds() - timestamp) > 300) return false;

        var expected = Encoding.ASCII.GetBytes(Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret),
            Encoding.UTF8.GetBytes($"{timestamp}.{rawPayload}"))).ToLowerInvariant());

        foreach (var signature in signatures)
        {
            var provided = Encoding.ASCII.GetBytes(signature);
            if (provided.Length == expected.Length && CryptographicOperations.FixedTimeEquals(provided, expected))
                return true;
        }

        return false;
    }

    private static string? ExtractStripeSessionId(string payload)
    {
        try
        {
            using var document = JsonDocument.Parse(payload);
            return document.RootElement.TryGetProperty("data", out var data) &&
                   data.TryGetProperty("object", out var obj) &&
                   obj.TryGetProperty("id", out var id)
                ? id.GetString()
                : null;
        }
        catch
        {
            return null;
        }
    }
}
