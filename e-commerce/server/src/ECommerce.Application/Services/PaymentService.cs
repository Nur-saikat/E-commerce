using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class PaymentService
{
    private readonly IUnitOfWork _uow;
    private readonly SettingsService _settings;
    private readonly IEnumerable<IPaymentProvider> _providers;
    private readonly ICurrentUser _currentUser;

    public PaymentService(IUnitOfWork uow, SettingsService settings, IEnumerable<IPaymentProvider> providers, ICurrentUser currentUser)
    {
        _uow = uow;
        _settings = settings;
        _providers = providers;
        _currentUser = currentUser;
    }

    public async Task<PaymentInitiateResponse> InitiateAsync(PaymentInitiateRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(request.OrderId, out var orderId)) throw new NotFoundException("Order not found");
        var order = await _uow.Orders.FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted, ct)
            ?? throw new NotFoundException("Order not found");
        EnsureOwnership(order, request.GuestEmail);

        if (order.PaymentStatus == PaymentStatus.Paid)
            throw new BadRequestException("This order is already paid");
        if (order.Status is OrderStatus.Cancelled or OrderStatus.Refunded)
            throw new BadRequestException("This order can no longer be paid");
        if (order.PaymentMethod == PaymentProviders.Cod)
            throw new BadRequestException("Cash on delivery orders do not require online payment");

        var provider = ResolveProvider(request.Provider);
        var settings = await _settings.GetEntityAsync(ct);

        var payment = await _uow.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id && !p.IsDeleted, ct);
        var isNew = payment is null;
        payment ??= new Payment
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            UserId = order.UserId,
            Provider = provider.Name,
            Amount = order.Total,
            Currency = settings.Currency,
            CreatedBy = _currentUser.UserId
        };

        var initiation = await provider.InitiateAsync(new PaymentInitiationRequest
        {
            OrderId = order.Id.ToString(),
            OrderNumber = order.OrderNumber,
            Amount = order.Total,
            Currency = settings.Currency,
            CustomerEmail = order.CustomerEmail,
            CustomerName = order.CustomerName,
            SuccessUrl = request.SuccessUrl,
            CancelUrl = request.CancelUrl
        }, ct);

        payment.Provider = provider.Name;
        payment.Amount = order.Total;
        payment.Currency = settings.Currency;
        payment.TransactionId = initiation.TransactionId ?? payment.TransactionId;
        payment.ProviderReference = initiation.TransactionId;
        payment.Status = initiation.Success ? PaymentStatus.Pending : PaymentStatus.Failed;
        payment.FailureReason = initiation.Success ? null : initiation.Message;
        payment.RawResponse = initiation.RawResponse;
        payment.UpdatedAt = DateTime.UtcNow;

        if (isNew)
            await _uow.Payments.AddAsync(payment, ct);
        else
            await _uow.Payments.UpdateAsync(payment, ct);

        if (!initiation.Success)
            throw new BadRequestException(initiation.Message ?? "Unable to initiate payment");

        return new PaymentInitiateResponse
        {
            OrderId = order.Id.ToString(),
            PaymentId = payment.Id.ToString(),
            Provider = provider.Name,
            TransactionId = initiation.TransactionId,
            RedirectUrl = initiation.RedirectUrl,
            ClientSecret = initiation.ClientSecret,
            Status = payment.Status
        };
    }

    public async Task<PaymentDto> VerifyAsync(PaymentVerifyRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(request.OrderId, out var orderId)) throw new NotFoundException("Order not found");
        var order = await _uow.Orders.FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted, ct)
            ?? throw new NotFoundException("Order not found");
        EnsureOwnership(order, request.GuestEmail);

        var payment = await _uow.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Payment not found");
        var provider = ResolveProvider(payment.Provider);
        var transactionId = string.IsNullOrWhiteSpace(request.TransactionId)
            ? payment.TransactionId ?? string.Empty
            : request.TransactionId;

        var verification = await provider.VerifyAsync(transactionId, ct);
        payment.RawResponse = verification.RawResponse;
        payment.TransactionId = verification.TransactionId ?? payment.TransactionId;
        payment.UpdatedAt = DateTime.UtcNow;
        payment.UpdatedBy = _currentUser.UserId;

        if (!verification.Success)
        {
            payment.Status = PaymentStatus.Failed;
            payment.FailureReason = verification.Message;
            await _uow.Payments.UpdateAsync(payment, ct);
            order.PaymentStatus = PaymentStatus.Failed;
            await _uow.Orders.UpdateAsync(order, ct);
            throw new BadRequestException(verification.Message ?? "Payment verification failed");
        }

        payment.Status = PaymentStatus.Paid;
        payment.FailureReason = null;
        await _uow.Payments.UpdateAsync(payment, ct);

        order.PaymentStatus = PaymentStatus.Paid;
        order.PaymentTransactionId = payment.TransactionId;
        if (order.Status == OrderStatus.Pending) order.Status = OrderStatus.Confirmed;
        order.UpdatedAt = DateTime.UtcNow;
        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = order.Status,
            Note = $"Payment confirmed via {provider.Name}",
            ChangedBy = "system"
        });
        await _uow.Orders.UpdateAsync(order, ct);

        if (order.UserId.HasValue)
        {
            await _uow.Notifications.AddAsync(new Notification
            {
                UserId = order.UserId.Value.ToString(),
                Title = "Payment successful",
                Message = $"Payment for order {order.OrderNumber} was successful.",
                Type = "Payment",
                Link = $"/account/orders/{order.Id}"
            }, ct);
        }

        return payment.ToDto();
    }

    public async Task<bool> HandleWebhookAsync(string providerName, string transactionId, string rawPayload, CancellationToken ct = default)
    {
        var provider = ResolveProvider(providerName);
        var payment = await _uow.Payments.FirstOrDefaultAsync(p =>
            p.Provider == provider.Name && p.TransactionId == transactionId && !p.IsDeleted, ct);
        if (payment is null) return false;

        var verification = await provider.VerifyAsync(transactionId, ct);
        if (!verification.Success) return false;

        payment.Status = PaymentStatus.Paid;
        payment.RawResponse = rawPayload;
        payment.UpdatedAt = DateTime.UtcNow;
        await _uow.Payments.UpdateAsync(payment, ct);

        var order = await _uow.Orders.GetByIdAsync(payment.OrderId, ct);
        if (order is null || order.PaymentStatus == PaymentStatus.Paid) return true;

        order.PaymentStatus = PaymentStatus.Paid;
        order.PaymentTransactionId = payment.TransactionId;
        if (order.Status == OrderStatus.Pending) order.Status = OrderStatus.Confirmed;
        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = order.Status,
            Note = $"Payment confirmed via {provider.Name} webhook",
            ChangedBy = "webhook"
        });
        await _uow.Orders.UpdateAsync(order, ct);
        return true;
    }

    public async Task<List<string>> GetAvailableProvidersAsync(CancellationToken ct = default)
    {
        var settings = await _settings.GetEntityAsync(ct);
        var list = new List<string>();
        if (settings.CodEnabled) list.Add(PaymentProviders.Cod);
        if (settings.StripeEnabled && _providers.Any(p => p.Name == PaymentProviders.Stripe && p.IsEnabled))
            list.Add(PaymentProviders.Stripe);
        if (settings.SslCommerzEnabled && _providers.Any(p => p.Name == PaymentProviders.SslCommerz && p.IsEnabled))
            list.Add(PaymentProviders.SslCommerz);
        return list;
    }

    private IPaymentProvider ResolveProvider(string name)
    {
        var provider = _providers.FirstOrDefault(p =>
            string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase));
        if (provider is null) throw new BadRequestException("Unsupported payment provider");
        if (!provider.IsEnabled) throw new BadRequestException($"{provider.Name} is not configured");
        return provider;
    }

    private void EnsureOwnership(Order order, string? guestEmail)
    {
        var isAdmin = _currentUser.IsAuthenticated && AppRoles.AdminRoles.Contains(_currentUser.Role ?? string.Empty);
        if (isAdmin) return;

        if (order.UserId.HasValue)
        {
            if (!_currentUser.IsAuthenticated) throw new UnauthorizedException();
            if (!ObjectId.TryParse(_currentUser.UserId, out var userId) || order.UserId != userId)
                throw new NotFoundException("Order not found");
            return;
        }

        if (string.IsNullOrWhiteSpace(guestEmail) ||
            !string.Equals(guestEmail.Trim(), order.CustomerEmail, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedException("Sign in or provide the email used for this order");
    }
}
