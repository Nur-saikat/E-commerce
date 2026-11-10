namespace ECommerce.Application.Common.Options;

public class AppOptions
{
    public const string SectionName = "App";
    public string FrontendBaseUrl { get; set; } = "http://localhost:4200";
    public bool ExposeResetToken { get; set; } = true;
    public string[] CorsOrigins { get; set; } = { "http://localhost:4200" };
    public long MaxUploadBytes { get; set; } = 5 * 1024 * 1024;
    public string[] AllowedImageTypes { get; set; } = { "image/jpeg", "image/png", "image/webp", "image/gif" };
    public long MaxDocumentBytes { get; set; } = 10 * 1024 * 1024;
    public string[] AllowedDocumentTypes { get; set; } =
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
    };
}

public class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "ECommerce.API";
    public string Audience { get; set; } = "ECommerce.Client";
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 7;
}

public class MongoOptions
{
    public const string SectionName = "MongoDb";
    public string ConnectionString { get; set; } = "mongodb://localhost:27017";
    public string DatabaseName { get; set; } = "LuxeCommerceDb";
}

public class StorageOptions
{
    public const string SectionName = "Storage";
    public string Provider { get; set; } = "Local";
    public string LocalPath { get; set; } = "wwwroot/uploads";
    public string PublicBaseUrl { get; set; } = "/uploads";
}

public class EmailOptions
{
    public const string SectionName = "Email";
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUser { get; set; }
    public string? SmtpPassword { get; set; }
    public string FromEmail { get; set; } = "no-reply@safwan.store";
    public string FromName { get; set; } = "Safwan";
    public bool EnableSsl { get; set; } = true;
}

public class PaymentOptions
{
    public const string SectionName = "Payments";
    public StripeOptions Stripe { get; set; } = new();
    public SslCommerzOptions SslCommerz { get; set; } = new();
}

public class StripeOptions
{
    public string SecretKey { get; set; } = string.Empty;
    public string PublishableKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string ApiBase { get; set; } = "https://api.stripe.com/v1";
    public bool Enabled => !string.IsNullOrWhiteSpace(SecretKey);
}

public class SslCommerzOptions
{
    public string StoreId { get; set; } = string.Empty;
    public string StorePassword { get; set; } = string.Empty;
    public bool Sandbox { get; set; } = true;
    public string BaseUrl => Sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
    public bool Enabled => !string.IsNullOrWhiteSpace(StoreId) && !string.IsNullOrWhiteSpace(StorePassword);
}
