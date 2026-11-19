using ECommerce.Shared.Common;

namespace ECommerce.Application.DTOs;

public class CategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ParentId { get; set; }
    public string? ImageUrl { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public long ProductCount { get; set; }
    public List<CategoryDto> Children { get; set; } = new();
}

public class CategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ParentId { get; set; }
    public string? ImageUrl { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class BrandDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public long ProductCount { get; set; }
}

public class BrandRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class ProductVariantDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public string? ImageUrl { get; set; }
}

public class ProductVariantRequest
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public string? ImageUrl { get; set; }
}

public class ProductSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal EffectivePrice { get; set; }
    public int DiscountPercent { get; set; }
    public double RatingAverage { get; set; }
    public int ReviewCount { get; set; }
    public int Stock { get; set; }
    public int TotalStock { get; set; }
    public int SoldCount { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; }
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? BrandId { get; set; }
    public string? BrandName { get; set; }
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class ProductDetailDto : ProductSummaryDto
{
    public decimal CostPrice { get; set; }
    public string? ShortDescription { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<string> Images { get; set; } = new();
    public Dictionary<string, string> Specifications { get; set; } = new();
    public List<ProductVariantDto> Variants { get; set; } = new();
    public List<ProductSummaryDto> RelatedProducts { get; set; } = new();
    public int LowStockThreshold { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class ProductRequest
{
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string Description { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? BrandId { get; set; }
    public decimal Price { get; set; }
    public decimal CostPrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public int Stock { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public List<string> Images { get; set; } = new();
    public string? ThumbnailUrl { get; set; }
    public Dictionary<string, string> Specifications { get; set; } = new();
    public List<ProductVariantRequest> Variants { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}

public class ProductQuery : PagedQuery
{
    public string? CategoryId { get; set; }
    public string? CategorySlug { get; set; }
    public string? BrandId { get; set; }
    public string? BrandSlug { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public List<string> Colors { get; set; } = new();
    public List<string> Sizes { get; set; } = new();
    public int? MinRating { get; set; }
    public bool? InStock { get; set; }
    public bool? OnSale { get; set; }
    public bool? IsFeatured { get; set; }
    public bool IncludeInactive { get; set; }
}

public class SearchSuggestionDto
{
    public List<ProductSummaryDto> Products { get; set; } = new();
    public List<CategoryDto> Categories { get; set; } = new();
    public List<BrandDto> Brands { get; set; } = new();
}

public class ReviewDto
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string Comment { get; set; } = string.Empty;
    public bool IsVerifiedPurchase { get; set; }
    public bool IsApproved { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateReviewRequest
{
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string Comment { get; set; } = string.Empty;
}

public class ReviewSummaryDto
{
    public double Average { get; set; }
    public int Total { get; set; }
    public Dictionary<int, int> Distribution { get; set; } = new();
}

public class ReviewListDto
{
    public ReviewSummaryDto Summary { get; set; } = new();
    public List<ReviewDto> Reviews { get; set; } = new();
    public PaginationMeta? Pagination { get; set; }
}
