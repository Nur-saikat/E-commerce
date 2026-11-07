using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using MongoDB.Bson;

namespace ECommerce.Application.Common;

public static class Mappers
{
    public static string Id(this ObjectId id) => id.ToString();
    public static string? Id(this ObjectId? id) => id?.ToString();

    public static UserDto ToDto(this User user) => new()
    {
        Id = user.Id.ToString(),
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        Phone = user.Phone,
        AvatarUrl = user.AvatarUrl,
        Role = user.Role,
        Permissions = user.Permissions,
        IsActive = user.IsActive,
        EmailVerified = user.EmailVerified,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    };

    public static CategoryDto ToDto(this Category c, long productCount = 0) => new()
    {
        Id = c.Id.ToString(),
        Name = c.Name,
        Slug = c.Slug,
        Description = c.Description,
        ParentId = c.ParentId.Id(),
        ImageUrl = c.ImageUrl,
        SeoTitle = c.SeoTitle,
        SeoDescription = c.SeoDescription,
        IsActive = c.IsActive,
        SortOrder = c.SortOrder,
        ProductCount = productCount
    };

    public static BrandDto ToDto(this Brand b, long productCount = 0) => new()
    {
        Id = b.Id.ToString(),
        Name = b.Name,
        Slug = b.Slug,
        Description = b.Description,
        LogoUrl = b.LogoUrl,
        IsActive = b.IsActive,
        SortOrder = b.SortOrder,
        ProductCount = productCount
    };

    public static ProductSummaryDto ToSummary(this Product p, string? categoryName = null, string? brandName = null) => new()
    {
        Id = p.Id.ToString(),
        Name = p.Name,
        Slug = p.Slug,
        Sku = p.Sku,
        ThumbnailUrl = p.ThumbnailUrl ?? p.Images.FirstOrDefault(),
        Price = p.Price,
        DiscountPrice = p.DiscountPrice,
        EffectivePrice = p.EffectivePrice,
        DiscountPercent = p.DiscountPercent,
        RatingAverage = Math.Round(p.RatingAverage, 1),
        ReviewCount = p.ReviewCount,
        Stock = p.Stock,
        TotalStock = p.TotalStock,
        SoldCount = p.SoldCount,
        IsFeatured = p.IsFeatured,
        IsActive = p.IsActive,
        CategoryId = p.CategoryId.ToString(),
        CategoryName = categoryName,
        BrandId = p.BrandId.Id(),
        BrandName = brandName,
        Tags = p.Tags,
        CreatedAt = p.CreatedAt
    };

    public static ProductDetailDto ToDetail(this Product p, string? categoryName = null, string? brandName = null) => new()
    {
        Id = p.Id.ToString(),
        Name = p.Name,
        Slug = p.Slug,
        Sku = p.Sku,
        ThumbnailUrl = p.ThumbnailUrl ?? p.Images.FirstOrDefault(),
        Price = p.Price,
        DiscountPrice = p.DiscountPrice,
        EffectivePrice = p.EffectivePrice,
        DiscountPercent = p.DiscountPercent,
        RatingAverage = Math.Round(p.RatingAverage, 1),
        ReviewCount = p.ReviewCount,
        Stock = p.Stock,
        TotalStock = p.TotalStock,
        SoldCount = p.SoldCount,
        IsFeatured = p.IsFeatured,
        IsActive = p.IsActive,
        CategoryId = p.CategoryId.ToString(),
        CategoryName = categoryName,
        BrandId = p.BrandId.Id(),
        BrandName = brandName,
        Tags = p.Tags,
        CreatedAt = p.CreatedAt,
        ShortDescription = p.ShortDescription,
        Description = p.Description,
        Images = p.Images,
        Specifications = p.Specifications,
        Variants = p.Variants.Select(v => new ProductVariantDto
        {
            Id = v.Id.ToString(),
            Name = v.Name,
            Sku = v.Sku,
            Price = v.Price,
            Stock = v.Stock,
            Attributes = v.Attributes,
            ImageUrl = v.ImageUrl
        }).ToList(),
        LowStockThreshold = p.LowStockThreshold,
        SeoTitle = p.SeoTitle,
        SeoDescription = p.SeoDescription,
        UpdatedAt = p.UpdatedAt
    };

    public static ReviewDto ToDto(this ProductReview r, string? productName = null) => new()
    {
        Id = r.Id.ToString(),
        ProductId = r.ProductId.ToString(),
        ProductName = productName,
        UserName = r.UserName,
        Rating = r.Rating,
        Title = r.Title,
        Comment = r.Comment,
        IsVerifiedPurchase = r.IsVerifiedPurchase,
        IsApproved = r.IsApproved,
        CreatedAt = r.CreatedAt
    };

    public static CartItemDto ToDto(this CartItem i, int stockAvailable, bool isAvailable, string slug) => new()
    {
        Id = i.Id.ToString(),
        ProductId = i.ProductId.ToString(),
        VariantId = i.VariantId.Id(),
        ProductName = i.ProductName,
        VariantName = i.VariantName,
        Sku = i.Sku,
        ImageUrl = i.ImageUrl,
        UnitPrice = i.UnitPrice,
        Quantity = i.Quantity,
        LineTotal = i.UnitPrice * i.Quantity,
        StockAvailable = stockAvailable,
        IsAvailable = isAvailable,
        Slug = slug
    };

    public static OrderItemDto ToDto(this OrderItem i) => new()
    {
        ProductId = i.ProductId.ToString(),
        VariantId = i.VariantId.Id(),
        ProductName = i.ProductName,
        Sku = i.Sku,
        ImageUrl = i.ImageUrl,
        VariantName = i.VariantName,
        UnitPrice = i.UnitPrice,
        Quantity = i.Quantity,
        LineTotal = i.LineTotal
    };

    public static OrderSummaryDto ToSummary(this Order o) => new()
    {
        Id = o.Id.ToString(),
        OrderNumber = o.OrderNumber,
        CustomerName = o.CustomerName,
        CustomerEmail = o.CustomerEmail,
        Total = o.Total,
        Status = o.Status,
        PaymentStatus = o.PaymentStatus,
        PaymentMethod = o.PaymentMethod,
        ItemCount = o.Items.Sum(i => i.Quantity),
        FirstItemImage = o.Items.FirstOrDefault()?.ImageUrl,
        CreatedAt = o.CreatedAt
    };

    public static OrderDto ToDto(this Order o) => new()
    {
        Id = o.Id.ToString(),
        OrderNumber = o.OrderNumber,
        UserId = o.UserId.Id(),
        CustomerName = o.CustomerName,
        CustomerEmail = o.CustomerEmail,
        CustomerPhone = o.CustomerPhone,
        Items = o.Items.Select(i => i.ToDto()).ToList(),
        ShippingAddress = new AddressInput
        {
            FullName = o.ShippingAddress.FullName,
            Phone = o.ShippingAddress.Phone,
            Street = o.ShippingAddress.Street,
            City = o.ShippingAddress.City,
            State = o.ShippingAddress.State,
            PostalCode = o.ShippingAddress.PostalCode,
            Country = o.ShippingAddress.Country
        },
        BillingAddress = o.BillingAddress is null ? null : new AddressInput
        {
            FullName = o.BillingAddress.FullName,
            Phone = o.BillingAddress.Phone,
            Street = o.BillingAddress.Street,
            City = o.BillingAddress.City,
            State = o.BillingAddress.State,
            PostalCode = o.BillingAddress.PostalCode,
            Country = o.BillingAddress.Country
        },
        ShippingMethodName = o.ShippingMethodName,
        ShippingCost = o.ShippingCost,
        CouponCode = o.CouponCode,
        Subtotal = o.Subtotal,
        Discount = o.Discount,
        TaxAmount = o.TaxAmount,
        Total = o.Total,
        Status = o.Status,
        PaymentMethod = o.PaymentMethod,
        PaymentStatus = o.PaymentStatus,
        PaymentTransactionId = o.PaymentTransactionId,
        TrackingNumber = o.TrackingNumber,
        Notes = o.Notes,
        StatusHistory = o.StatusHistory.Select(h => new OrderStatusHistoryDto
        {
            Status = h.Status,
            Note = h.Note,
            ChangedAt = h.ChangedAt,
            ChangedBy = h.ChangedBy
        }).ToList(),
        CreatedAt = o.CreatedAt,
        ShippedAt = o.ShippedAt,
        CompletedAt = o.CompletedAt,
        CancelledAt = o.CancelledAt,
        CancellationReason = o.CancellationReason,
        CanCancel = o.Status is "Pending" or "Confirmed"
    };

    public static CouponDto ToDto(this Coupon c) => new()
    {
        Id = c.Id.ToString(),
        Code = c.Code,
        Description = c.Description,
        Type = c.Type,
        Value = c.Value,
        MinimumPurchase = c.MinimumPurchase,
        MaximumDiscount = c.MaximumDiscount,
        StartsAt = c.StartsAt,
        ExpiresAt = c.ExpiresAt,
        UsageLimit = c.UsageLimit,
        PerUserLimit = c.PerUserLimit,
        UsedCount = c.UsedCount,
        UserIds = c.UserIds.Select(u => u.ToString()).ToList(),
        IsActive = c.IsActive,
        IsValid = c.IsCurrentlyValid,
        CreatedAt = c.CreatedAt
    };

    public static BannerDto ToDto(this Banner b) => new()
    {
        Id = b.Id.ToString(),
        Title = b.Title,
        Subtitle = b.Subtitle,
        ImageUrl = b.ImageUrl,
        LinkUrl = b.LinkUrl,
        ButtonText = b.ButtonText,
        Position = b.Position,
        SortOrder = b.SortOrder,
        IsActive = b.IsActive,
        StartAt = b.StartAt,
        EndAt = b.EndAt
    };

    public static TestimonialDto ToDto(this Testimonial t) => new()
    {
        Id = t.Id.ToString(),
        Name = t.Name,
        Role = t.Role,
        AvatarUrl = t.AvatarUrl,
        Rating = t.Rating,
        Quote = t.Quote,
        IsActive = t.IsActive,
        SortOrder = t.SortOrder
    };

    public static ShippingMethodDto ToDto(this ShippingMethod s) => new()
    {
        Id = s.Id.ToString(),
        Name = s.Name,
        Description = s.Description,
        Cost = s.Cost,
        EstimatedDaysMin = s.EstimatedDaysMin,
        EstimatedDaysMax = s.EstimatedDaysMax,
        IsActive = s.IsActive,
        IsDefault = s.IsDefault
    };

    public static AddressDto ToDto(this Address a) => new()
    {
        Id = a.Id.ToString(),
        FullName = a.FullName,
        Phone = a.Phone,
        Street = a.Street,
        City = a.City,
        State = a.State,
        PostalCode = a.PostalCode,
        Country = a.Country,
        IsDefault = a.IsDefault
    };

    public static NotificationDto ToDto(this Notification n) => new()
    {
        Id = n.Id.ToString(),
        Title = n.Title,
        Message = n.Message,
        Type = n.Type,
        Link = n.Link,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt
    };

    public static ContactMessageDto ToDto(this ContactMessage m) => new()
    {
        Id = m.Id.ToString(),
        Name = m.Name,
        Email = m.Email,
        Phone = m.Phone,
        Subject = m.Subject,
        Message = m.Message,
        IsRead = m.IsRead,
        CreatedAt = m.CreatedAt
    };

    public static NewsletterSubscriberDto ToDto(this NewsletterSubscriber s) => new()
    {
        Id = s.Id.ToString(),
        Email = s.Email,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt
    };

    public static PaymentDto ToDto(this Payment p) => new()
    {
        Id = p.Id.ToString(),
        OrderId = p.OrderId.ToString(),
        OrderNumber = p.OrderNumber,
        Provider = p.Provider,
        Amount = p.Amount,
        Currency = p.Currency,
        Status = p.Status,
        TransactionId = p.TransactionId,
        FailureReason = p.FailureReason,
        CreatedAt = p.CreatedAt
    };

    public static InventoryTransactionDto ToDto(this InventoryTransaction t) => new()
    {
        Id = t.Id.ToString(),
        ProductId = t.ProductId,
        ProductName = t.ProductName,
        VariantId = t.VariantId,
        Type = t.Type,
        QuantityChange = t.QuantityChange,
        StockAfter = t.StockAfter,
        Reference = t.Reference,
        Note = t.Note,
        CreatedBy = t.CreatedBy,
        CreatedAt = t.CreatedAt
    };

    public static SettingsDto ToDto(this WebsiteSettings s) => new()
    {
        StoreName = s.StoreName,
        Tagline = s.Tagline,
        LogoUrl = s.LogoUrl,
        Email = s.Email,
        Phone = s.Phone,
        Address = s.Address,
        Currency = s.Currency,
        CurrencySymbol = s.CurrencySymbol,
        TaxRate = s.TaxRate,
        FlatShippingRate = s.FlatShippingRate,
        FreeShippingThreshold = s.FreeShippingThreshold,
        CodEnabled = s.CodEnabled,
        StripeEnabled = s.StripeEnabled,
        SslCommerzEnabled = s.SslCommerzEnabled,
        SocialLinks = s.SocialLinks,
        FooterAbout = s.FooterAbout,
        CopyrightText = s.CopyrightText,
        MenuItems = s.MenuItems.Select(m => new MenuItemDto
        {
            Label = m.Label,
            Url = m.Url,
            SortOrder = m.SortOrder
        }).ToList()
    };
}
