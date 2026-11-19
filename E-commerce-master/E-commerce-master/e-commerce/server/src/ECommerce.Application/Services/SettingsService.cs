using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;

namespace ECommerce.Application.Services;

public class SettingsService
{
    private readonly IUnitOfWork _uow;

    public SettingsService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<WebsiteSettings> GetEntityAsync(CancellationToken ct = default)
    {
        var settings = await _uow.WebsiteSettings.FirstOrDefaultAsync(s => !s.IsDeleted, ct);
        if (settings is not null) return settings;

        settings = new WebsiteSettings
        {
            StoreName = "Safwan",
            Tagline = "Curated essentials for modern living",
            Email = "hello@safwan.store",
            Phone = "01700000000",
            Address = "Mirpur, Dhaka, Bangladesh",
            FooterAbout = "Thoughtfully selected products, delivered with care.",
            CopyrightText = $"© {DateTime.UtcNow.Year} Safwan. All rights reserved."
        };
        await _uow.WebsiteSettings.AddAsync(settings, ct);
        return settings;
    }

    public async Task<SettingsDto> GetAsync(CancellationToken ct = default) =>
        (await GetEntityAsync(ct)).ToDto();

    public async Task<SettingsDto> UpdateAsync(SettingsRequest request, string? updatedBy, CancellationToken ct = default)
    {
        var settings = await GetEntityAsync(ct);
        settings.StoreName = request.StoreName.Trim();
        settings.Tagline = request.Tagline;
        settings.LogoUrl = request.LogoUrl;
        settings.Email = request.Email;
        settings.Phone = request.Phone;
        settings.Address = request.Address;
        settings.Currency = request.Currency;
        settings.CurrencySymbol = request.CurrencySymbol;
        settings.TaxRate = request.TaxRate;
        settings.FlatShippingRate = request.FlatShippingRate;
        settings.FreeShippingThreshold = request.FreeShippingThreshold;
        settings.CodEnabled = request.CodEnabled;
        settings.StripeEnabled = request.StripeEnabled;
        settings.SslCommerzEnabled = request.SslCommerzEnabled;
        settings.BkashEnabled = request.BkashEnabled;
        settings.BkashMerchantNumber = request.BkashMerchantNumber;
        settings.NagadEnabled = request.NagadEnabled;
        settings.NagadMerchantNumber = request.NagadMerchantNumber;
        settings.RocketEnabled = request.RocketEnabled;
        settings.RocketMerchantNumber = request.RocketMerchantNumber;
        settings.VoucherPointsEnabled = request.VoucherPointsEnabled;
        settings.VoucherPointValue = request.VoucherPointValue > 0 ? request.VoucherPointValue : 1;
        settings.VoucherEarnPercent = Math.Clamp(request.VoucherEarnPercent, 0, 100);
        settings.VoucherMaxRedeemPercent = Math.Clamp(request.VoucherMaxRedeemPercent, 0, 100);
        settings.SocialLinks = request.SocialLinks ?? new();
        settings.FooterAbout = request.FooterAbout;
        settings.CopyrightText = request.CopyrightText;
        settings.MenuItems = (request.MenuItems ?? new()).Select(m => new MenuItem
        {
            Label = m.Label,
            Url = m.Url,
            SortOrder = m.SortOrder
        }).ToList();
        settings.UpdatedAt = DateTime.UtcNow;
        settings.UpdatedBy = updatedBy;
        await _uow.WebsiteSettings.UpdateAsync(settings, ct);
        return settings.ToDto();
    }

    public async Task<List<ShippingMethodDto>> GetShippingMethodsAsync(bool includeInactive, CancellationToken ct = default)
    {
        var methods = includeInactive
            ? await _uow.ShippingMethods.FindAsync(m => !m.IsDeleted, ct)
            : await _uow.ShippingMethods.FindAsync(m => !m.IsDeleted && m.IsActive, ct);
        return methods.OrderBy(m => m.Cost).Select(m => m.ToDto()).ToList();
    }

    public async Task<ShippingMethodDto> CreateShippingMethodAsync(ShippingMethodRequest request, string? updatedBy, CancellationToken ct = default)
    {
        var method = new ShippingMethod
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            Cost = request.Cost,
            EstimatedDaysMin = request.EstimatedDaysMin,
            EstimatedDaysMax = request.EstimatedDaysMax,
            IsActive = request.IsActive,
            IsDefault = request.IsDefault,
            CreatedBy = updatedBy
        };
        await _uow.ShippingMethods.AddAsync(method, ct);
        if (method.IsDefault) await ClearOtherDefaultsAsync(method.Id.ToString(), ct);
        return method.ToDto();
    }

    public async Task<ShippingMethodDto> UpdateShippingMethodAsync(string id, ShippingMethodRequest request, string? updatedBy, CancellationToken ct = default)
    {
        if (!MongoDB.Bson.ObjectId.TryParse(id, out var objectId))
            throw new Shared.Exceptions.BadRequestException("Invalid shipping method id");

        var method = await _uow.ShippingMethods.FirstOrDefaultAsync(m => m.Id == objectId && !m.IsDeleted, ct)
                     ?? throw new Shared.Exceptions.NotFoundException("Shipping method not found");

        method.Name = request.Name.Trim();
        method.Description = request.Description;
        method.Cost = request.Cost;
        method.EstimatedDaysMin = request.EstimatedDaysMin;
        method.EstimatedDaysMax = request.EstimatedDaysMax;
        method.IsActive = request.IsActive;
        method.IsDefault = request.IsDefault;
        method.UpdatedAt = DateTime.UtcNow;
        method.UpdatedBy = updatedBy;
        await _uow.ShippingMethods.UpdateAsync(method, ct);
        if (method.IsDefault) await ClearOtherDefaultsAsync(method.Id.ToString(), ct);
        return method.ToDto();
    }

    public async Task DeleteShippingMethodAsync(string id, string? updatedBy, CancellationToken ct = default)
    {
        if (!MongoDB.Bson.ObjectId.TryParse(id, out var objectId))
            throw new Shared.Exceptions.BadRequestException("Invalid shipping method id");
        var deleted = await _uow.ShippingMethods.SoftDeleteAsync(objectId, updatedBy, ct);
        if (!deleted) throw new Shared.Exceptions.NotFoundException("Shipping method not found");
    }

    private async Task ClearOtherDefaultsAsync(string keepId, CancellationToken ct)
    {
        var filter = MongoDB.Driver.Builders<ShippingMethod>.Filter.And(
            MongoDB.Driver.Builders<ShippingMethod>.Filter.Eq(m => m.IsDefault, true),
            MongoDB.Driver.Builders<ShippingMethod>.Filter.Ne(m => m.Id, MongoDB.Bson.ObjectId.Parse(keepId)));
        await _uow.ShippingMethods.Collection.UpdateManyAsync(
            filter,
            MongoDB.Driver.Builders<ShippingMethod>.Update.Set(m => m.IsDefault, false),
            cancellationToken: ct);
    }

    public async Task<ShippingMethod> GetDefaultShippingMethodAsync(CancellationToken ct = default)
    {
        var methods = await _uow.ShippingMethods.FindAsync(m => !m.IsDeleted && m.IsActive, ct);
        return methods.FirstOrDefault(m => m.IsDefault) ?? methods.OrderBy(m => m.Cost).FirstOrDefault()
               ?? throw new Shared.Exceptions.BadRequestException("No shipping methods are configured");
    }

    public async Task<CheckoutConfigDto> GetCheckoutConfigAsync(CancellationToken ct = default)
    {
        var settings = await GetEntityAsync(ct);
        var methods = await GetShippingMethodsAsync(false, ct);
        var payments = new List<string>();
        if (settings.CodEnabled) payments.Add(Shared.Constants.PaymentProviders.Cod);
        if (settings.StripeEnabled) payments.Add(Shared.Constants.PaymentProviders.Stripe);
        if (settings.SslCommerzEnabled) payments.Add(Shared.Constants.PaymentProviders.SslCommerz);
        var mobileBanking = new List<MobileBankingOptionDto>();
        AddMobileBanking(mobileBanking, payments, settings.BkashEnabled, Shared.Constants.PaymentProviders.Bkash, settings.BkashMerchantNumber);
        AddMobileBanking(mobileBanking, payments, settings.NagadEnabled, Shared.Constants.PaymentProviders.Nagad, settings.NagadMerchantNumber);
        AddMobileBanking(mobileBanking, payments, settings.RocketEnabled, Shared.Constants.PaymentProviders.Rocket, settings.RocketMerchantNumber);

        return new CheckoutConfigDto
        {
            ShippingMethods = methods,
            TaxRate = settings.TaxRate,
            FlatShippingRate = settings.FlatShippingRate,
            FreeShippingThreshold = settings.FreeShippingThreshold,
            EnabledPaymentMethods = payments,
            MobileBanking = mobileBanking,
            VoucherPointsEnabled = settings.VoucherPointsEnabled,
            VoucherPointValue = settings.VoucherPointValue > 0 ? settings.VoucherPointValue : 1,
            VoucherEarnPercent = settings.VoucherEarnPercent,
            VoucherMaxRedeemPercent = settings.VoucherMaxRedeemPercent,
            Currency = settings.Currency,
            CurrencySymbol = settings.CurrencySymbol
        };
    }

    private static void AddMobileBanking(List<MobileBankingOptionDto> options, List<string> payments,
        bool enabled, string provider, string? merchantNumber)
    {
        if (!enabled || string.IsNullOrWhiteSpace(merchantNumber)) return;
        options.Add(new MobileBankingOptionDto
        {
            Provider = provider,
            AccountNumber = merchantNumber.Trim(),
            Instructions = $"Send the exact total to our {provider} merchant number, then submit the transaction ID with your sender number."
        });
        payments.Add(provider);
    }
}
