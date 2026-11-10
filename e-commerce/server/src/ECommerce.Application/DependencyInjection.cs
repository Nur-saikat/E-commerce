using ECommerce.Application.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerce.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<AuthService>();

        services.AddScoped<SettingsService>();
        services.AddScoped<CatalogService>();
        services.AddScoped<ReviewService>();
        services.AddScoped<CouponService>();
        services.AddScoped<CartService>();
        services.AddScoped<WishlistService>();
        services.AddScoped<VoucherService>();
        services.AddScoped<OrderService>();
        services.AddScoped<ReturnService>();
        services.AddScoped<PaymentService>();
        services.AddScoped<AuthService>();
        services.AddScoped<AccountService>();
        services.AddScoped<ContentService>();
        services.AddScoped<HomeService>();
        services.AddScoped<AdminService>();
        services.AddScoped<BusinessService>();
        return services;
    }
}
