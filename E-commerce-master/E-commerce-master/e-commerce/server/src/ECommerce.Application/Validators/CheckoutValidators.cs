using ECommerce.Application.DTOs;
using FluentValidation;

namespace ECommerce.Application.Validators;

public class CheckoutRequestValidator : AbstractValidator<CheckoutRequest>
{
    public CheckoutRequestValidator()
    {
        RuleFor(x => x.ShippingAddress).NotNull().SetValidator(new AddressInputValidator());
        RuleFor(x => x.BillingAddress).SetValidator(new AddressInputValidator()!).When(x => x.BillingAddress is not null);
        RuleFor(x => x.PaymentMethod).NotEmpty();
        RuleFor(x => x.GuestEmail).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.GuestEmail));
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public class CouponRequestValidator : AbstractValidator<CouponRequest>
{
    public CouponRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(40).Matches("^[A-Za-z0-9_-]+$")
            .WithMessage("Coupon code may only contain letters, numbers, dashes and underscores");
        RuleFor(x => x.Description).MaximumLength(300);
        RuleFor(x => x.Type).Must(t => t is "Percentage" or "Fixed").WithMessage("Type must be Percentage or Fixed");
        RuleFor(x => x.Value).GreaterThan(0);
        RuleFor(x => x.Value).LessThanOrEqualTo(100).When(x => x.Type == "Percentage")
            .WithMessage("Percentage discount cannot exceed 100");
        RuleFor(x => x.MinimumPurchase).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ExpiresAt).GreaterThan(x => x.StartsAt).When(x => x.StartsAt.HasValue && x.ExpiresAt.HasValue)
            .WithMessage("Expiry must be after the start date");
    }
}

public class BannerRequestValidator : AbstractValidator<BannerRequest>
{
    public BannerRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Subtitle).MaximumLength(300);
        RuleFor(x => x.Position).NotEmpty();
    }
}

public class TestimonialRequestValidator : AbstractValidator<TestimonialRequest>
{
    public TestimonialRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Quote).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Rating).InclusiveBetween(1, 5);
    }
}

public class ContactRequestValidator : AbstractValidator<ContactRequest>
{
    public ContactRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Message).NotEmpty().MinimumLength(10).MaximumLength(5000);
    }
}

public class NewsletterRequestValidator : AbstractValidator<NewsletterRequest>
{
    public NewsletterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

public class SettingsRequestValidator : AbstractValidator<SettingsRequest>
{
    public SettingsRequestValidator()
    {
        RuleFor(x => x.StoreName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
        RuleFor(x => x.CurrencySymbol).NotEmpty().MaximumLength(5);
        RuleFor(x => x.TaxRate).InclusiveBetween(0, 100);
        RuleFor(x => x.FlatShippingRate).GreaterThanOrEqualTo(0);
        RuleFor(x => x.FreeShippingThreshold).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

public class ShippingMethodRequestValidator : AbstractValidator<ShippingMethodRequest>
{
    public ShippingMethodRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(300);
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0);
        RuleFor(x => x.EstimatedDaysMin).GreaterThanOrEqualTo(0);
        RuleFor(x => x.EstimatedDaysMax).GreaterThanOrEqualTo(x => x.EstimatedDaysMin)
            .WithMessage("Maximum delivery time must be at least the minimum");
    }
}
