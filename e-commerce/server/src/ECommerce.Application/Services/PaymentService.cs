using System.Text.RegularExpressions;
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
        if (PaymentProviders.IsMobileBanking(order.PaymentMethod))
            throw new BadRequestException("Submit your mobile banking transaction from the order page instead");

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
        if (settings.BkashEnabled && !string.IsNullOrWhiteSpace(settings.BkashMerchantNumber))
            list.Add(PaymentProviders.Bkash);
        if (settings.NagadEnabled && !string.IsNullOrWhiteSpace(settings.NagadMerchantNumber))
            list.Add(PaymentProviders.Nagad);
        if (settings.RocketEnabled && !string.IsNullOrWhiteSpace(settings.RocketMerchantNumber))
            list.Add(PaymentProviders.Rocket);
        return list;
    }

    public async Task<PaymentDto> SubmitMobileAsync(MobilePaymentSubmitRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(request.OrderId, out var orderId)) throw new NotFoundException("Order not found");
        var order = await _uow.Orders.FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted, ct)
            ?? throw new NotFoundException("Order not found");
        EnsureOwnership(order, request.GuestEmail);

        var providerName = PaymentProviders.MobileBanking
            .FirstOrDefault(p => p.Equals(request.Provider?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new BadRequestException("Unsupported mobile banking provider");
        if (!string.Equals(order.PaymentMethod, providerName, StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException($"This order is not set up for {providerName} payment");
        if (order.PaymentStatus == PaymentStatus.Paid)
            throw new BadRequestException("This order is already paid");
        if (order.Status is OrderStatus.Cancelled or OrderStatus.Refunded)
            throw new BadRequestException("This order can no longer be paid");

        var settings = await _settings.GetEntityAsync(ct);
        var enabled = providerName switch
        {
            PaymentProviders.Bkash => settings.BkashEnabled && !string.IsNullOrWhiteSpace(settings.BkashMerchantNumber),
            PaymentProviders.Nagad => settings.NagadEnabled && !string.IsNullOrWhiteSpace(settings.NagadMerchantNumber),
            PaymentProviders.Rocket => settings.RocketEnabled && !string.IsNullOrWhiteSpace(settings.RocketMerchantNumber),
            _ => false
        };
        if (!enabled) throw new BadRequestException($"{providerName} is not available right now");

        var sender = Regex.Replace(request.SenderNumber ?? string.Empty, @"[\s-]", string.Empty);
        if (!Regex.IsMatch(sender, @"^01[3-9]\d{8}$"))
            throw new BadRequestException("Enter a valid Bangladeshi mobile number (for example 01712345678)");

        var transactionId = (request.TransactionId ?? string.Empty).Trim();
        if (!Regex.IsMatch(transactionId, @"^[A-Za-z0-9]{6,40}$"))
            throw new BadRequestException("Enter the transaction ID shown in your mobile banking receipt");

        var duplicate = await _uow.Payments.FirstOrDefaultAsync(p =>
            p.TransactionId == transactionId && p.OrderId != order.Id && !p.IsDeleted, ct);
        if (duplicate is not null)
            throw new BadRequestException("This transaction ID has already been submitted");

        var payment = await _uow.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id && !p.IsDeleted, ct);
        var isNew = payment is null;
        payment ??= new Payment
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            UserId = order.UserId,
            CreatedBy = _currentUser.UserId
        };
        if (payment.Status == PaymentStatus.Paid)
            throw new BadRequestException("This order is already paid");

        payment.Provider = providerName;
        payment.Amount = order.Total;
        payment.Currency = settings.Currency;
        payment.TransactionId = transactionId;
        payment.ProviderReference = transactionId;
        payment.SenderNumber = sender;
        payment.Status = PaymentStatus.Pending;
        payment.FailureReason = null;
        payment.UpdatedAt = DateTime.UtcNow;
        payment.UpdatedBy = _currentUser.UserId;

        if (isNew) await _uow.Payments.AddAsync(payment, ct);
        else await _uow.Payments.UpdateAsync(payment, ct);

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = order.Status,
            Note = $"{providerName} payment submitted · transaction {transactionId} · awaiting verification",
            ChangedBy = _currentUser.Email ?? order.CustomerEmail
        });
        order.UpdatedAt = DateTime.UtcNow;
        await _uow.Orders.UpdateAsync(order, ct);

        await NotifyAsync(order, "Payment submitted",
            $"We received your {providerName} transaction {transactionId} for order {order.OrderNumber}. It will be verified shortly.", ct);

        return payment.ToDto();
    }

    public async Task<PaymentDto> VerifyMobileAsync(string orderId, MobilePaymentVerifyRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(orderId, out var id)) throw new NotFoundException("Order not found");
        var order = await _uow.Orders.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, ct)
            ?? throw new NotFoundException("Order not found");
        var payment = await _uow.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Payment not found");
        if (!PaymentProviders.IsMobileBanking(payment.Provider))
            throw new BadRequestException("This order does not use mobile banking");
        if (payment.Status == PaymentStatus.Paid) return payment.ToDto();
        if (string.IsNullOrWhiteSpace(payment.TransactionId))
            throw new BadRequestException("The customer has not submitted a transaction ID yet");
        if (order.Status is OrderStatus.Cancelled or OrderStatus.Refunded)
            throw new BadRequestException("This order can no longer be paid");

        payment.VerifiedAt = DateTime.UtcNow;
        payment.VerifiedBy = _currentUser.UserId;
        payment.UpdatedAt = DateTime.UtcNow;
        payment.UpdatedBy = _currentUser.UserId;

        if (request.Approve)
        {
            payment.Status = PaymentStatus.Paid;
            payment.FailureReason = null;
            if (!string.IsNullOrWhiteSpace(request.Reference)) payment.ProviderReference = request.Reference.Trim();
            await _uow.Payments.UpdateAsync(payment, ct);

            order.PaymentStatus = PaymentStatus.Paid;
            order.PaymentTransactionId = payment.TransactionId;
            if (order.Status == OrderStatus.Pending) order.Status = OrderStatus.Confirmed;
            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = order.Status,
                Note = $"{payment.Provider} payment verified · transaction {payment.TransactionId}" +
                       (string.IsNullOrWhiteSpace(request.Note) ? string.Empty : $" · {request.Note.Trim()}"),
                ChangedBy = _currentUser.Email ?? "admin"
            });
            order.UpdatedAt = DateTime.UtcNow;
            await _uow.Orders.UpdateAsync(order, ct);

            await NotifyAsync(order, "Payment confirmed",
                $"Your {payment.Provider} payment for order {order.OrderNumber} was verified.", ct);
        }
        else
        {
            payment.Status = PaymentStatus.Failed;
            payment.FailureReason = string.IsNullOrWhiteSpace(request.Note)
                ? "Mobile payment could not be verified"
                : request.Note.Trim();
            await _uow.Payments.UpdateAsync(payment, ct);

            order.PaymentStatus = PaymentStatus.Failed;
            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = order.Status,
                Note = $"{payment.Provider} payment rejected · {payment.FailureReason}",
                ChangedBy = _currentUser.Email ?? "admin"
            });
            order.UpdatedAt = DateTime.UtcNow;
            await _uow.Orders.UpdateAsync(order, ct);

            await NotifyAsync(order, "Payment could not be verified",
                $"We could not verify your {payment.Provider} payment for order {order.OrderNumber}. {payment.FailureReason}", ct);
        }

        return payment.ToDto();
    }

    private async Task NotifyAsync(Order order, string title, string message, CancellationToken ct)
    {
        if (!order.UserId.HasValue) return;
        await _uow.Notifications.AddAsync(new Notification
        {
            UserId = order.UserId.Value.ToString(),
            Title = title,
            Message = message,
            Type = "Payment",
            Link = $"/account/orders/{order.Id}"
        }, ct);
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
