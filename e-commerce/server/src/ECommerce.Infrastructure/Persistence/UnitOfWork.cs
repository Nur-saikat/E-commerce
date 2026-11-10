using ECommerce.Application.Common.Interfaces;
using ECommerce.Domain.Entities;
using MongoDB.Driver;

namespace ECommerce.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    public UnitOfWork(IMongoDatabase database)
    {
        Users = new MongoRepository<User>(database, "Users");
        Roles = new MongoRepository<Role>(database, "Roles");
        Permissions = new MongoRepository<Permission>(database, "Permissions");
        Categories = new MongoRepository<Category>(database, "Categories");
        Brands = new MongoRepository<Brand>(database, "Brands");
        Products = new MongoRepository<Product>(database, "Products");
        Reviews = new MongoRepository<ProductReview>(database, "ProductReviews");
        Carts = new MongoRepository<Cart>(database, "Carts");
        Wishlists = new MongoRepository<Wishlist>(database, "Wishlists");
        Orders = new MongoRepository<Order>(database, "Orders");
        Payments = new MongoRepository<Payment>(database, "Payments");
        Coupons = new MongoRepository<Coupon>(database, "Coupons");
        Banners = new MongoRepository<Banner>(database, "Banners");
        Testimonials = new MongoRepository<Testimonial>(database, "Testimonials");
        ShippingMethods = new MongoRepository<ShippingMethod>(database, "ShippingMethods");
        Addresses = new MongoRepository<Address>(database, "Addresses");
        InventoryTransactions = new MongoRepository<InventoryTransaction>(database, "InventoryTransactions");
        Notifications = new MongoRepository<Notification>(database, "Notifications");
        ContactMessages = new MongoRepository<ContactMessage>(database, "ContactMessages");
        NewsletterSubscribers = new MongoRepository<NewsletterSubscriber>(database, "NewsletterSubscribers");
        WebsiteSettings = new MongoRepository<WebsiteSettings>(database, "WebsiteSettings");
        AuditLogs = new MongoRepository<AuditLog>(database, "AuditLogs");
        StaffMembers = new MongoRepository<StaffMember>(database, "StaffMembers");
        OwnerProfiles = new MongoRepository<OwnerProfile>(database, "OwnerProfiles");
        CapitalEntries = new MongoRepository<CapitalEntry>(database, "CapitalEntries");
        ExpenseEntries = new MongoRepository<ExpenseEntry>(database, "ExpenseEntries");
        StockArrivals = new MongoRepository<StockArrival>(database, "StockArrivals");
        SupplierReturns = new MongoRepository<SupplierReturn>(database, "SupplierReturns");
        StockPurchases = new MongoRepository<StockPurchase>(database, "StockPurchases");
        VoucherWallets = new MongoRepository<VoucherWallet>(database, "VoucherWallets");
        VoucherTransactions = new MongoRepository<VoucherTransaction>(database, "VoucherTransactions");
        ReturnRequests = new MongoRepository<ReturnRequest>(database, "ReturnRequests");
    }

    public IMongoRepository<User> Users { get; }
    public IMongoRepository<Role> Roles { get; }
    public IMongoRepository<Permission> Permissions { get; }
    public IMongoRepository<Category> Categories { get; }
    public IMongoRepository<Brand> Brands { get; }
    public IMongoRepository<Product> Products { get; }
    public IMongoRepository<ProductReview> Reviews { get; }
    public IMongoRepository<Cart> Carts { get; }
    public IMongoRepository<Wishlist> Wishlists { get; }
    public IMongoRepository<Order> Orders { get; }
    public IMongoRepository<Payment> Payments { get; }
    public IMongoRepository<Coupon> Coupons { get; }
    public IMongoRepository<Banner> Banners { get; }
    public IMongoRepository<Testimonial> Testimonials { get; }
    public IMongoRepository<ShippingMethod> ShippingMethods { get; }
    public IMongoRepository<Address> Addresses { get; }
    public IMongoRepository<InventoryTransaction> InventoryTransactions { get; }
    public IMongoRepository<Notification> Notifications { get; }
    public IMongoRepository<ContactMessage> ContactMessages { get; }
    public IMongoRepository<NewsletterSubscriber> NewsletterSubscribers { get; }
    public IMongoRepository<WebsiteSettings> WebsiteSettings { get; }
    public IMongoRepository<AuditLog> AuditLogs { get; }
    public IMongoRepository<StaffMember> StaffMembers { get; }
    public IMongoRepository<OwnerProfile> OwnerProfiles { get; }
    public IMongoRepository<CapitalEntry> CapitalEntries { get; }
    public IMongoRepository<ExpenseEntry> ExpenseEntries { get; }
    public IMongoRepository<StockArrival> StockArrivals { get; }
    public IMongoRepository<SupplierReturn> SupplierReturns { get; }
    public IMongoRepository<StockPurchase> StockPurchases { get; }
    public IMongoRepository<VoucherWallet> VoucherWallets { get; }
    public IMongoRepository<VoucherTransaction> VoucherTransactions { get; }
    public IMongoRepository<ReturnRequest> ReturnRequests { get; }
}
