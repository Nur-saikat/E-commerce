using ECommerce.Domain.Entities;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace ECommerce.Infrastructure.Persistence;

public class MongoIndexInitializer
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<MongoIndexInitializer> _logger;

    public MongoIndexInitializer(IMongoDatabase database, ILogger<MongoIndexInitializer> logger)
    {
        _database = database;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        await CreateAsync<User>("Users", new[]
        {
            Model<User>(Builders<User>.IndexKeys.Ascending(u => u.Email), unique: true),
            Model<User>(Builders<User>.IndexKeys.Ascending("RefreshTokens.TokenHash")),
            Model<User>(Builders<User>.IndexKeys.Ascending(u => u.Role)),
            Model<User>(Builders<User>.IndexKeys.Ascending(u => u.PasswordResetToken))
        }, ct);

        await CreateAsync<Category>("Categories", new[]
        {
            Model<Category>(Builders<Category>.IndexKeys.Ascending(c => c.Slug), unique: true),
            Model<Category>(Builders<Category>.IndexKeys.Ascending(c => c.ParentId))
        }, ct);

        await CreateAsync<Brand>("Brands", new[]
        {
            Model<Brand>(Builders<Brand>.IndexKeys.Ascending(b => b.Slug), unique: true)
        }, ct);

        await CreateAsync<Product>("Products", new[]
        {
            Model<Product>(Builders<Product>.IndexKeys.Ascending(p => p.Slug), unique: true),
            Model<Product>(Builders<Product>.IndexKeys.Ascending(p => p.Sku), unique: true),
            Model<Product>(Builders<Product>.IndexKeys.Ascending(p => p.CategoryId)),
            Model<Product>(Builders<Product>.IndexKeys.Ascending(p => p.BrandId)),
            Model<Product>(Builders<Product>.IndexKeys.Combine(
                Builders<Product>.IndexKeys.Ascending(p => p.IsActive),
                Builders<Product>.IndexKeys.Ascending(p => p.IsDeleted),
                Builders<Product>.IndexKeys.Descending(p => p.CreatedAt))),
            Model<Product>(Builders<Product>.IndexKeys.Descending(p => p.SoldCount)),
            Model<Product>(Builders<Product>.IndexKeys.Descending(p => p.RatingAverage))
        }, ct);

        await CreateAsync<ProductReview>("ProductReviews", new[]
        {
            Model<ProductReview>(Builders<ProductReview>.IndexKeys.Combine(
                Builders<ProductReview>.IndexKeys.Ascending(r => r.ProductId),
                Builders<ProductReview>.IndexKeys.Ascending(r => r.IsApproved))),
            Model<ProductReview>(Builders<ProductReview>.IndexKeys.Combine(
                Builders<ProductReview>.IndexKeys.Ascending(r => r.UserId),
                Builders<ProductReview>.IndexKeys.Ascending(r => r.ProductId)))
        }, ct);

        await CreateAsync<Cart>("Carts", new[]
        {
            Model<Cart>(Builders<Cart>.IndexKeys.Ascending(c => c.UserId)),
            Model<Cart>(Builders<Cart>.IndexKeys.Ascending(c => c.GuestId))
        }, ct);

        await CreateAsync<Wishlist>("Wishlists", new[]
        {
            Model<Wishlist>(Builders<Wishlist>.IndexKeys.Ascending(w => w.UserId), unique: true)
        }, ct);

        await CreateAsync<Order>("Orders", new[]
        {
            Model<Order>(Builders<Order>.IndexKeys.Ascending(o => o.OrderNumber), unique: true),
            Model<Order>(Builders<Order>.IndexKeys.Combine(
                Builders<Order>.IndexKeys.Ascending(o => o.UserId),
                Builders<Order>.IndexKeys.Descending(o => o.CreatedAt))),
            Model<Order>(Builders<Order>.IndexKeys.Ascending(o => o.Status)),
            Model<Order>(Builders<Order>.IndexKeys.Ascending(o => o.PaymentStatus)),
            Model<Order>(Builders<Order>.IndexKeys.Descending(o => o.CreatedAt))
        }, ct);

        await CreateAsync<Payment>("Payments", new[]
        {
            Model<Payment>(Builders<Payment>.IndexKeys.Ascending(p => p.OrderId)),
            Model<Payment>(Builders<Payment>.IndexKeys.Ascending(p => p.TransactionId))
        }, ct);

        await CreateAsync<Coupon>("Coupons", new[]
        {
            Model<Coupon>(Builders<Coupon>.IndexKeys.Ascending(c => c.Code), unique: true),
            Model<Coupon>(Builders<Coupon>.IndexKeys.Ascending(c => c.IsActive))
        }, ct);

        await CreateAsync<Banner>("Banners", new[]
        {
            Model<Banner>(Builders<Banner>.IndexKeys.Ascending(b => b.Position))
        }, ct);

        await CreateAsync<Address>("Addresses", new[]
        {
            Model<Address>(Builders<Address>.IndexKeys.Ascending(a => a.UserId))
        }, ct);

        await CreateAsync<InventoryTransaction>("InventoryTransactions", new[]
        {
            Model<InventoryTransaction>(Builders<InventoryTransaction>.IndexKeys.Ascending(t => t.ProductId)),
            Model<InventoryTransaction>(Builders<InventoryTransaction>.IndexKeys.Descending(t => t.CreatedAt))
        }, ct);

        await CreateAsync<Notification>("Notifications", new[]
        {
            Model<Notification>(Builders<Notification>.IndexKeys.Combine(
                Builders<Notification>.IndexKeys.Ascending(n => n.UserId),
                Builders<Notification>.IndexKeys.Descending(n => n.CreatedAt)))
        }, ct);

        await CreateAsync<NewsletterSubscriber>("NewsletterSubscribers", new[]
        {
            Model<NewsletterSubscriber>(Builders<NewsletterSubscriber>.IndexKeys.Ascending(s => s.Email), unique: true)
        }, ct);

        await CreateAsync<AuditLog>("AuditLogs", new[]
        {
            Model<AuditLog>(Builders<AuditLog>.IndexKeys.Descending(a => a.CreatedAt))
        }, ct);

        await CreateAsync<VoucherWallet>("VoucherWallets", new[]
        {
            Model<VoucherWallet>(Builders<VoucherWallet>.IndexKeys.Ascending(w => w.UserId), unique: true)
        }, ct);

        await CreateAsync<VoucherTransaction>("VoucherTransactions", new[]
        {
            Model<VoucherTransaction>(Builders<VoucherTransaction>.IndexKeys.Combine(
                Builders<VoucherTransaction>.IndexKeys.Ascending(t => t.UserId),
                Builders<VoucherTransaction>.IndexKeys.Descending(t => t.CreatedAt))),
            Model<VoucherTransaction>(Builders<VoucherTransaction>.IndexKeys.Ascending(t => t.OrderId))
        }, ct);

        await CreateAsync<ReturnRequest>("ReturnRequests", new[]
        {
            Model<ReturnRequest>(Builders<ReturnRequest>.IndexKeys.Combine(
                Builders<ReturnRequest>.IndexKeys.Ascending(r => r.OrderId),
                Builders<ReturnRequest>.IndexKeys.Descending(r => r.CreatedAt))),
            Model<ReturnRequest>(Builders<ReturnRequest>.IndexKeys.Combine(
                Builders<ReturnRequest>.IndexKeys.Ascending(r => r.UserId),
                Builders<ReturnRequest>.IndexKeys.Descending(r => r.CreatedAt))),
            Model<ReturnRequest>(Builders<ReturnRequest>.IndexKeys.Combine(
                Builders<ReturnRequest>.IndexKeys.Ascending(r => r.Status),
                Builders<ReturnRequest>.IndexKeys.Descending(r => r.CreatedAt)))
        }, ct);

        _logger.LogInformation("MongoDB indexes initialized");
    }

    private static CreateIndexModel<T> Model<T>(IndexKeysDefinition<T> keys, bool unique = false) =>
        new(keys, new CreateIndexOptions { Unique = unique });

    private async Task CreateAsync<T>(string collectionName, IEnumerable<CreateIndexModel<T>> models, CancellationToken ct)
    {
        try
        {
            var collection = _database.GetCollection<T>(collectionName);
            await collection.Indexes.CreateManyAsync(models, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to create all indexes for {Collection}", collectionName);
        }
    }
}
