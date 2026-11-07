using ECommerce.Application.DTOs;

namespace ECommerce.Application.Services;

public class HomeService
{
    private readonly CatalogService _catalog;
    private readonly ContentService _content;
    private readonly SettingsService _settings;

    public HomeService(CatalogService catalog, ContentService content, SettingsService settings)
    {
        _catalog = catalog;
        _content = content;
        _settings = settings;
    }

    public async Task<HomeFeedDto> GetFeedAsync(string? recentlyViewedIds = null, CancellationToken ct = default)
    {
        var categories = await _catalog.GetCategoriesAsync(false, ct);
        var brands = await _catalog.GetBrandsAsync(false, ct);
        var banners = await _content.GetBannersAsync("Hero", false, ct);
        var promos = await _content.GetBannersAsync("Promo", false, ct);
        banners.AddRange(promos);
        var testimonials = await _content.GetTestimonialsAsync(false, ct);

        var recentlyViewed = string.IsNullOrWhiteSpace(recentlyViewedIds)
            ? new List<ProductSummaryDto>()
            : await _catalog.GetByIdsAsync(recentlyViewedIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Take(8), ct);

        return new HomeFeedDto
        {
            Banners = banners,
            Categories = categories,
            Brands = brands,
            FeaturedProducts = await _catalog.GetCollectionAsync("featured", 8, ct),
            NewArrivals = await _catalog.GetCollectionAsync("latest", 8, ct),
            BestSellers = await _catalog.GetCollectionAsync("bestsellers", 8, ct),
            TrendingProducts = await _catalog.GetCollectionAsync("trending", 8, ct),
            Deals = await _catalog.GetCollectionAsync("deals", 4, ct),
            Testimonials = testimonials,
            RecentlyViewed = recentlyViewed,
            Settings = await _settings.GetAsync(ct)
        };
    }
}
