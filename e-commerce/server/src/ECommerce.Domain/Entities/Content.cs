using ECommerce.Domain.Common;

namespace ECommerce.Domain.Entities;

public class ContactMessage : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
}

public class NewsletterSubscriber : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class AuditLog : BaseEntity
{
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? Changes { get; set; }
    public string? IpAddress { get; set; }
}

public class WebsiteSettings : BaseEntity
{
    public string StoreName { get; set; } = "Safwan";
    public string? Tagline { get; set; }
    public string? LogoUrl { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string Currency { get; set; } = "USD";
    public string CurrencySymbol { get; set; } = "$";
    public decimal TaxRate { get; set; } = 5;
    public decimal FlatShippingRate { get; set; } = 10;
    public decimal FreeShippingThreshold { get; set; } = 100;
    public bool CodEnabled { get; set; } = true;
    public bool StripeEnabled { get; set; }
    public bool SslCommerzEnabled { get; set; }
    public Dictionary<string, string> SocialLinks { get; set; } = new();
    public EmailSettings EmailSettings { get; set; } = new();
    public string? FooterAbout { get; set; }
    public string? CopyrightText { get; set; }
    public List<MenuItem> MenuItems { get; set; } = new();
}

public class EmailSettings
{
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUser { get; set; }
    public string? FromEmail { get; set; }
    public string? FromName { get; set; }
    public bool EnableSsl { get; set; } = true;
}

public class MenuItem
{
    public string Label { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
