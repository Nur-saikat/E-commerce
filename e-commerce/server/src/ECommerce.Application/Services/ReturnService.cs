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

public class ReturnService
{
    private readonly IUnitOfWork _uow;
    private readonly SettingsService _settings;
    private readonly VoucherService _vouchers;
    private readonly ICurrentUser _currentUser;

    public ReturnService(IUnitOfWork uow, SettingsService settings, VoucherService vouchers, ICurrentUser currentUser)
    {
        _uow = uow;
        _settings = settings;
        _vouchers = vouchers;
        _currentUser = currentUser;
    }

    public async Task<ReturnRequestDto> CreateAsync(CreateReturnRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(userId)) throw new UnauthorizedException();
        if (!ObjectId.TryParse(request.OrderId, out var orderId)) throw new NotFoundException("Order not found");

        var order = await _uow.Orders.FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted, ct)
            ?? throw new NotFoundException("Order not found");
        if (!string.Equals(order.UserId?.ToString(), userId, StringComparison.Ordinal))
            throw new NotFoundException("Order not found");
        if (order.Status != OrderStatus.Completed)
            throw new BadRequestException("Only delivered orders can be returned");
        if (order.PaymentStatus != PaymentStatus.Paid)
            throw new BadRequestException("Only paid orders can be returned");

        if (request.Items is null || request.Items.Count == 0)
            throw new BadRequestException("Select at least one item to return");
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length < 3)
            throw new BadRequestException("A return reason is required");
        if (!RefundDestinations.All.Contains(request.RefundPreference))
            throw new BadRequestException("Choose a valid refund method");

        var settings = await _settings.GetEntityAsync(ct);
        if (request.RefundPreference == RefundDestinations.Voucher && !settings.VoucherPointsEnabled)
            throw new BadRequestException("Voucher point refunds are currently unavailable");

        var accountNumber = request.AccountNumber?.Trim();
        var accountName = request.AccountName?.Trim();
        var bankName = request.BankName?.Trim();
        if (RefundDestinations.IsMobileBanking(request.RefundPreference) && string.IsNullOrWhiteSpace(accountNumber))
            throw new BadRequestException("Enter the mobile banking account number for the refund");
        if (request.RefundPreference == RefundDestinations.BankTransfer &&
            (string.IsNullOrWhiteSpace(accountNumber) || string.IsNullOrWhiteSpace(accountName) || string.IsNullOrWhiteSpace(bankName)))
            throw new BadRequestException("Enter the bank name, account name and account number for the refund");

        var existing = await _uow.ReturnRequests.FindAsync(r => r.OrderId == order.Id && !r.IsDeleted, ct);
        var active = existing.Where(r => r.Status != ReturnStatus.Rejected).ToList();
        var alreadyRequested = active.SelectMany(r => r.Items).ToList();

        var items = new List<ReturnItem>();
        foreach (var requested in request.Items)
        {
            if (!ObjectId.TryParse(requested.ProductId, out var productId))
                throw new BadRequestException("An item in this return is invalid");
            ObjectId? variantId = null;
            if (!string.IsNullOrWhiteSpace(requested.VariantId))
            {
                if (!ObjectId.TryParse(requested.VariantId, out var parsedVariant))
                    throw new BadRequestException("An item in this return is invalid");
                variantId = parsedVariant;
            }
            if (requested.Quantity <= 0)
                throw new BadRequestException("Return quantities must be greater than zero");

            var line = order.Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId)
                ?? throw new BadRequestException("An item in this return does not belong to the order");
            var alreadyQuantity = alreadyRequested
                .Where(i => i.ProductId == productId && i.VariantId == variantId)
                .Sum(i => i.Quantity);
            var remaining = line.Quantity - alreadyQuantity;
            if (requested.Quantity > remaining)
                throw new BadRequestException($"{line.ProductName} has only {remaining} unit(s) available to return");

            var existingRow = items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId);
            if (existingRow is not null)
            {
                existingRow.Quantity += requested.Quantity;
                existingRow.LineTotal = Math.Round(existingRow.UnitPrice * existingRow.Quantity, 2);
                continue;
            }

            items.Add(new ReturnItem
            {
                ProductId = line.ProductId,
                VariantId = line.VariantId,
                ProductName = line.ProductName,
                Sku = line.Sku,
                VariantName = line.VariantName,
                UnitPrice = line.UnitPrice,
                Quantity = requested.Quantity,
                LineTotal = Math.Round(line.UnitPrice * requested.Quantity, 2)
            });
        }

        var itemsTotal = Math.Round(items.Sum(i => i.LineTotal), 2);
        if (order.Subtotal <= 0 || itemsTotal <= 0)
            throw new BadRequestException("The selected items cannot be refunded");

        var discountShare = Math.Round(order.Discount * itemsTotal / order.Subtotal, 2);
        var taxShare = Math.Round(order.TaxAmount * itemsTotal / order.Subtotal, 2);

        var allItemsReturned = order.Items.All(orderItem =>
        {
            var previously = alreadyRequested
                .Where(i => i.ProductId == orderItem.ProductId && i.VariantId == orderItem.VariantId)
                .Sum(i => i.Quantity);
            var now = items
                .Where(i => i.ProductId == orderItem.ProductId && i.VariantId == orderItem.VariantId)
                .Sum(i => i.Quantity);
            return previously + now >= orderItem.Quantity;
        });

        var refundAmount = Math.Round(itemsTotal - discountShare + taxShare + (allItemsReturned ? order.ShippingCost : 0), 2);
        if (refundAmount <= 0) refundAmount = itemsTotal;

        var returnRequest = new ReturnRequest
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            UserId = userId,
            CustomerName = order.CustomerName,
            CustomerEmail = order.CustomerEmail,
            Items = items,
            Reason = request.Reason.Trim(),
            Comment = request.Comment?.Trim(),
            RefundPreference = request.RefundPreference,
            RefundAccountName = accountName,
            RefundAccountNumber = accountNumber,
            RefundBankName = bankName,
            Status = ReturnStatus.Requested,
            RefundAmount = refundAmount,
            RefundPoints = request.RefundPreference == RefundDestinations.Voucher
                ? VoucherService.PointsForAmount(refundAmount, settings)
                : 0,
            CreatedBy = userId
        };
        await _uow.ReturnRequests.AddAsync(returnRequest, ct);

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = order.Status,
            Note = $"Return requested for {items.Sum(i => i.Quantity)} item(s) · {returnRequest.Id}",
            ChangedBy = _currentUser.Email ?? order.CustomerEmail
        });
        await _uow.Orders.UpdateAsync(order, ct);

        await NotifyAsync(order, "Return request received",
            $"Your return for order {order.OrderNumber} is being reviewed.", ct);

        return returnRequest.ToDto();
    }

    public async Task<PagedResult<ReturnRequestDto>> GetMineAsync(ReturnQuery query, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(userId)) throw new UnauthorizedException();

        var filters = new List<FilterDefinition<ReturnRequest>>
        {
            Builders<ReturnRequest>.Filter.Eq(r => r.UserId, userId),
            Builders<ReturnRequest>.Filter.Eq(r => r.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Status))
            filters.Add(Builders<ReturnRequest>.Filter.Eq(r => r.Status, query.Status));
        if (!string.IsNullOrWhiteSpace(query.OrderId) && ObjectId.TryParse(query.OrderId, out var orderId))
            filters.Add(Builders<ReturnRequest>.Filter.Eq(r => r.OrderId, orderId));

        var filter = Builders<ReturnRequest>.Filter.And(filters);
        var total = await _uow.ReturnRequests.CountAsync(filter, ct);
        var items = await _uow.ReturnRequests.Collection.Find(filter)
            .Sort(Builders<ReturnRequest>.Sort.Descending(r => r.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<ReturnRequestDto>(items.Select(r => r.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<PagedResult<ReturnRequestDto>> GetAdminAsync(ReturnQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<ReturnRequest>>
        {
            Builders<ReturnRequest>.Filter.Eq(r => r.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Status))
            filters.Add(Builders<ReturnRequest>.Filter.Eq(r => r.Status, query.Status));
        if (!string.IsNullOrWhiteSpace(query.OrderId) && ObjectId.TryParse(query.OrderId, out var orderId))
            filters.Add(Builders<ReturnRequest>.Filter.Eq(r => r.OrderId, orderId));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<ReturnRequest>.Filter.Or(
                Builders<ReturnRequest>.Filter.Regex(r => r.OrderNumber, pattern),
                Builders<ReturnRequest>.Filter.Regex(r => r.CustomerName, pattern),
                Builders<ReturnRequest>.Filter.Regex(r => r.CustomerEmail, pattern)));
        }

        var filter = Builders<ReturnRequest>.Filter.And(filters);
        var total = await _uow.ReturnRequests.CountAsync(filter, ct);
        var items = await _uow.ReturnRequests.Collection.Find(filter)
            .Sort(Builders<ReturnRequest>.Sort.Descending(r => r.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<ReturnRequestDto>(items.Select(r => r.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<ReturnRequestDto> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var returnRequest = await FindAsync(id, ct);
        var isAdmin = AppRoles.AdminRoles.Contains(_currentUser.Role ?? string.Empty) ||
                      _currentUser.HasPermission(Permissions.OrdersView);
        if (!isAdmin && !string.Equals(returnRequest.UserId, _currentUser.UserId, StringComparison.Ordinal))
            throw new NotFoundException("Return request not found");
        return returnRequest.ToDto();
    }

    public async Task<ReturnRequestDto> UpdateStatusAsync(string id, UpdateReturnStatusRequest request, CancellationToken ct = default)
    {
        var returnRequest = await FindAsync(id, ct);
        var status = request.Status?.Trim() ?? string.Empty;
        if (!ReturnStatus.All.Contains(status))
            throw new BadRequestException("Invalid return status");
        if (returnRequest.Status == status) return returnRequest.ToDto();
        if (!ReturnStatus.AllowedTransitions.TryGetValue(returnRequest.Status, out var allowed) || !allowed.Contains(status))
            throw new BadRequestException($"Cannot change return status from {returnRequest.Status} to {status}");

        var order = await _uow.Orders.FirstOrDefaultAsync(o => o.Id == returnRequest.OrderId && !o.IsDeleted, ct)
            ?? throw new NotFoundException("Order not found");

        if (!string.IsNullOrWhiteSpace(request.AdminNote))
            returnRequest.AdminNote = request.AdminNote.Trim();

        if (status == ReturnStatus.Refunded)
        {
            await ProcessRefundAsync(returnRequest, order, request, ct);
        }

        returnRequest.Status = status;
        returnRequest.ProcessedAt = DateTime.UtcNow;
        returnRequest.ProcessedBy = _currentUser.Email ?? _currentUser.UserId;
        returnRequest.UpdatedAt = DateTime.UtcNow;
        returnRequest.UpdatedBy = _currentUser.UserId;
        await _uow.ReturnRequests.UpdateAsync(returnRequest, ct);

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = order.Status,
            Note = $"Return {status.ToLowerInvariant()} · {returnRequest.Id}" +
                   (status == ReturnStatus.Refunded ? $" · {returnRequest.RefundAmount:0.00} refunded" : string.Empty),
            ChangedBy = _currentUser.Email ?? "support"
        });
        await _uow.Orders.UpdateAsync(order, ct);

        await NotifyAsync(order, $"Return {status.ToLowerInvariant()}",
            $"The return for order {order.OrderNumber} is now {status}.", ct);

        return returnRequest.ToDto();
    }

    private async Task ProcessRefundAsync(ReturnRequest returnRequest, Order order, UpdateReturnStatusRequest request,
        CancellationToken ct)
    {
        var destination = string.IsNullOrWhiteSpace(request.Destination)
            ? returnRequest.RefundPreference
            : request.Destination.Trim();
        if (!RefundDestinations.All.Contains(destination))
            throw new BadRequestException("Choose a valid refund method");

        var settings = await _settings.GetEntityAsync(ct);
        if (destination == RefundDestinations.Voucher && !order.UserId.HasValue)
            throw new BadRequestException("Voucher point refunds require a registered customer account");

        var gross = order.Subtotal - order.Discount + order.TaxAmount + order.ShippingCost;
        var paidFactor = gross > 0 ? Math.Min(1m, order.Total / gross) : 1m;
        var cashRefund = Math.Round(returnRequest.RefundAmount * paidFactor, 2);
        if (cashRefund < 0) cashRefund = 0;

        var returnedQuantity = returnRequest.Items.Sum(i => i.Quantity);
        var orderQuantity = order.Items.Sum(i => i.Quantity);
        var pointsReturned = orderQuantity > 0
            ? (int)Math.Floor(order.PointsRedeemed * (decimal)returnedQuantity / orderQuantity)
            : 0;

        var pointsToCredit = pointsReturned;
        if (destination == RefundDestinations.Voucher)
            pointsToCredit += VoucherService.PointsForAmount(cashRefund, settings);

        if (pointsToCredit > 0)
        {
            await _vouchers.CreditAsync(
                order.UserId!.Value.ToString(),
                order.CustomerEmail,
                pointsToCredit,
                VoucherTransactionTypes.Refund,
                order.Id.ToString(),
                order.OrderNumber,
                $"Refund for {returnRequest.Items.Sum(i => i.Quantity)} returned item(s)",
                ct);
        }

        returnRequest.RefundMethod = destination;
        returnRequest.RefundAmount = cashRefund;
        returnRequest.RefundPoints = pointsToCredit;
        returnRequest.RefundReference = request.Reference?.Trim();
        if (!string.IsNullOrWhiteSpace(request.AccountNumber))
            returnRequest.RefundAccountNumber = request.AccountNumber.Trim();
        if (!string.IsNullOrWhiteSpace(request.AccountName))
            returnRequest.RefundAccountName = request.AccountName.Trim();
        if (!string.IsNullOrWhiteSpace(request.BankName))
            returnRequest.RefundBankName = request.BankName.Trim();

        if (!returnRequest.StockRestored)
        {
            foreach (var item in returnRequest.Items)
            {
                await RestoreStockAsync(item, ct);
                await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
                {
                    ProductId = item.ProductId.ToString(),
                    VariantId = item.VariantId?.ToString(),
                    ProductName = item.ProductName,
                    Type = "Return",
                    QuantityChange = item.Quantity,
                    Reference = order.OrderNumber,
                    Note = $"Returned from order {order.OrderNumber}",
                    CreatedBy = _currentUser.UserId
                }, ct);
            }
            returnRequest.StockRestored = true;
        }

        order.RefundedAmount = Math.Round(order.RefundedAmount + cashRefund, 2);
        order.RefundMethod = destination;
        order.RefundReference = request.Reference?.Trim() ?? order.RefundReference;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = _currentUser.UserId;

        var allReturned = await AllItemsReturnedAsync(order, returnRequest, ct);
        if (allReturned)
        {
            order.Status = OrderStatus.Refunded;
            order.PaymentStatus = PaymentStatus.Refunded;
            order.RefundedAt = DateTime.UtcNow;
            await _uow.Payments.UpdateOneAsync(
                Builders<Payment>.Filter.Eq(p => p.OrderId, order.Id),
                Builders<Payment>.Update
                    .Set(p => p.Status, PaymentStatus.Refunded)
                    .Set(p => p.UpdatedAt, DateTime.UtcNow)
                    .Set(p => p.UpdatedBy, _currentUser.UserId), ct);
        }
    }

    private async Task<bool> AllItemsReturnedAsync(Order order, ReturnRequest current, CancellationToken ct)
    {
        var all = await _uow.ReturnRequests.FindAsync(r =>
            r.OrderId == order.Id && r.Status == ReturnStatus.Refunded && !r.IsDeleted, ct);
        var returned = all.SelectMany(r => r.Items).ToList();
        if (current.Status != ReturnStatus.Refunded)
            returned.AddRange(current.Items);

        return order.Items.All(orderItem =>
        {
            var quantity = returned
                .Where(i => i.ProductId == orderItem.ProductId && i.VariantId == orderItem.VariantId)
                .Sum(i => i.Quantity);
            return quantity >= orderItem.Quantity;
        });
    }

    private async Task RestoreStockAsync(ReturnItem item, CancellationToken ct)
    {
        if (item.VariantId.HasValue)
        {
            await _uow.Products.Collection.UpdateOneAsync(
                Builders<Product>.Filter.And(
                    Builders<Product>.Filter.Eq(p => p.Id, item.ProductId),
                    Builders<Product>.Filter.ElemMatch(p => p.Variants, v => v.Id == item.VariantId.Value)),
                Builders<Product>.Update.Inc("Variants.$.Stock", item.Quantity), cancellationToken: ct);
            return;
        }

        await _uow.Products.UpdateOneAsync(
            Builders<Product>.Filter.Eq(p => p.Id, item.ProductId),
            Builders<Product>.Update.Inc(p => p.Stock, item.Quantity), ct);
    }

    private async Task NotifyAsync(Order order, string title, string message, CancellationToken ct)
    {
        if (!order.UserId.HasValue) return;
        await _uow.Notifications.AddAsync(new Notification
        {
            UserId = order.UserId.Value.ToString(),
            Title = title,
            Message = message,
            Type = "Return",
            Link = $"/account/orders/{order.Id}"
        }, ct);
    }

    private async Task<ReturnRequest> FindAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Return request not found");
        return await _uow.ReturnRequests.FirstOrDefaultAsync(r => r.Id == objectId && !r.IsDeleted, ct)
            ?? throw new NotFoundException("Return request not found");
    }
}
