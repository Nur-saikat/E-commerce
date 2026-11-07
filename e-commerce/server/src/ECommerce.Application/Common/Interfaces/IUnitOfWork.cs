using ECommerce.Domain.Entities;

namespace ECommerce.Application.Common.Interfaces;

public interface IUnitOfWork
{
    IMongoRepository<User> Users { get; }
    IMongoRepository<Role> Roles { get; }
    IMongoRepository<Permission> Permissions { get; }
    IMongoRepository<Category> Categories { get; }
    IMongoRepository<Brand> Brands { get; }
    IMongoRepository<Product> Products { get; }
    IMongoRepository<ProductReview> Reviews { get; }
    IMongoRepository<Cart> Carts { get; }
    IMongoRepository<Wishlist> Wishlists { get; }
    IMongoRepository<Order> Orders { get; }
    IMongoRepository<Payment> Payments { get; }
    IMongoRepository<Coupon> Coupons { get; }
    IMongoRepository<Banner> Banners { get; }
    IMongoRepository<Testimonial> Testimonials { get; }
    IMongoRepository<ShippingMethod> ShippingMethods { get; }
    IMongoRepository<Address> Addresses { get; }
    IMongoRepository<InventoryTransaction> InventoryTransactions { get; }
    IMongoRepository<Notification> Notifications { get; }
    IMongoRepository<ContactMessage> ContactMessages { get; }
    IMongoRepository<NewsletterSubscriber> NewsletterSubscribers { get; }
    IMongoRepository<WebsiteSettings> WebsiteSettings { get; }
    IMongoRepository<AuditLog> AuditLogs { get; }
}
