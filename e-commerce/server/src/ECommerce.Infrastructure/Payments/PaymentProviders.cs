using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.Common.Options;
using ECommerce.Shared.Constants;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECommerce.Infrastructure.Payments;

public class CodPaymentProvider : IPaymentProvider
{
    public string Name => PaymentProviders.Cod;
    public bool IsEnabled => true;

    public Task<PaymentInitiationResult> InitiateAsync(PaymentInitiationRequest request, CancellationToken ct = default) =>
        Task.FromResult(new PaymentInitiationResult
        {
            Success = false,
            Message = "Cash on delivery does not require online payment"
        });

    public Task<PaymentVerificationResult> VerifyAsync(string transactionId, CancellationToken ct = default) =>
        Task.FromResult(new PaymentVerificationResult
        {
            Success = false,
            Status = "Pending",
            Message = "Cash on delivery is settled on delivery"
        });
}

public class StripePaymentProvider : IPaymentProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly StripeOptions _options;
    private readonly ILogger<StripePaymentProvider> _logger;

    public StripePaymentProvider(IHttpClientFactory httpClientFactory, IOptions<PaymentOptions> options,
        ILogger<StripePaymentProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value.Stripe;
        _logger = logger;
    }

    public string Name => PaymentProviders.Stripe;
    public bool IsEnabled => _options.Enabled;

    public async Task<PaymentInitiationResult> InitiateAsync(PaymentInitiationRequest request, CancellationToken ct = default)
    {
        try
        {
            var successUrl = request.SuccessUrl +
                (request.SuccessUrl.Contains('?') ? "&" : "?") +
                "session_id={CHECKOUT_SESSION_ID}";

            var form = new Dictionary<string, string>
            {
                ["mode"] = "payment",
                ["success_url"] = successUrl,
                ["cancel_url"] = request.CancelUrl,
                ["customer_email"] = request.CustomerEmail,
                ["client_reference_id"] = request.OrderId,
                ["line_items[0][quantity]"] = "1",
                ["line_items[0][price_data][currency]"] = request.Currency.ToLowerInvariant(),
                ["line_items[0][price_data][unit_amount]"] =
                    ((long)Math.Round(request.Amount * 100, MidpointRounding.AwayFromZero)).ToString(CultureInfo.InvariantCulture),
                ["line_items[0][price_data][product_data][name]"] = $"Order {request.OrderNumber}",
                ["metadata[orderId]"] = request.OrderId,
                ["metadata[orderNumber]"] = request.OrderNumber,
                ["payment_intent_data[metadata][orderId]"] = request.OrderId
            };

            var client = _httpClientFactory.CreateClient();
            using var message = new HttpRequestMessage(HttpMethod.Post, $"{_options.ApiBase}/checkout/sessions")
            {
                Content = new FormUrlEncodedContent(form)
            };
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.SecretKey);

            var response = await client.SendAsync(message, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Stripe checkout failed: {Status} {Body}", response.StatusCode, body);
                return new PaymentInitiationResult
                {
                    Success = false,
                    Message = ParseStripeError(body) ?? "Stripe rejected the payment request",
                    RawResponse = body
                };
            }

            using var document = JsonDocument.Parse(body);
            var id = document.RootElement.GetProperty("id").GetString();
            var url = document.RootElement.TryGetProperty("url", out var urlElement) ? urlElement.GetString() : null;
            return new PaymentInitiationResult
            {
                Success = true,
                TransactionId = id,
                RedirectUrl = url,
                RawResponse = body
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Stripe payment initiation failed");
            return new PaymentInitiationResult { Success = false, Message = "Unable to reach Stripe" };
        }
    }

    public async Task<PaymentVerificationResult> VerifyAsync(string transactionId, CancellationToken ct = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            using var message = new HttpRequestMessage(HttpMethod.Get,
                $"{_options.ApiBase}/checkout/sessions/{Uri.EscapeDataString(transactionId)}");
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.SecretKey);

            var response = await client.SendAsync(message, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
                return new PaymentVerificationResult { Success = false, Status = "Failed", Message = "Unable to verify payment", RawResponse = body };

            using var document = JsonDocument.Parse(body);
            var paymentStatus = document.RootElement.TryGetProperty("payment_status", out var ps) ? ps.GetString() : null;
            var sessionStatus = document.RootElement.TryGetProperty("status", out var ss) ? ss.GetString() : null;
            var paid = paymentStatus == "paid";
            return new PaymentVerificationResult
            {
                Success = paid,
                Status = paid ? "Paid" : sessionStatus ?? "Pending",
                TransactionId = transactionId,
                Message = paid ? "Payment confirmed" : $"Stripe session status: {sessionStatus}, payment: {paymentStatus}",
                RawResponse = body
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Stripe verification failed");
            return new PaymentVerificationResult { Success = false, Status = "Failed", Message = "Unable to verify payment" };
        }
    }

    private static string? ParseStripeError(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.TryGetProperty("error", out var error) &&
                   error.TryGetProperty("message", out var message)
                ? message.GetString()
                : null;
        }
        catch
        {
            return null;
        }
    }
}

public class SslCommerzPaymentProvider : IPaymentProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SslCommerzOptions _options;
    private readonly ILogger<SslCommerzPaymentProvider> _logger;

    public SslCommerzPaymentProvider(IHttpClientFactory httpClientFactory, IOptions<PaymentOptions> options,
        ILogger<SslCommerzPaymentProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value.SslCommerz;
        _logger = logger;
    }

    public string Name => PaymentProviders.SslCommerz;
    public bool IsEnabled => _options.Enabled;

    public async Task<PaymentInitiationResult> InitiateAsync(PaymentInitiationRequest request, CancellationToken ct = default)
    {
        try
        {
            var tranId = $"TXN-{Guid.NewGuid():n}"[..28];
            var form = new Dictionary<string, string>
            {
                ["store_id"] = _options.StoreId,
                ["store_passwd"] = _options.StorePassword,
                ["total_amount"] = request.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                ["currency"] = request.Currency,
                ["tran_id"] = tranId,
                ["success_url"] = request.SuccessUrl,
                ["fail_url"] = request.CancelUrl,
                ["cancel_url"] = request.CancelUrl,
                ["cus_name"] = request.CustomerName,
                ["cus_email"] = request.CustomerEmail,
                ["cus_phone"] = "01700000000",
                ["cus_add1"] = "N/A",
                ["cus_city"] = "N/A",
                ["cus_country"] = "Bangladesh",
                ["shipping_method"] = "NO",
                ["product_name"] = $"Order {request.OrderNumber}",
                ["product_category"] = "General",
                ["product_profile"] = "general"
            };

            var client = _httpClientFactory.CreateClient();
            using var content = new FormUrlEncodedContent(form);
            var response = await client.PostAsync($"{_options.BaseUrl}/gwprocess/v4/api.php", content, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            using var document = JsonDocument.Parse(body);
            var status = document.RootElement.TryGetProperty("status", out var s) ? s.GetString() : null;
            if (!string.Equals(status, "SUCCESS", StringComparison.OrdinalIgnoreCase))
            {
                var message = document.RootElement.TryGetProperty("failedreason", out var fr) ? fr.GetString() :
                    "SSLCommerz rejected the payment request";
                return new PaymentInitiationResult { Success = false, Message = message, RawResponse = body };
            }

            var gatewayUrl = document.RootElement.TryGetProperty("GatewayPageURL", out var url) ? url.GetString() : null;
            return new PaymentInitiationResult
            {
                Success = true,
                TransactionId = tranId,
                RedirectUrl = gatewayUrl,
                RawResponse = body
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSLCommerz payment initiation failed");
            return new PaymentInitiationResult { Success = false, Message = "Unable to reach SSLCommerz" };
        }
    }

    public async Task<PaymentVerificationResult> VerifyAsync(string transactionId, CancellationToken ct = default)
    {
        try
        {
            var url = $"{_options.BaseUrl}/validator/api/merchantTransIDvalidationAPI.php" +
                      $"?tran_id={Uri.EscapeDataString(transactionId)}" +
                      $"&store_id={Uri.EscapeDataString(_options.StoreId)}" +
                      $"&store_passwd={Uri.EscapeDataString(_options.StorePassword)}&format=json";
            var client = _httpClientFactory.CreateClient();
            var body = await client.GetStringAsync(url, ct);
            using var document = JsonDocument.Parse(body);
            var status = document.RootElement.TryGetProperty("status", out var s) ? s.GetString() : null;
            var valid = status is "VALID" or "VALIDATED" or "SUCCESS";
            return new PaymentVerificationResult
            {
                Success = valid,
                Status = valid ? "Paid" : "Pending",
                TransactionId = transactionId,
                Message = valid ? "Payment confirmed" : $"SSLCommerz status: {status}",
                RawResponse = body
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSLCommerz verification failed");
            return new PaymentVerificationResult { Success = false, Status = "Failed", Message = "Unable to verify payment" };
        }
    }
}
