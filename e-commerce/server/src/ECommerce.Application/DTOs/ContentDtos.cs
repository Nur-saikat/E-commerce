using ECommerce.Shared.Common;

namespace ECommerce.Application.DTOs;

public class BannerDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? ImageUrl { get; set; }
    public string? LinkUrl { get; set; }
    public string? ButtonText { get; set; }
    public string Position { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
}

public class BannerRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? ImageUrl { get; set; }
    public string? LinkUrl { get; set; }
    public string? ButtonText { get; set; }
    public string Position { get; set; } = "Hero";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
}

public class TestimonialDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? AvatarUrl { get; set; }
    public int Rating { get; set; }
    public string Quote { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

public class TestimonialRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? AvatarUrl { get; set; }
    public int Rating { get; set; } = 5;
    public string Quote { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class ContactRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ContactMessageDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NewsletterRequest
{
    public string Email { get; set; } = string.Empty;
}

public class NewsletterSubscriberDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MenuItemDto
{
    public string Label { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class SettingsDto
{
    public string StoreName { get; set; } = string.Empty;
    public string? Tagline { get; set; }
    public string? LogoUrl { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string Currency { get; set; } = "USD";
    public string CurrencySymbol { get; set; } = "$";
    public decimal TaxRate { get; set; }
    public decimal FlatShippingRate { get; set; }
    public decimal FreeShippingThreshold { get; set; }
    public bool CodEnabled { get; set; }
    public bool StripeEnabled { get; set; }
    public bool SslCommerzEnabled { get; set; }
    public Dictionary<string, string> SocialLinks { get; set; } = new();
    public string? FooterAbout { get; set; }
    public string? CopyrightText { get; set; }
    public List<MenuItemDto> MenuItems { get; set; } = new();
}

public class SettingsRequest
{
    public string StoreName { get; set; } = string.Empty;
    public string? Tagline { get; set; }
    public string? LogoUrl { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string Currency { get; set; } = "USD";
    public string CurrencySymbol { get; set; } = "$";
    public decimal TaxRate { get; set; }
    public decimal FlatShippingRate { get; set; }
    public decimal FreeShippingThreshold { get; set; }
    public bool CodEnabled { get; set; }
    public bool StripeEnabled { get; set; }
    public bool SslCommerzEnabled { get; set; }
    public Dictionary<string, string> SocialLinks { get; set; } = new();
    public string? FooterAbout { get; set; }
    public string? CopyrightText { get; set; }
    public List<MenuItemDto> MenuItems { get; set; } = new();
}

public class HomeFeedDto
{
    public List<BannerDto> Banners { get; set; } = new();
    public List<CategoryDto> Categories { get; set; } = new();
    public List<BrandDto> Brands { get; set; } = new();
    public List<ProductSummaryDto> FeaturedProducts { get; set; } = new();
    public List<ProductSummaryDto> NewArrivals { get; set; } = new();
    public List<ProductSummaryDto> BestSellers { get; set; } = new();
    public List<ProductSummaryDto> TrendingProducts { get; set; } = new();
    public List<ProductSummaryDto> Deals { get; set; } = new();
    public List<TestimonialDto> Testimonials { get; set; } = new();
    public List<ProductSummaryDto> RecentlyViewed { get; set; } = new();
    public SettingsDto Settings { get; set; } = new();
}

public class UploadResultDto
{
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long Size { get; set; }
}
