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

public class AdminService
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUser _currentUser;

    public AdminService(IUnitOfWork uow, ICurrentUser currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<DashboardDto> GetDashboardAsync(CancellationToken ct = default)
    {
        var orders = _uow.Orders.Collection;
        var activeOrdersMatch = new BsonDocument
        {
            { "IsDeleted", false },
            { "Status", new BsonDocument("$nin", new BsonArray { OrderStatus.Cancelled, OrderStatus.Refunded }) }
        };
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var todayStart = now.Date;
        var chartStart = todayStart.AddDays(-29);

        var revenueCursor = await orders.AggregateAsync<BsonDocument>(new[]
        {
            new BsonDocument("$match", activeOrdersMatch),
            new BsonDocument("$group", new BsonDocument { { "_id", BsonNull.Value }, { "total", new BsonDocument("$sum", "$Total") } })
        }, cancellationToken: ct);
        var revenueDoc = await revenueCursor.FirstOrDefaultAsync(ct);
        var totalRevenue = revenueDoc is null ? 0 : ToDecimal(revenueDoc.GetValue("total", 0));

        var monthRevenueCursor = await orders.AggregateAsync<BsonDocument>(new[]
        {
            new BsonDocument("$match", activeOrdersMatch.DeepClone().AsBsonDocument.Add("CreatedAt", new BsonDocument("$gte", monthStart))),
            new BsonDocument("$group", new BsonDocument { { "_id", BsonNull.Value }, { "total", new BsonDocument("$sum", "$Total") } })
        }, cancellationToken: ct);
        var monthRevenueDoc = await monthRevenueCursor.FirstOrDefaultAsync(ct);

        var todayRevenueCursor = await orders.AggregateAsync<BsonDocument>(new[]
        {
            new BsonDocument("$match", activeOrdersMatch.DeepClone().AsBsonDocument.Add("CreatedAt", new BsonDocument("$gte", todayStart))),
            new BsonDocument("$group", new BsonDocument { { "_id", BsonNull.Value }, { "total", new BsonDocument("$sum", "$Total") } })
        }, cancellationToken: ct);
        var todayRevenueDoc = await todayRevenueCursor.FirstOrDefaultAsync(ct);

        var stats = new DashboardStatsDto
        {
            TotalRevenue = totalRevenue,
            TotalOrders = (int)await _uow.Orders.CountAsync(Builders<Order>.Filter.Eq(o => o.IsDeleted, false), ct),
            TotalCustomers = (int)await _uow.Users.CountAsync(Builders<User>.Filter.And(
                Builders<User>.Filter.Eq(u => u.Role, AppRoles.Customer),
                Builders<User>.Filter.Eq(u => u.IsDeleted, false)), ct),
            TotalProducts = (int)await _uow.Products.CountAsync(Builders<Product>.Filter.Eq(p => p.IsDeleted, false), ct),
            PendingOrders = (int)await _uow.Orders.CountAsync(OrderStatusFilter(OrderStatus.Pending), ct),
            CompletedOrders = (int)await _uow.Orders.CountAsync(OrderStatusFilter(OrderStatus.Completed), ct),
            CancelledOrders = (int)await _uow.Orders.CountAsync(OrderStatusFilter(OrderStatus.Cancelled), ct),
            LowStockProducts = (int)await _uow.Products.CountAsync(LowStockFilter(), ct),
            RevenueThisMonth = monthRevenueDoc is null ? 0 : ToDecimal(monthRevenueDoc.GetValue("total", 0)),
            RevenueToday = todayRevenueDoc is null ? 0 : ToDecimal(todayRevenueDoc.GetValue("total", 0)),
            OrdersToday = (int)await _uow.Orders.CountAsync(Builders<Order>.Filter.And(
                Builders<Order>.Filter.Eq(o => o.IsDeleted, false),
                Builders<Order>.Filter.Gte(o => o.CreatedAt, todayStart)), ct)
        };

        var chart = await GetSalesPointsAsync(activeOrdersMatch, chartStart, todayStart.AddDays(1), ct);
        var topProducts = await GetTopProductsAsync(activeOrdersMatch, 5, ct);
        var byCategory = await GetCategorySalesAsync(activeOrdersMatch, 6, ct);

        var lowStockProducts = await _uow.Products.Collection.Find(LowStockFilter())
            .Limit(8).ToListAsync(ct);
        var recentOrders = await _uow.Orders.Collection.Find(
                Builders<Order>.Filter.Eq(o => o.IsDeleted, false))
            .Sort(Builders<Order>.Sort.Descending(o => o.CreatedAt)).Limit(8).ToListAsync(ct);

        return new DashboardDto
        {
            Stats = stats,
            SalesChart = chart,
            TopProducts = topProducts,
            LowStockProducts = lowStockProducts.Select(p => new LowStockItemDto
            {
                ProductId = p.Id.ToString(),
                Name = p.Name,
                Sku = p.Sku,
                Stock = p.TotalStock,
                LowStockThreshold = p.LowStockThreshold
            }).ToList(),
            RecentOrders = recentOrders.Select(o => o.ToSummary()).ToList(),
            SalesByCategory = byCategory
        };
    }

    public async Task<SalesReportDto> GetSalesReportAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var end = (to ?? DateTime.UtcNow.Date).Date;
        var start = (from ?? end.AddDays(-29)).Date;
        if (start > end) throw new BadRequestException("The start date must be before the end date");

        var match = new BsonDocument
        {
            { "IsDeleted", false },
            { "Status", new BsonDocument("$nin", new BsonArray { OrderStatus.Cancelled, OrderStatus.Refunded }) },
            { "CreatedAt", new BsonDocument { { "$gte", start }, { "$lt", end.AddDays(1) } } }
        };
        var points = await GetSalesPointsAsync(match, start, end.AddDays(1), ct);
        var revenue = points.Sum(p => p.Revenue);
        var orders = points.Sum(p => p.Orders);

        return new SalesReportDto
        {
            From = start,
            To = end,
            Revenue = revenue,
            Orders = orders,
            AverageOrderValue = orders == 0 ? 0 : Math.Round(revenue / orders, 2),
            Points = points,
            TopProducts = await GetTopProductsAsync(match, 10, ct),
            ByCategory = await GetCategorySalesAsync(match, 10, ct)
        };
    }

    public async Task<OrderReportDto> GetOrderReportAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var end = (to ?? DateTime.UtcNow.Date).Date;
        var start = (from ?? end.AddDays(-29)).Date;
        if (start > end) throw new BadRequestException("The start date must be before the end date");

        var filter = Builders<Order>.Filter.And(
            Builders<Order>.Filter.Eq(o => o.IsDeleted, false),
            Builders<Order>.Filter.Gte(o => o.CreatedAt, start),
            Builders<Order>.Filter.Lt(o => o.CreatedAt, end.AddDays(1)));
        var orders = await _uow.Orders.FindAsync(filter, ct: ct);

        var points = await GetSalesPointsAsync(new BsonDocument
        {
            { "IsDeleted", false },
            { "CreatedAt", new BsonDocument { { "$gte", start }, { "$lt", end.AddDays(1) } } }
        }, start, end.AddDays(1), ct);

        return new OrderReportDto
        {
            From = start,
            To = end,
            TotalOrders = orders.Count,
            TotalValue = orders.Where(o => o.Status is not (OrderStatus.Cancelled or OrderStatus.Refunded))
                .Sum(o => o.Total),
            ByStatus = OrderStatus.All.ToDictionary(s => s, s => orders.Count(o => o.Status == s)),
            Points = points
        };
    }

    public async Task<PagedResult<CustomerDto>> GetCustomersAsync(CustomerQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<User>>
        {
            Builders<User>.Filter.Eq(u => u.Role, AppRoles.Customer),
            Builders<User>.Filter.Eq(u => u.IsDeleted, false)
        };
        if (query.ActiveOnly) filters.Add(Builders<User>.Filter.Eq(u => u.IsActive, true));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<User>.Filter.Or(
                Builders<User>.Filter.Regex(u => u.Email, pattern),
                Builders<User>.Filter.Regex(u => u.FirstName, pattern),
                Builders<User>.Filter.Regex(u => u.LastName, pattern)));
        }

        var filter = Builders<User>.Filter.And(filters);
        var total = await _uow.Users.CountAsync(filter, ct);
        var users = await _uow.Users.Collection.Find(filter)
            .Sort(Builders<User>.Sort.Descending(u => u.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);

        var stats = new Dictionary<ObjectId, (int Orders, decimal Spent)>();
        if (users.Count > 0)
        {
            var ids = users.Select(u => u.Id).ToList();
            var cursor = await _uow.Orders.Collection.AggregateAsync<BsonDocument>(new[]
            {
                new BsonDocument("$match", new BsonDocument
                {
                    { "UserId", new BsonDocument("$in", new BsonArray(ids)) },
                    { "IsDeleted", false },
                    { "Status", new BsonDocument("$nin", new BsonArray { OrderStatus.Cancelled, OrderStatus.Refunded }) }
                }),
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$UserId" },
                    { "count", new BsonDocument("$sum", 1) },
                    { "spent", new BsonDocument("$sum", "$Total") }
                })
            }, cancellationToken: ct);
            foreach (var doc in await cursor.ToListAsync(ct))
                stats[doc["_id"].AsObjectId] = (doc["count"].ToInt32(), ToDecimal(doc.GetValue("spent", 0)));
        }

        var items = users.Select(u => new CustomerDto
        {
            Id = u.Id.ToString(),
            FirstName = u.FirstName,
            LastName = u.LastName,
            Email = u.Email,
            Phone = u.Phone,
            Role = u.Role,
            IsActive = u.IsActive,
            EmailVerified = u.EmailVerified,
            CreatedAt = u.CreatedAt,
            LastLoginAt = u.LastLoginAt,
            OrderCount = stats.GetValueOrDefault(u.Id).Orders,
            TotalSpent = stats.GetValueOrDefault(u.Id).Spent
        }).ToList();

        return new PagedResult<CustomerDto>(items, total, query.Page, query.PageSize);
    }

    public async Task<CustomerDto> UpdateCustomerAsync(string id, UpdateCustomerRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Customer not found");
        var user = await _uow.Users.FirstOrDefaultAsync(u => u.Id == objectId && !u.IsDeleted, ct)
            ?? throw new NotFoundException("Customer not found");

        if (!string.IsNullOrWhiteSpace(request.Role) && request.Role != user.Role)
        {
            if (_currentUser.Role != AppRoles.SuperAdmin)
                throw new ForbiddenException("Only a super admin can change user roles");
            if (!AppRoles.AdminRoles.Contains(request.Role) && request.Role != AppRoles.Customer)
                throw new BadRequestException("Invalid role");
            user.Role = request.Role;
            var role = await _uow.Roles.FirstOrDefaultAsync(r => r.Name == request.Role && !r.IsDeleted, ct);
            user.Permissions = role?.Permissions ??
                Permissions.RoleDefaults.GetValueOrDefault(request.Role, Array.Empty<string>()).ToList();
            foreach (var token in user.RefreshTokens) token.RevokedAt ??= DateTime.UtcNow;
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Phone = request.Phone;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = _currentUser.UserId;
        await _uow.Users.UpdateAsync(user, ct);

        var stats = await _uow.Orders.Collection.AggregateAsync<BsonDocument>(new[]
        {
            new BsonDocument("$match", new BsonDocument
            {
                { "UserId", user.Id },
                { "Status", new BsonDocument("$nin", new BsonArray { OrderStatus.Cancelled, OrderStatus.Refunded }) }
            }),
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", BsonNull.Value },
                { "count", new BsonDocument("$sum", 1) },
                { "spent", new BsonDocument("$sum", "$Total") }
            })
        }, cancellationToken: ct);
        var stat = await stats.FirstOrDefaultAsync(ct);

        return new CustomerDto
        {
            Id = user.Id.ToString(),
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            IsActive = user.IsActive,
            EmailVerified = user.EmailVerified,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            OrderCount = stat is null ? 0 : stat["count"].ToInt32(),
            TotalSpent = stat is null ? 0 : ToDecimal(stat.GetValue("spent", 0))
        };
    }

    public async Task<PagedResult<InventoryItemDto>> GetInventoryAsync(InventoryQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<Product>>
        {
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Regex(p => p.Name, pattern),
                Builders<Product>.Filter.Regex(p => p.Sku, pattern)));
        }
        if (query.LowStockOnly) filters.Add(LowStockFilter());
        if (query.OutOfStockOnly)
            filters.Add(new BsonDocument("$expr", new BsonDocument("$eq", new BsonArray
            {
                new BsonDocument("$add", new BsonArray { "$stock", new BsonDocument("$sum", "$variants.stock") }),
                0
            })));

        var filter = Builders<Product>.Filter.And(filters);
        var total = await _uow.Products.CountAsync(filter, ct);
        var products = await _uow.Products.Collection.Find(filter)
            .Sort(Builders<Product>.Sort.Ascending(p => p.Stock))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);

        var categoryIds = products.Select(p => p.CategoryId).Distinct().ToList();
        var categories = categoryIds.Count == 0 ? new List<Category>() :
            await _uow.Categories.FindAsync(c => categoryIds.Contains(c.Id), ct);
        var categoryMap = categories.ToDictionary(c => c.Id, c => c.Name);

        var items = products.Select(p => new InventoryItemDto
        {
            ProductId = p.Id.ToString(),
            Name = p.Name,
            Sku = p.Sku,
            CategoryName = categoryMap.GetValueOrDefault(p.CategoryId),
            Stock = p.Stock,
            LowStockThreshold = p.LowStockThreshold,
            TotalStock = p.TotalStock,
            CostPrice = p.CostPrice,
            Status = p.TotalStock <= 0 ? "OutOfStock" : p.TotalStock <= p.LowStockThreshold ? "LowStock" : "InStock",
            Variants = p.Variants.Select(v => new InventoryVariantDto
            {
                Id = v.Id.ToString(),
                Name = v.Name,
                Sku = v.Sku,
                Stock = v.Stock
            }).ToList()
        }).ToList();

        return new PagedResult<InventoryItemDto>(items, total, query.Page, query.PageSize);
    }

    public async Task<InventoryItemDto> AdjustStockAsync(string productId, StockAdjustmentRequest request, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(productId, out var objectId)) throw new NotFoundException("Product not found");
        if (request.QuantityChange == 0) throw new BadRequestException("Quantity change cannot be zero");

        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == objectId && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Product not found");

        int stockAfter;
        if (!string.IsNullOrWhiteSpace(request.VariantId))
        {
            if (!ObjectId.TryParse(request.VariantId, out var variantId))
                throw new BadRequestException("Invalid variant");
            var variant = product.Variants.FirstOrDefault(v => v.Id == variantId)
                ?? throw new NotFoundException("Variant not found");
            if (variant.Stock + request.QuantityChange < 0)
                throw new BadRequestException("Stock cannot be negative");

            var filter = Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                Builders<Product>.Filter.ElemMatch(p => p.Variants, v => v.Id == variantId));
            await _uow.Products.Collection.UpdateOneAsync(
                filter, Builders<Product>.Update.Inc("Variants.$.Stock", request.QuantityChange), cancellationToken: ct);
            stockAfter = variant.Stock + request.QuantityChange;
        }
        else
        {
            if (product.Stock + request.QuantityChange < 0)
                throw new BadRequestException("Stock cannot be negative");
            await _uow.Products.UpdateOneAsync(
                Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                Builders<Product>.Update.Inc(p => p.Stock, request.QuantityChange), ct);
            stockAfter = product.Stock + request.QuantityChange;
        }

        await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
        {
            ProductId = product.Id.ToString(),
            VariantId = request.VariantId,
            ProductName = product.Name,
            Type = string.IsNullOrWhiteSpace(request.Type) ? "Adjustment" : request.Type,
            QuantityChange = request.QuantityChange,
            StockAfter = stockAfter,
            Note = request.Note,
            CreatedBy = _currentUser.UserId
        }, ct);

        var updated = await _uow.Products.GetByIdAsync(product.Id, ct) ?? product;
        return new InventoryItemDto
        {
            ProductId = updated.Id.ToString(),
            Name = updated.Name,
            Sku = updated.Sku,
            Stock = updated.Stock,
            LowStockThreshold = updated.LowStockThreshold,
            TotalStock = updated.TotalStock,
            CostPrice = updated.CostPrice,
            Status = updated.TotalStock <= 0 ? "OutOfStock" : updated.TotalStock <= updated.LowStockThreshold ? "LowStock" : "InStock",
            Variants = updated.Variants.Select(v => new InventoryVariantDto
            {
                Id = v.Id.ToString(),
                Name = v.Name,
                Sku = v.Sku,
                Stock = v.Stock
            }).ToList()
        };
    }

    public async Task<PagedResult<InventoryTransactionDto>> GetInventoryTransactionsAsync(PagedQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<InventoryTransaction>>
        {
            Builders<InventoryTransaction>.Filter.Eq(t => t.IsDeleted, false)
        };
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<InventoryTransaction>.Filter.Or(
                Builders<InventoryTransaction>.Filter.Regex(t => t.ProductName, pattern),
                Builders<InventoryTransaction>.Filter.Regex(t => t.Reference, pattern)));
        }
        var filter = Builders<InventoryTransaction>.Filter.And(filters);
        var total = await _uow.InventoryTransactions.CountAsync(filter, ct);
        var transactions = await _uow.InventoryTransactions.Collection.Find(filter)
            .Sort(Builders<InventoryTransaction>.Sort.Descending(t => t.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);
        return new PagedResult<InventoryTransactionDto>(
            transactions.Select(t => t.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<List<AuditLogDto>> GetAuditLogsAsync(PagedQuery query, CancellationToken ct = default)
    {
        var filter = Builders<AuditLog>.Filter.Eq(a => a.IsDeleted, false);
        var logs = await _uow.AuditLogs.Collection.Find(filter)
            .Sort(Builders<AuditLog>.Sort.Descending(a => a.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);
        return logs.Select(l => new AuditLogDto
        {
            Id = l.Id.ToString(),
            UserEmail = l.UserEmail,
            Action = l.Action,
            Entity = l.Entity,
            EntityId = l.EntityId,
            IpAddress = l.IpAddress,
            CreatedAt = l.CreatedAt
        }).ToList();
    }

    public async Task<List<RoleDto>> GetRolesAsync(CancellationToken ct = default)
    {
        var roles = await _uow.Roles.FindAsync(r => !r.IsDeleted, ct);
        var visible = DelegablePermissions();
        return roles.OrderBy(r => r.Name).Select(r => new RoleDto
        {
            Id = r.Id.ToString(),
            Name = r.Name,
            Description = r.Description,
            Permissions = r.Permissions.Where(p => visible.Contains(p)).ToList(),
            IsSystem = r.IsSystem
        }).ToList();
    }

    public async Task<List<PermissionDto>> GetPermissionsAsync(CancellationToken ct = default)
    {
        var visible = DelegablePermissions();
        var permissions = await _uow.Permissions.FindAsync(p => !p.IsDeleted, ct);
        if (permissions.Count == 0)
        {
            return Permissions.All.Select(p => new PermissionDto
            {
                Key = p,
                Name = p.Split('.')[1],
                Group = p.Split('.')[0],
                Description = $"Allows {p.Split('.')[1]} access for {p.Split('.')[0]}"
            }).Where(p => visible.Contains(p.Key)).ToList();
        }
        return permissions.Select(p => new PermissionDto
        {
            Key = p.Key,
            Name = p.Name,
            Group = p.Group,
            Description = p.Description
        }).Where(p => visible.Contains(p.Key)).ToList();
    }

    public async Task<RoleDto> UpdateRolePermissionsAsync(string roleName, List<string> permissions, CancellationToken ct = default)
    {
        var role = await _uow.Roles.FirstOrDefaultAsync(r => r.Name == roleName && !r.IsDeleted, ct)
            ?? throw new NotFoundException("Role not found");
        if (role.Name == AppRoles.SuperAdmin)
            throw new ForbiddenException("Super admin permissions cannot be modified");

        // Customer permissions deliberately stay at their defaults; storefront access is
        // authenticated separately and granting admin permissions here would escalate customers.
        if (role.Name == AppRoles.Customer)
            throw new ForbiddenException("Customer permissions are fixed at the default set");

        var visible = DelegablePermissions();
        var requested = (permissions ?? new List<string>())
            .Select(p => Permissions.All.FirstOrDefault(known => string.Equals(known, p, StringComparison.OrdinalIgnoreCase)))
            .Where(p => p is not null)
            .Select(p => p!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (_currentUser.Role != AppRoles.SuperAdmin)
        {
            var escalated = requested.Where(p => !visible.Contains(p)).ToList();
            if (escalated.Count > 0)
                throw new ForbiddenException(
                    $"You can only grant permissions you hold yourself: {string.Join(", ", escalated)}");
        }

        // Permissions the actor cannot see are preserved, so a limited admin can neither grant
        // nor strip access beyond their own permission set.
        var preserved = role.Permissions.Where(p => !visible.Contains(p)).ToList();
        role.Permissions = preserved
            .Concat(requested)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        role.UpdatedAt = DateTime.UtcNow;
        role.UpdatedBy = _currentUser.UserId;
        await _uow.Roles.UpdateAsync(role, ct);

        return new RoleDto
        {
            Id = role.Id.ToString(),
            Name = role.Name,
            Description = role.Description,
            Permissions = role.Permissions.Where(p => visible.Contains(p)).ToList(),
            IsSystem = role.IsSystem
        };
    }

    private HashSet<string> DelegablePermissions() =>
        _currentUser.Role == AppRoles.SuperAdmin
            ? new HashSet<string>(Permissions.All, StringComparer.OrdinalIgnoreCase)
            : _currentUser.Permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static FilterDefinition<Order> OrderStatusFilter(string status) =>
        Builders<Order>.Filter.And(
            Builders<Order>.Filter.Eq(o => o.IsDeleted, false),
            Builders<Order>.Filter.Eq(o => o.Status, status));

    private static FilterDefinition<Product> LowStockFilter() => new BsonDocument
    {
        { "IsDeleted", false },
        { "$expr", new BsonDocument("$lte", new BsonArray
            {
                new BsonDocument("$add", new BsonArray { "$stock", new BsonDocument("$sum", "$variants.stock") }),
                "$lowStockThreshold"
            })
        }
    };

    private async Task<List<SalesPointDto>> GetSalesPointsAsync(BsonDocument match, DateTime start, DateTime end, CancellationToken ct)
    {
        var pipeline = new[]
        {
            new BsonDocument("$match", match),
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", new BsonDocument("$dateToString", new BsonDocument
                    {
                        { "format", "%Y-%m-%d" },
                        { "date", "$CreatedAt" }
                    })
                },
                { "revenue", new BsonDocument("$sum", "$Total") },
                { "orders", new BsonDocument("$sum", 1) }
            }),
            new BsonDocument("$sort", new BsonDocument("_id", 1))
        };

        var cursor = await _uow.Orders.Collection.AggregateAsync<BsonDocument>(pipeline, cancellationToken: ct);
        var rows = await cursor.ToListAsync(ct);
        var map = rows.ToDictionary(
            r => r["_id"].AsString,
            r => (Revenue: ToDecimal(r.GetValue("revenue", 0)), Orders: r["orders"].ToInt32()));

        var points = new List<SalesPointDto>();
        for (var day = start.Date; day < end.Date; day = day.AddDays(1))
        {
            var key = day.ToString("yyyy-MM-dd");
            var row = map.GetValueOrDefault(key);
            points.Add(new SalesPointDto
            {
                Date = key,
                Revenue = row.Revenue,
                Orders = row.Orders
            });
        }
        return points;
    }

    private async Task<List<TopProductDto>> GetTopProductsAsync(BsonDocument match, int limit, CancellationToken ct)
    {
        var pipeline = new[]
        {
            new BsonDocument("$match", match),
            new BsonDocument("$unwind", "$Items"),
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", "$Items.ProductId" },
                { "name", new BsonDocument("$first", "$Items.ProductName") },
                { "image", new BsonDocument("$first", "$Items.ImageUrl") },
                { "qty", new BsonDocument("$sum", "$Items.Quantity") },
                { "revenue", new BsonDocument("$sum", "$Items.LineTotal") }
            }),
            new BsonDocument("$sort", new BsonDocument("qty", -1)),
            new BsonDocument("$limit", limit),
            new BsonDocument("$lookup", new BsonDocument
            {
                { "from", "Products" },
                { "localField", "_id" },
                { "foreignField", "_id" },
                { "as", "product" }
            }),
            new BsonDocument("$unwind", new BsonDocument
            {
                { "path", "$product" },
                { "preserveNullAndEmptyArrays", true }
            }),
            new BsonDocument("$project", new BsonDocument
            {
                { "_id", 0 },
                { "ProductId", new BsonDocument("$toString", "$_id") },
                { "Name", new BsonDocument("$ifNull", new BsonArray { "$product.Name", "$name" }) },
                { "ThumbnailUrl", new BsonDocument("$ifNull", new BsonArray { "$product.ThumbnailUrl", "$image" }) },
                { "SoldCount", "$qty" },
                { "Revenue", "$revenue" }
            })
        };
        var cursor = await _uow.Orders.Collection.AggregateAsync<BsonDocument>(pipeline, cancellationToken: ct);
        return (await cursor.ToListAsync(ct)).Select(d => new TopProductDto
        {
            ProductId = d.GetValue("ProductId").AsString,
            Name = d.GetValue("Name", string.Empty).AsString,
            ThumbnailUrl = d.Contains("ThumbnailUrl") && !d["ThumbnailUrl"].IsBsonNull ? d["ThumbnailUrl"].AsString : null,
            SoldCount = d.GetValue("SoldCount", 0).ToInt32(),
            Revenue = ToDecimal(d.GetValue("Revenue", 0))
        }).ToList();
    }

    private async Task<List<CategorySalesDto>> GetCategorySalesAsync(BsonDocument match, int limit, CancellationToken ct)
    {
        var pipeline = new[]
        {
            new BsonDocument("$match", match),
            new BsonDocument("$unwind", "$Items"),
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", "$Items.ProductId" },
                { "revenue", new BsonDocument("$sum", "$Items.LineTotal") }
            }),
            new BsonDocument("$lookup", new BsonDocument
            {
                { "from", "Products" }, { "localField", "_id" }, { "foreignField", "_id" }, { "as", "product" }
            }),
            new BsonDocument("$unwind", "$product"),
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", "$product.CategoryId" },
                { "revenue", new BsonDocument("$sum", "$revenue") }
            }),
            new BsonDocument("$lookup", new BsonDocument
            {
                { "from", "Categories" }, { "localField", "_id" }, { "foreignField", "_id" }, { "as", "category" }
            }),
            new BsonDocument("$unwind", new BsonDocument
            {
                { "path", "$category" }, { "preserveNullAndEmptyArrays", true }
            }),
            new BsonDocument("$project", new BsonDocument
            {
                { "_id", 0 },
                { "CategoryName", new BsonDocument("$ifNull", new BsonArray { "$category.Name", "Uncategorized" }) },
                { "Revenue", "$revenue" }
            }),
            new BsonDocument("$sort", new BsonDocument("Revenue", -1)),
            new BsonDocument("$limit", limit)
        };
        var cursor = await _uow.Orders.Collection.AggregateAsync<BsonDocument>(pipeline, cancellationToken: ct);
        return (await cursor.ToListAsync(ct)).Select(d => new CategorySalesDto
        {
            CategoryName = d.GetValue("CategoryName", "Uncategorized").AsString,
            Revenue = ToDecimal(d.GetValue("Revenue", 0))
        }).ToList();
    }

    private static decimal ToDecimal(BsonValue value) => value.BsonType switch
    {
        BsonType.Decimal128 => (decimal)value.AsDecimal128,
        BsonType.Double => (decimal)value.AsDouble,
        BsonType.Int32 => value.AsInt32,
        BsonType.Int64 => value.AsInt64,
        _ => 0
    };
}
