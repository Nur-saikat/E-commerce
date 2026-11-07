using System.Security.Cryptography;
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

public class OrderService
{
    private readonly IUnitOfWork _uow;
    private readonly SettingsService _settings;
    private readonly CouponService _coupons;
    private readonly CartService _cartService;
    private readonly ICurrentUser _currentUser;
    private readonly IEmailSender _email;

    public OrderService(IUnitOfWork uow, SettingsService settings, CouponService coupons,
        CartService cartService, ICurrentUser currentUser, IEmailSender email)
    {
        _uow = uow;
        _settings = settings;
        _coupons = coupons;
        _cartService = cartService;
        _currentUser = currentUser;
        _email = email;
    }

    public async Task<OrderDto> CreateAsync(CheckoutRequest request, string? guestId, CancellationToken ct = default)
    {
        var settings = await _settings.GetEntityAsync(ct);
        var paymentMethod = NormalizePaymentMethod(request.PaymentMethod);
        ValidatePaymentMethod(paymentMethod, settings);

        var userId = CurrentUserId;
        var cart = userId.HasValue
            ? await _uow.Carts.FirstOrDefaultAsync(c => c.UserId == userId.Value && !c.IsDeleted, ct)
            : await _cartService.FindCartAsync(guestId, false, ct);

        if (cart is null || cart.Items.Count == 0)
            throw new BadRequestException("Your cart is empty");

        await _cartService.ValidateForCheckoutAsync(cart, ct);

        var items = new List<OrderItem>();
        var productLookup = new Dictionary<string, Product>();
        foreach (var cartItem in cart.Items)
        {
            var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == cartItem.ProductId && !p.IsDeleted, ct)
                ?? throw new BadRequestException($"{cartItem.ProductName} is no longer available");
            var variant = cartItem.VariantId.HasValue
                ? product.Variants.FirstOrDefault(v => v.Id == cartItem.VariantId.Value)
                : null;
            if (cartItem.VariantId.HasValue && variant is null)
                throw new BadRequestException("A selected variant is no longer available");

            var unitPrice = variant?.Price ?? product.EffectivePrice;
            items.Add(new OrderItem
            {
                ProductId = product.Id,
                VariantId = variant?.Id,
                ProductName = product.Name,
                Sku = variant?.Sku ?? product.Sku,
                ImageUrl = variant?.ImageUrl ?? product.ThumbnailUrl ?? product.Images.FirstOrDefault(),
                VariantName = variant?.Name,
                UnitPrice = unitPrice,
                Quantity = cartItem.Quantity,
                LineTotal = Math.Round(unitPrice * cartItem.Quantity, 2)
            });
            productLookup[$"{product.Id}-{variant?.Id}"] = product;
        }

        var subtotal = items.Sum(i => i.LineTotal);
        var discount = 0m;
        string? couponCode = null;
        var coupon = !string.IsNullOrWhiteSpace(request.CouponCode) ? request.CouponCode : cart.CouponCode;
        if (!string.IsNullOrWhiteSpace(coupon))
        {
            var validation = await _coupons.ValidateAsync(coupon, subtotal, userId, ct);
            if (!validation.Valid) throw new BadRequestException(validation.Message ?? "Invalid coupon");
            discount = validation.Discount;
            couponCode = validation.Code;
        }

        ShippingMethod shippingMethod;
        if (!string.IsNullOrWhiteSpace(request.ShippingMethodId) && ObjectId.TryParse(request.ShippingMethodId, out var shippingId))
        {
            shippingMethod = await _uow.ShippingMethods.FirstOrDefaultAsync(s => s.Id == shippingId && !s.IsDeleted && s.IsActive, ct)
                ?? throw new BadRequestException("Invalid shipping method");
        }
        else
        {
            shippingMethod = await _settings.GetDefaultShippingMethodAsync(ct);
        }

        var shippingCost = subtotal - discount >= settings.FreeShippingThreshold && settings.FreeShippingThreshold > 0
            ? 0m
            : shippingMethod.Cost;
        var tax = Math.Round((subtotal - discount) * settings.TaxRate / 100m, 2);
        var total = Math.Round(subtotal - discount + shippingCost + tax, 2);

        var customerEmail = userId.HasValue ? _currentUser.Email ?? request.GuestEmail : request.GuestEmail;
        if (string.IsNullOrWhiteSpace(customerEmail))
            throw new BadRequestException("Email address is required for guest checkout");
        if (!userId.HasValue && string.IsNullOrWhiteSpace(request.ShippingAddress.FullName))
            throw new BadRequestException("Customer name is required");

        var order = new Order
        {
            OrderNumber = await GenerateOrderNumberAsync(ct),
            UserId = userId,
            CustomerName = request.ShippingAddress.FullName,
            CustomerEmail = customerEmail,
            CustomerPhone = request.ShippingAddress.Phone,
            Items = items,
            ShippingAddress = MapAddress(request.ShippingAddress),
            BillingAddress = request.BillingAddress is null ? null : MapAddress(request.BillingAddress),
            ShippingMethodName = shippingMethod.Name,
            ShippingCost = shippingCost,
            CouponCode = couponCode,
            Subtotal = Math.Round(subtotal, 2),
            Discount = discount,
            TaxAmount = tax,
            Total = total,
            Status = OrderStatus.Pending,
            PaymentMethod = paymentMethod,
            PaymentStatus = PaymentStatus.Pending,
            Notes = request.Notes,
            CreatedBy = _currentUser.UserId
        };
        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = OrderStatus.Pending,
            Note = "Order placed",
            ChangedBy = _currentUser.Email ?? customerEmail
        });

        var committed = new List<(OrderItem Item, Product Product)>();
        try
        {
            foreach (var item in items)
            {
                var product = productLookup[$"{item.ProductId}-{item.VariantId}"];
                var success = await TryDecrementStockAsync(product, item.VariantId, item.Quantity, ct);
                if (!success)
                {
                    var variant = item.VariantId.HasValue ? product.Variants.FirstOrDefault(v => v.Id == item.VariantId.Value) : null;
                    var available = variant?.Stock ?? product.Stock;
                    throw new BadRequestException($"{item.ProductName} only has {available} unit(s) available");
                }
                committed.Add((item, product));
            }
        }
        catch
        {
            foreach (var (item, product) in committed)
                await IncrementStockAsync(product.Id, item.VariantId, item.Quantity, ct);
            throw;
        }

        order.InventoryCommitted = true;

        try
        {
            await _uow.Orders.AddAsync(order, ct);
        }
        catch
        {
            foreach (var (item, product) in committed)
                await IncrementStockAsync(product.Id, item.VariantId, item.Quantity, ct);
            throw;
        }

        if (!string.IsNullOrWhiteSpace(couponCode))
            await _coupons.IncrementUsageAsync(couponCode, ct);

        foreach (var item in items)
        {
            await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
            {
                ProductId = item.ProductId.ToString(),
                VariantId = item.VariantId?.ToString(),
                ProductName = item.ProductName,
                Type = "Order",
                QuantityChange = -item.Quantity,
                StockAfter = 0,
                Reference = order.OrderNumber,
                Note = $"Order {order.OrderNumber}",
                CreatedBy = _currentUser.UserId
            }, ct);
        }

        await _uow.Payments.AddAsync(new Payment
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            UserId = userId,
            Provider = paymentMethod,
            Amount = total,
            Currency = settings.Currency,
            Status = PaymentStatus.Pending,
            CreatedBy = _currentUser.UserId
        }, ct);

        cart.Items.Clear();
        cart.CouponCode = null;
        cart.UpdatedAt = DateTime.UtcNow;
        await _uow.Carts.UpdateAsync(cart, ct);

        if (userId.HasValue)
        {
            await _uow.Notifications.AddAsync(new Notification
            {
                UserId = userId.Value.ToString(),
                Title = "Order placed",
                Message = $"Your order {order.OrderNumber} has been received.",
                Type = "Order",
                Link = $"/account/orders/{order.Id}"
            }, ct);
        }

        if (request.SaveAddress && userId.HasValue)
        {
            var addresses = await _uow.Addresses.FindAsync(a => a.UserId == userId.Value.ToString() && !a.IsDeleted, ct);
            if (addresses.Count == 0)
            {
                var address = MapAddress(request.ShippingAddress);
                await _uow.Addresses.AddAsync(new Address
                {
                    UserId = userId.Value.ToString(),
                    FullName = address.FullName,
                    Phone = address.Phone,
                    Street = address.Street,
                    City = address.City,
                    State = address.State,
                    PostalCode = address.PostalCode,
                    Country = address.Country,
                    IsDefault = true
                }, ct);
            }
        }

        try
        {
            await _email.SendAsync(customerEmail, $"Order {order.OrderNumber} confirmed",
                $"<p>Hi {order.CustomerName},</p><p>Thank you for your order <strong>{order.OrderNumber}</strong>.</p>" +
                $"<p>Total: {settings.CurrencySymbol}{order.Total:0.00}</p>", ct);
        }
        catch
        {
            // Email delivery must not fail the order.
        }

        return order.ToDto();
    }

    public async Task<PagedResult<OrderSummaryDto>> GetMyOrdersAsync(OrderQuery query, CancellationToken ct = default)
    {
        var userId = CurrentUserId ?? throw new UnauthorizedException();
        var filters = new List<FilterDefinition<Order>>
        {
            Builders<Order>.Filter.Eq(o => o.UserId, userId),
            Builders<Order>.Filter.Eq(o => o.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Status))
            filters.Add(Builders<Order>.Filter.Eq(o => o.Status, query.Status));

        var filter = Builders<Order>.Filter.And(filters);
        var total = await _uow.Orders.CountAsync(filter, ct);
        var orders = await _uow.Orders.Collection.Find(filter)
            .Sort(Builders<Order>.Sort.Descending(o => o.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);
        return new PagedResult<OrderSummaryDto>(orders.Select(o => o.ToSummary()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<PagedResult<OrderSummaryDto>> GetAdminOrdersAsync(OrderQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<Order>>
        {
            Builders<Order>.Filter.Eq(o => o.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Status))
            filters.Add(Builders<Order>.Filter.Eq(o => o.Status, query.Status));
        if (!string.IsNullOrWhiteSpace(query.PaymentStatus))
            filters.Add(Builders<Order>.Filter.Eq(o => o.PaymentStatus, query.PaymentStatus));
        if (query.From.HasValue)
            filters.Add(Builders<Order>.Filter.Gte(o => o.CreatedAt, query.From.Value));
        if (query.To.HasValue)
            filters.Add(Builders<Order>.Filter.Lte(o => o.CreatedAt, query.To.Value.AddDays(1)));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(query.Search), "i");
            filters.Add(Builders<Order>.Filter.Or(
                Builders<Order>.Filter.Regex(o => o.OrderNumber, pattern),
                Builders<Order>.Filter.Regex(o => o.CustomerName, pattern),
                Builders<Order>.Filter.Regex(o => o.CustomerEmail, pattern)));
        }

        var filter = Builders<Order>.Filter.And(filters);
        var total = await _uow.Orders.CountAsync(filter, ct);
        var orders = await _uow.Orders.Collection.Find(filter)
            .Sort(Builders<Order>.Sort.Descending(o => o.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);
        return new PagedResult<OrderSummaryDto>(orders.Select(o => o.ToSummary()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<OrderDto> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var order = await FindOrderAsync(id, ct);
        var isAdmin = AppRoles.AdminRoles.Contains(_currentUser.Role ?? string.Empty) ||
                      _currentUser.HasPermission(Permissions.OrdersView);
        if (!isAdmin)
        {
            var userId = CurrentUserId;
            if (!userId.HasValue || order.UserId != userId)
                throw new NotFoundException("Order not found");
        }
        return order.ToDto();
    }

    public async Task<OrderDto> TrackAsync(string orderNumber, string email, CancellationToken ct = default)
    {
        var order = await _uow.Orders.FirstOrDefaultAsync(o =>
            o.OrderNumber == orderNumber.Trim() && !o.IsDeleted, ct);
        if (order is null || !string.Equals(order.CustomerEmail, email.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new NotFoundException("Order not found");
        return order.ToDto();
    }

    public async Task<OrderDto> CancelAsync(string id, CancelOrderRequest request, CancellationToken ct = default)
    {
        var order = await FindOrderAsync(id, ct);
        var isAdmin = AppRoles.AdminRoles.Contains(_currentUser.Role ?? string.Empty) ||
                      _currentUser.HasPermission(Permissions.OrdersManage);
        if (!isAdmin)
        {
            var userId = CurrentUserId;
            if (!userId.HasValue || order.UserId != userId)
                throw new NotFoundException("Order not found");
            if (order.Status is not (OrderStatus.Pending or OrderStatus.Confirmed))
                throw new BadRequestException("This order can no longer be cancelled");
        }

        return await CancelInternalAsync(order, request.Reason, request.RestoreStock, ct);
    }

    public async Task<OrderDto> UpdateStatusAsync(string id, UpdateOrderStatusRequest request, CancellationToken ct = default)
    {
        var order = await FindOrderAsync(id, ct);
        var status = request.Status?.Trim() ?? string.Empty;
        if (!OrderStatus.All.Contains(status))
            throw new BadRequestException("Invalid order status");

        if (order.Status == status) return order.ToDto();
        if (status == OrderStatus.Cancelled)
            return await CancelInternalAsync(order, request.Note ?? "Cancelled by admin", true, ct);
        if (status == OrderStatus.Refunded)
            return await RefundAsync(id, request.Note, ct);

        if (!OrderStatus.AllowedTransitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(status))
            throw new BadRequestException($"Cannot change order status from {order.Status} to {status}");

        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = _currentUser.UserId;
        if (status == OrderStatus.Shipped)
        {
            order.ShippedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.TrackingNumber)) order.TrackingNumber = request.TrackingNumber.Trim();
        }
        if (status == OrderStatus.Completed)
        {
            order.CompletedAt = DateTime.UtcNow;
            if (order.PaymentMethod == PaymentProviders.Cod)
                order.PaymentStatus = PaymentStatus.Paid;
            foreach (var item in order.Items)
            {
                await _uow.Products.UpdateOneAsync(
                    Builders<Product>.Filter.Eq(p => p.Id, item.ProductId),
                    Builders<Product>.Update.Inc(p => p.SoldCount, item.Quantity), ct);
            }
        }
        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = status,
            Note = request.Note,
            ChangedBy = _currentUser.Email
        });
        await _uow.Orders.UpdateAsync(order, ct);
        await NotifyStatusAsync(order, status, ct);
        return order.ToDto();
    }

    public async Task<OrderDto> RefundAsync(string id, string? note, CancellationToken ct = default)
    {
        var order = await FindOrderAsync(id, ct);
        if (order.PaymentStatus != PaymentStatus.Paid && order.Status != OrderStatus.Completed)
            throw new BadRequestException("Only paid orders can be refunded");

        if (!order.StockRestored)
        {
            foreach (var item in order.Items)
                await IncrementStockAsync(item.ProductId, item.VariantId, item.Quantity, ct);
            order.StockRestored = true;
        }

        order.Status = OrderStatus.Refunded;
        order.PaymentStatus = PaymentStatus.Refunded;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = _currentUser.UserId;
        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = OrderStatus.Refunded,
            Note = note ?? "Payment refunded",
            ChangedBy = _currentUser.Email
        });
        await _uow.Orders.UpdateAsync(order, ct);

        await _uow.Payments.UpdateOneAsync(
            Builders<Payment>.Filter.Eq(p => p.OrderId, order.Id),
            Builders<Payment>.Update
                .Set(p => p.Status, PaymentStatus.Refunded)
                .Set(p => p.UpdatedAt, DateTime.UtcNow)
                .Set(p => p.UpdatedBy, _currentUser.UserId), ct);

        await NotifyStatusAsync(order, OrderStatus.Refunded, ct);
        return order.ToDto();
    }

    public async Task<List<PaymentDto>> GetPaymentsAsync(string orderId, CancellationToken ct = default)
    {
        var order = await FindOrderAsync(orderId, ct);
        var isAdmin = AppRoles.AdminRoles.Contains(_currentUser.Role ?? string.Empty) ||
                      _currentUser.HasPermission(Permissions.OrdersView);
        if (!isAdmin && order.UserId != CurrentUserId)
            throw new NotFoundException("Order not found");

        var payments = await _uow.Payments.FindAsync(p => p.OrderId == order.Id && !p.IsDeleted, ct);
        return payments.OrderByDescending(p => p.CreatedAt).Select(p => p.ToDto()).ToList();
    }

    private async Task<OrderDto> CancelInternalAsync(Order order, string? reason, bool restoreStock, CancellationToken ct)
    {
        if (order.Status is OrderStatus.Cancelled or OrderStatus.Refunded or OrderStatus.Completed)
            throw new BadRequestException("This order can no longer be cancelled");

        if (restoreStock && order.InventoryCommitted && !order.StockRestored)
        {
            foreach (var item in order.Items)
            {
                await IncrementStockAsync(item.ProductId, item.VariantId, item.Quantity, ct);
                await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
                {
                    ProductId = item.ProductId.ToString(),
                    VariantId = item.VariantId?.ToString(),
                    ProductName = item.ProductName,
                    Type = "Cancellation",
                    QuantityChange = item.Quantity,
                    Reference = order.OrderNumber,
                    Note = $"Stock restored from cancelled order {order.OrderNumber}",
                    CreatedBy = _currentUser.UserId
                }, ct);
            }
            order.StockRestored = true;
        }

        order.Status = OrderStatus.Cancelled;
        order.CancelledAt = DateTime.UtcNow;
        order.CancellationReason = reason;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = _currentUser.UserId;
        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = OrderStatus.Cancelled,
            Note = reason ?? "Order cancelled",
            ChangedBy = _currentUser.Email
        });
        await _uow.Orders.UpdateAsync(order, ct);

        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            await _uow.Payments.UpdateOneAsync(
                Builders<Payment>.Filter.Eq(p => p.OrderId, order.Id),
                Builders<Payment>.Update.Set(p => p.Status, PaymentStatus.Refunded), ct);
        }

        await NotifyStatusAsync(order, OrderStatus.Cancelled, ct);
        return order.ToDto();
    }

    private async Task NotifyStatusAsync(Order order, string status, CancellationToken ct)
    {
        if (!order.UserId.HasValue) return;
        await _uow.Notifications.AddAsync(new Notification
        {
            UserId = order.UserId.Value.ToString(),
            Title = $"Order {status.ToLowerInvariant()}",
            Message = $"Order {order.OrderNumber} is now {status}.",
            Type = "Order",
            Link = $"/account/orders/{order.Id}"
        }, ct);
    }

    private async Task<bool> TryDecrementStockAsync(Product product, ObjectId? variantId, int quantity, CancellationToken ct)
    {
        if (variantId.HasValue)
        {
            var filter = Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                Builders<Product>.Filter.ElemMatch(p => p.Variants, v => v.Id == variantId.Value && v.Stock >= quantity));
            var update = Builders<Product>.Update.Inc("Variants.$.Stock", -quantity);
            var result = await _uow.Products.Collection.UpdateOneAsync(filter, update, cancellationToken: ct);
            return result.ModifiedCount == 1;
        }

        var rootFilter = Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.Id, product.Id),
            Builders<Product>.Filter.Gte(p => p.Stock, quantity));
        var rootResult = await _uow.Products.Collection.UpdateOneAsync(
            rootFilter, Builders<Product>.Update.Inc(p => p.Stock, -quantity), cancellationToken: ct);
        return rootResult.ModifiedCount == 1;
    }

    private async Task IncrementStockAsync(ObjectId productId, ObjectId? variantId, int quantity, CancellationToken ct)
    {
        if (variantId.HasValue)
        {
            await _uow.Products.Collection.UpdateOneAsync(
                Builders<Product>.Filter.And(
                    Builders<Product>.Filter.Eq(p => p.Id, productId),
                    Builders<Product>.Filter.ElemMatch(p => p.Variants, v => v.Id == variantId.Value)),
                Builders<Product>.Update.Inc("Variants.$.Stock", quantity), cancellationToken: ct);
        }
        else
        {
            await _uow.Products.UpdateOneAsync(
                Builders<Product>.Filter.Eq(p => p.Id, productId),
                Builders<Product>.Update.Inc(p => p.Stock, quantity), ct);
        }
    }

    private async Task<Order> FindOrderAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Order not found");
        return await _uow.Orders.FirstOrDefaultAsync(o => o.Id == objectId && !o.IsDeleted, ct)
            ?? throw new NotFoundException("Order not found");
    }

    private async Task<string> GenerateOrderNumberAsync(CancellationToken ct)
    {
        for (var i = 0; i < 5; i++)
        {
            var number = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{RandomNumberGenerator.GetInt32(100000, 999999)}";
            if (await _uow.Orders.FirstOrDefaultAsync(o => o.OrderNumber == number, ct) is null)
                return number;
        }
        return $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}-{RandomNumberGenerator.GetInt32(1000, 9999)}";
    }

    private static AddressSnapshot MapAddress(AddressInput input) => new()
    {
        FullName = input.FullName.Trim(),
        Phone = input.Phone.Trim(),
        Street = input.Street.Trim(),
        City = input.City.Trim(),
        State = input.State.Trim(),
        PostalCode = input.PostalCode.Trim(),
        Country = input.Country.Trim()
    };

    private static string NormalizePaymentMethod(string? method)
    {
        var normalized = (method ?? PaymentProviders.Cod).Trim();
        if (normalized.Equals("cod", StringComparison.OrdinalIgnoreCase)) return PaymentProviders.Cod;
        if (normalized.Equals("stripe", StringComparison.OrdinalIgnoreCase)) return PaymentProviders.Stripe;
        if (normalized.Equals("sslcommerz", StringComparison.OrdinalIgnoreCase)) return PaymentProviders.SslCommerz;
        throw new BadRequestException("Unsupported payment method");
    }

    private static void ValidatePaymentMethod(string method, WebsiteSettings settings)
    {
        var enabled = method switch
        {
            PaymentProviders.Cod => settings.CodEnabled,
            PaymentProviders.Stripe => settings.StripeEnabled,
            PaymentProviders.SslCommerz => settings.SslCommerzEnabled,
            _ => false
        };
        if (!enabled) throw new BadRequestException("This payment method is not available");
    }

    private ObjectId? CurrentUserId =>
        _currentUser.IsAuthenticated && ObjectId.TryParse(_currentUser.UserId, out var id) ? id : null;
}
