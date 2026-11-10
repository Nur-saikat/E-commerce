using System.Text.RegularExpressions;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class CatalogService
{
    private readonly IUnitOfWork _uow;

    public CatalogService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<PagedResult<ProductSummaryDto>> GetProductsAsync(ProductQuery query, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<Product>>
        {
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false)
        };

        if (!query.IncludeInactive)
            filters.Add(Builders<Product>.Filter.Eq(p => p.IsActive, true));

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(query.Search.Trim()), "i");
            filters.Add(Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Regex(p => p.Name, pattern),
                Builders<Product>.Filter.Regex(p => p.Sku, pattern),
                Builders<Product>.Filter.AnyEq(p => p.Tags, query.Search.Trim())));
        }

        FilterDefinition<Product>? categoryFilter = null;
        if (!string.IsNullOrWhiteSpace(query.CategoryId))
        {
            if (ObjectId.TryParse(query.CategoryId, out var categoryId))
            {
                var childIds = new List<ObjectId> { categoryId };
                var children = await _uow.Categories.FindAsync(c => !c.IsDeleted && c.ParentId == categoryId, ct);
                childIds.AddRange(children.Select(c => c.Id));
                categoryFilter = Builders<Product>.Filter.In(p => p.CategoryId, childIds);
            }
        }
        else if (!string.IsNullOrWhiteSpace(query.CategorySlug))
        {
            var category = await _uow.Categories.FirstOrDefaultAsync(c => !c.IsDeleted && c.Slug == query.CategorySlug, ct);
            if (category is null) return new PagedResult<ProductSummaryDto>(new(), 0, query.Page, query.PageSize);
            var childIds = new List<ObjectId> { category.Id };
            var children = await _uow.Categories.FindAsync(c => !c.IsDeleted && c.ParentId == category.Id, ct);
            childIds.AddRange(children.Select(c => c.Id));
            categoryFilter = Builders<Product>.Filter.In(p => p.CategoryId, childIds);
        }
        if (categoryFilter is not null) filters.Add(categoryFilter);

        if (!string.IsNullOrWhiteSpace(query.BrandId) && ObjectId.TryParse(query.BrandId, out var brandId))
            filters.Add(Builders<Product>.Filter.Eq(p => p.BrandId, brandId));
        else if (!string.IsNullOrWhiteSpace(query.BrandSlug))
        {
            var brand = await _uow.Brands.FirstOrDefaultAsync(b => !b.IsDeleted && b.Slug == query.BrandSlug, ct);
            if (brand is null) return new PagedResult<ProductSummaryDto>(new(), 0, query.Page, query.PageSize);
            filters.Add(Builders<Product>.Filter.Eq(p => p.BrandId, brand.Id));
        }

        var priceExpr = EffectivePriceExpression();
        var priceConditions = new BsonArray();
        if (query.MinPrice.HasValue)
            priceConditions.Add(new BsonDocument("$gte", new BsonArray { priceExpr, query.MinPrice.Value }));
        if (query.MaxPrice.HasValue)
            priceConditions.Add(new BsonDocument("$lte", new BsonArray { priceExpr, query.MaxPrice.Value }));
        if (priceConditions.Count > 0)
            filters.Add(new BsonDocument("$expr", new BsonDocument("$and", priceConditions)));

        if (query.Colors.Count > 0)
            filters.Add(VariantAttributeFilter("Color", query.Colors));
        if (query.Sizes.Count > 0)
            filters.Add(VariantAttributeFilter("Size", query.Sizes));
        if (query.MinRating.HasValue)
            filters.Add(Builders<Product>.Filter.Gte(p => p.RatingAverage, query.MinRating.Value));
        if (query.OnSale == true)
        {
            filters.Add(Builders<Product>.Filter.And(
                Builders<Product>.Filter.Ne(p => p.DiscountPrice, null),
                Builders<Product>.Filter.Gt(p => p.DiscountPrice, 0),
                new BsonDocument("$expr", new BsonDocument("$lt", new BsonArray { "$discountPrice", "$price" }))));
        }
        if (query.IsFeatured.HasValue)
            filters.Add(Builders<Product>.Filter.Eq(p => p.IsFeatured, query.IsFeatured.Value));
        if (query.InStock == true)
        {
            filters.Add(new BsonDocument("$expr", new BsonDocument("$gt", new BsonArray
            {
                new BsonDocument("$add", new BsonArray
                {
                    "$stock",
                    new BsonDocument("$sum", "$variants.stock")
                }),
                0
            })));
        }

        var filter = Builders<Product>.Filter.And(filters);
        var total = await _uow.Products.Collection.CountDocumentsAsync(filter, cancellationToken: ct);

        var sort = BuildSort(query);
        var products = await _uow.Products.Collection
            .Find(filter)
            .Sort(sort)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(ct);

        var items = await MapSummariesAsync(products, ct);
        return new PagedResult<ProductSummaryDto>(items, total, query.Page, query.PageSize);
    }

    public async Task<ProductDetailDto> GetProductAsync(string idOrSlug, bool includeInactive = false, CancellationToken ct = default, bool includeCost = false)
    {
        Product? product;
        if (ObjectId.TryParse(idOrSlug, out var objectId))
            product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == objectId && !p.IsDeleted, ct);
        else
            product = await _uow.Products.FirstOrDefaultAsync(p => p.Slug == idOrSlug && !p.IsDeleted, ct);

        if (product is null || (!includeInactive && !product.IsActive))
            throw new NotFoundException("Product not found");

        await _uow.Products.UpdateOneAsync(
            Builders<Product>.Filter.Eq(p => p.Id, product.Id),
            Builders<Product>.Update.Inc(p => p.ViewCount, 1), ct);

        var dto = await MapDetailAsync(product, ct);
        if (includeCost) dto.CostPrice = product.CostPrice;
        var related = await _uow.Products.Collection
            .Find(Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.IsDeleted, false),
                Builders<Product>.Filter.Eq(p => p.IsActive, true),
                Builders<Product>.Filter.Eq(p => p.CategoryId, product.CategoryId),
                Builders<Product>.Filter.Ne(p => p.Id, product.Id)))
            .Sort(Builders<Product>.Sort.Descending(p => p.SoldCount))
            .Limit(4)
            .ToListAsync(ct);
        dto.RelatedProducts = await MapSummariesAsync(related, ct);
        return dto;
    }

    public async Task<List<ProductSummaryDto>> GetCollectionAsync(string type, int limit = 8, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<Product>>
        {
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false),
            Builders<Product>.Filter.Eq(p => p.IsActive, true)
        };
        SortDefinition<Product> sort = Builders<Product>.Sort.Descending(p => p.CreatedAt);

        switch (type.ToLowerInvariant())
        {
            case "featured":
                filters.Add(Builders<Product>.Filter.Eq(p => p.IsFeatured, true));
                sort = Builders<Product>.Sort.Descending(p => p.CreatedAt);
                break;
            case "latest":
            case "new":
                sort = Builders<Product>.Sort.Descending(p => p.CreatedAt);
                break;
            case "bestsellers":
                sort = Builders<Product>.Sort.Descending(p => p.SoldCount);
                break;
            case "trending":
                sort = Builders<Product>.Sort.Descending(p => p.ViewCount);
                break;
            case "deals":
                filters.Add(Builders<Product>.Filter.And(
                    Builders<Product>.Filter.Ne(p => p.DiscountPrice, null),
                    Builders<Product>.Filter.Gt(p => p.DiscountPrice, 0)));
                sort = Builders<Product>.Sort.Descending(p => p.SoldCount);
                break;
            default:
                type = "featured";
                filters.Add(Builders<Product>.Filter.Eq(p => p.IsFeatured, true));
                break;
        }

        var products = await _uow.Products.Collection.Find(Builders<Product>.Filter.And(filters))
            .Sort(sort).Limit(Math.Clamp(limit, 1, 24)).ToListAsync(ct);
        return await MapSummariesAsync(products, ct);
    }

    public async Task<List<ProductSummaryDto>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken ct = default)
    {
        var objectIds = ids.Select(i => ObjectId.TryParse(i, out var id) ? (ObjectId?)id : null)
            .Where(i => i.HasValue).Select(i => i!.Value).ToList();
        if (objectIds.Count == 0) return new();

        var products = await _uow.Products.Collection
            .Find(Builders<Product>.Filter.And(
                Builders<Product>.Filter.In(p => p.Id, objectIds),
                Builders<Product>.Filter.Eq(p => p.IsDeleted, false),
                Builders<Product>.Filter.Eq(p => p.IsActive, true)))
            .ToListAsync(ct);
        var map = (await MapSummariesAsync(products, ct)).ToDictionary(p => p.Id);
        return objectIds.Where(id => map.ContainsKey(id.ToString())).Select(id => map[id.ToString()]).ToList();
    }

    public async Task<SearchSuggestionDto> SuggestAsync(string term, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(term)) return new SearchSuggestionDto();
        var pattern = new BsonRegularExpression(Regex.Escape(term.Trim()), "i");
        var products = await _uow.Products.Collection.Find(Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.IsDeleted, false),
                Builders<Product>.Filter.Eq(p => p.IsActive, true),
                Builders<Product>.Filter.Or(
                    Builders<Product>.Filter.Regex(p => p.Name, pattern),
                    Builders<Product>.Filter.Regex(p => p.Sku, pattern))))
            .Limit(6).ToListAsync(ct);
        var categories = await _uow.Categories.FindAsync(c => !c.IsDeleted && c.IsActive &&
            Regex.IsMatch(c.Name, Regex.Escape(term), RegexOptions.IgnoreCase), ct);
        var brands = await _uow.Brands.FindAsync(b => !b.IsDeleted && b.IsActive &&
            Regex.IsMatch(b.Name, Regex.Escape(term), RegexOptions.IgnoreCase), ct);

        return new SearchSuggestionDto
        {
            Products = await MapSummariesAsync(products, ct),
            Categories = categories.Take(5).Select(c => c.ToDto()).ToList(),
            Brands = brands.Take(5).Select(b => b.ToDto()).ToList()
        };
    }

    public async Task<FilterOptionsDto> GetFilterOptionsAsync(string? categoryId, string? categorySlug, CancellationToken ct = default)
    {
        var filter = Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false),
            Builders<Product>.Filter.Eq(p => p.IsActive, true));

        FilterDefinition<Product>? categoryFilter = null;
        if (!string.IsNullOrWhiteSpace(categoryId) && ObjectId.TryParse(categoryId, out var cid))
        {
            var children = await _uow.Categories.FindAsync(c => !c.IsDeleted && c.ParentId == cid, ct);
            var ids = new List<ObjectId> { cid };
            ids.AddRange(children.Select(c => c.Id));
            categoryFilter = Builders<Product>.Filter.In(p => p.CategoryId, ids);
        }
        else if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            var category = await _uow.Categories.FirstOrDefaultAsync(c => c.Slug == categorySlug && !c.IsDeleted, ct);
            if (category is not null)
            {
                var children = await _uow.Categories.FindAsync(c => !c.IsDeleted && c.ParentId == category.Id, ct);
                var ids = new List<ObjectId> { category.Id };
                ids.AddRange(children.Select(c => c.Id));
                categoryFilter = Builders<Product>.Filter.In(p => p.CategoryId, ids);
            }
        }
        if (categoryFilter is not null) filter = Builders<Product>.Filter.And(filter, categoryFilter);

        var products = await _uow.Products.Collection.Find(filter).ToListAsync(ct);
        var prices = products.Select(p => p.EffectivePrice).ToList();
        var colors = products.SelectMany(p => p.Variants)
            .Select(v => v.Attributes.GetValueOrDefault("Color"))
            .Where(v => !string.IsNullOrWhiteSpace(v)).Distinct().OrderBy(v => v).Cast<string>().ToList();
        var sizes = products.SelectMany(p => p.Variants)
            .Select(v => v.Attributes.GetValueOrDefault("Size"))
            .Where(v => !string.IsNullOrWhiteSpace(v)).Distinct().OrderBy(v => v).Cast<string>().ToList();

        return new FilterOptionsDto
        {
            MinPrice = prices.Count > 0 ? Math.Floor(prices.Min()) : 0,
            MaxPrice = prices.Count > 0 ? Math.Ceiling(prices.Max()) : 1000,
            Colors = colors,
            Sizes = sizes,
            Brands = await GetBrandsAsync(false, ct),
            Categories = await GetCategoriesAsync(false, ct)
        };
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync(bool includeInactive = false, CancellationToken ct = default)
    {
        var filter = includeInactive
            ? Builders<Category>.Filter.Eq(c => c.IsDeleted, false)
            : Builders<Category>.Filter.And(
                Builders<Category>.Filter.Eq(c => c.IsDeleted, false),
                Builders<Category>.Filter.Eq(c => c.IsActive, true));
        var categories = await _uow.Categories.Collection.Find(filter)
            .Sort(Builders<Category>.Sort.Ascending(c => c.SortOrder).Ascending(c => c.Name))
            .ToListAsync(ct);
        var counts = await GetCategoryProductCountsAsync(ct);

        var dtos = categories.Select(c => c.ToDto(counts.GetValueOrDefault(c.Id))).ToList();
        var lookup = dtos.ToDictionary(c => c.Id);
        foreach (var dto in dtos)
        {
            if (!string.IsNullOrEmpty(dto.ParentId) && lookup.TryGetValue(dto.ParentId, out var parent))
                parent.Children.Add(dto);
        }
        return dtos.Where(c => string.IsNullOrEmpty(c.ParentId)).ToList();
    }

    public async Task<CategoryDto> GetCategoryAsync(string idOrSlug, CancellationToken ct = default)
    {
        var category = await FindCategoryAsync(idOrSlug, ct) ?? throw new NotFoundException("Category not found");
        var count = await _uow.Products.CountAsync(Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.CategoryId, category.Id),
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false)), ct);
        return category.ToDto(count);
    }

    public async Task<CategoryDto> CreateCategoryAsync(CategoryRequest request, string? userId, CancellationToken ct = default)
    {
        var slug = request.Name.ToSlug();
        if (await _uow.Categories.FirstOrDefaultAsync(c => c.Slug == slug && !c.IsDeleted, ct) is not null)
            throw new ConflictException("A category with this name already exists");

        ObjectId? parentId = null;
        if (!string.IsNullOrWhiteSpace(request.ParentId))
        {
            if (!ObjectId.TryParse(request.ParentId, out var pid))
                throw new BadRequestException("Invalid parent category");
            if (await _uow.Categories.FirstOrDefaultAsync(c => c.Id == pid && !c.IsDeleted, ct) is null)
                throw new BadRequestException("Parent category not found");
            parentId = pid;
        }

        var category = new Category
        {
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description,
            ParentId = parentId,
            ImageUrl = request.ImageUrl,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder,
            CreatedBy = userId
        };
        await _uow.Categories.AddAsync(category, ct);
        return category.ToDto();
    }

    public async Task<CategoryDto> UpdateCategoryAsync(string id, CategoryRequest request, string? userId, CancellationToken ct = default)
    {
        var category = await FindCategoryAsync(id, ct) ?? throw new NotFoundException("Category not found");
        var slug = request.Name.ToSlug();
        var duplicate = await _uow.Categories.FirstOrDefaultAsync(c => c.Slug == slug && c.Id != category.Id && !c.IsDeleted, ct);
        if (duplicate is not null) throw new ConflictException("A category with this name already exists");

        if (!string.IsNullOrWhiteSpace(request.ParentId))
        {
            if (!ObjectId.TryParse(request.ParentId, out var pid)) throw new BadRequestException("Invalid parent category");
            if (pid == category.Id) throw new BadRequestException("A category cannot be its own parent");
            var children = await _uow.Categories.FindAsync(c => c.ParentId == category.Id && !c.IsDeleted, ct);
            if (children.Any(c => c.Id == pid)) throw new BadRequestException("Invalid parent category");
            category.ParentId = pid;
        }
        else category.ParentId = null;

        category.Name = request.Name.Trim();
        category.Slug = slug;
        category.Description = request.Description;
        category.ImageUrl = request.ImageUrl;
        category.SeoTitle = request.SeoTitle;
        category.SeoDescription = request.SeoDescription;
        category.IsActive = request.IsActive;
        category.SortOrder = request.SortOrder;
        category.UpdatedAt = DateTime.UtcNow;
        category.UpdatedBy = userId;
        await _uow.Categories.UpdateAsync(category, ct);
        return category.ToDto();
    }

    public async Task DeleteCategoryAsync(string id, string? userId, CancellationToken ct = default)
    {
        var category = await FindCategoryAsync(id, ct) ?? throw new NotFoundException("Category not found");
        var hasProducts = await _uow.Products.CountAsync(Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.CategoryId, category.Id),
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false)), ct) > 0;
        if (hasProducts) throw new ConflictException("Cannot delete a category that still has products");

        var hasChildren = await _uow.Categories.CountAsync(Builders<Category>.Filter.And(
            Builders<Category>.Filter.Eq(c => c.ParentId, category.Id),
            Builders<Category>.Filter.Eq(c => c.IsDeleted, false)), ct) > 0;
        if (hasChildren) throw new ConflictException("Cannot delete a category that has subcategories");

        category.IsDeleted = true;
        category.UpdatedAt = DateTime.UtcNow;
        category.UpdatedBy = userId;
        await _uow.Categories.UpdateAsync(category, ct);
    }

    public async Task<List<BrandDto>> GetBrandsAsync(bool includeInactive = false, CancellationToken ct = default)
    {
        var filter = includeInactive
            ? Builders<Brand>.Filter.Eq(b => b.IsDeleted, false)
            : Builders<Brand>.Filter.And(
                Builders<Brand>.Filter.Eq(b => b.IsDeleted, false),
                Builders<Brand>.Filter.Eq(b => b.IsActive, true));
        var brands = await _uow.Brands.Collection.Find(filter)
            .Sort(Builders<Brand>.Sort.Ascending(b => b.SortOrder).Ascending(b => b.Name)).ToListAsync(ct);

        var counts = new Dictionary<ObjectId, long>();
        foreach (var brand in brands)
        {
            counts[brand.Id] = await _uow.Products.CountAsync(Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.BrandId, brand.Id),
                Builders<Product>.Filter.Eq(p => p.IsDeleted, false)), ct);
        }
        return brands.Select(b => b.ToDto(counts.GetValueOrDefault(b.Id))).ToList();
    }

    public async Task<BrandDto> GetBrandAsync(string idOrSlug, CancellationToken ct = default)
    {
        var brand = await FindBrandAsync(idOrSlug, ct) ?? throw new NotFoundException("Brand not found");
        var count = await _uow.Products.CountAsync(Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.BrandId, brand.Id),
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false)), ct);
        return brand.ToDto(count);
    }

    public async Task<BrandDto> CreateBrandAsync(BrandRequest request, string? userId, CancellationToken ct = default)
    {
        var slug = request.Name.ToSlug();
        if (await _uow.Brands.FirstOrDefaultAsync(b => b.Slug == slug && !b.IsDeleted, ct) is not null)
            throw new ConflictException("A brand with this name already exists");

        var brand = new Brand
        {
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description,
            LogoUrl = request.LogoUrl,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder,
            CreatedBy = userId
        };
        await _uow.Brands.AddAsync(brand, ct);
        return brand.ToDto();
    }

    public async Task<BrandDto> UpdateBrandAsync(string id, BrandRequest request, string? userId, CancellationToken ct = default)
    {
        var brand = await FindBrandAsync(id, ct) ?? throw new NotFoundException("Brand not found");
        var slug = request.Name.ToSlug();
        var duplicate = await _uow.Brands.FirstOrDefaultAsync(b => b.Slug == slug && b.Id != brand.Id && !b.IsDeleted, ct);
        if (duplicate is not null) throw new ConflictException("A brand with this name already exists");

        brand.Name = request.Name.Trim();
        brand.Slug = slug;
        brand.Description = request.Description;
        brand.LogoUrl = request.LogoUrl;
        brand.IsActive = request.IsActive;
        brand.SortOrder = request.SortOrder;
        brand.UpdatedAt = DateTime.UtcNow;
        brand.UpdatedBy = userId;
        await _uow.Brands.UpdateAsync(brand, ct);
        return brand.ToDto();
    }

    public async Task DeleteBrandAsync(string id, string? userId, CancellationToken ct = default)
    {
        var brand = await FindBrandAsync(id, ct) ?? throw new NotFoundException("Brand not found");
        var hasProducts = await _uow.Products.CountAsync(Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.BrandId, brand.Id),
            Builders<Product>.Filter.Eq(p => p.IsDeleted, false)), ct) > 0;
        if (hasProducts) throw new ConflictException("Cannot delete a brand that still has products");

        brand.IsDeleted = true;
        brand.UpdatedAt = DateTime.UtcNow;
        brand.UpdatedBy = userId;
        await _uow.Brands.UpdateAsync(brand, ct);
    }

    public async Task<ProductDetailDto> CreateProductAsync(ProductRequest request, string? userId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(request.CategoryId, out var categoryId))
            throw new BadRequestException("Invalid category");

        var category = await _uow.Categories.FirstOrDefaultAsync(c => c.Id == categoryId && !c.IsDeleted, ct)
            ?? throw new BadRequestException("Category not found");

        ObjectId? brandId = null;
        if (!string.IsNullOrWhiteSpace(request.BrandId))
        {
            if (!ObjectId.TryParse(request.BrandId, out var bid))
                throw new BadRequestException("Invalid brand");
            if (await _uow.Brands.FirstOrDefaultAsync(b => b.Id == bid && !b.IsDeleted, ct) is null)
                throw new BadRequestException("Brand not found");
            brandId = bid;
        }

        if (await _uow.Products.FirstOrDefaultAsync(p => p.Sku == request.Sku && !p.IsDeleted, ct) is not null)
            throw new ConflictException("A product with this SKU already exists");

        var product = new Product
        {
            Name = request.Name.Trim(),
            Slug = await UniqueSlugAsync(request.Name, null, ct),
            Sku = request.Sku.Trim(),
            ShortDescription = request.ShortDescription,
            Description = request.Description,
            CategoryId = category.Id,
            BrandId = brandId,
            Price = request.Price,
            CostPrice = request.CostPrice,
            DiscountPrice = request.DiscountPrice,
            Stock = request.Stock,
            LowStockThreshold = request.LowStockThreshold,
            Images = request.Images,
            ThumbnailUrl = request.ThumbnailUrl ?? request.Images.FirstOrDefault(),
            Specifications = request.Specifications ?? new(),
            Variants = MapVariants(request.Variants),
            Tags = request.Tags,
            IsFeatured = request.IsFeatured,
            IsActive = request.IsActive,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
            CreatedBy = userId
        };
        await _uow.Products.AddAsync(product, ct);

        if (product.Stock > 0)
        {
            await _uow.InventoryTransactions.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id.ToString(),
                ProductName = product.Name,
                Type = "StockIn",
                QuantityChange = product.Stock,
                StockAfter = product.Stock,
                Note = "Initial stock",
                Reference = product.Sku,
                CreatedBy = userId
            }, ct);
        }
        return await MapDetailAsync(product, ct);
    }

    public async Task<ProductDetailDto> UpdateProductAsync(string id, ProductRequest request, string? userId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Product not found");
        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == objectId && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Product not found");

        if (!ObjectId.TryParse(request.CategoryId, out var categoryId))
            throw new BadRequestException("Invalid category");
        var category = await _uow.Categories.FirstOrDefaultAsync(c => c.Id == categoryId && !c.IsDeleted, ct)
            ?? throw new BadRequestException("Category not found");

        if (!string.Equals(product.Sku, request.Sku, StringComparison.OrdinalIgnoreCase))
        {
            if (await _uow.Products.FirstOrDefaultAsync(p => p.Sku == request.Sku && p.Id != product.Id && !p.IsDeleted, ct) is not null)
                throw new ConflictException("A product with this SKU already exists");
        }

        ObjectId? brandId = null;
        if (!string.IsNullOrWhiteSpace(request.BrandId))
        {
            if (!ObjectId.TryParse(request.BrandId, out var bid))
                throw new BadRequestException("Invalid brand");
            if (await _uow.Brands.FirstOrDefaultAsync(b => b.Id == bid && !b.IsDeleted, ct) is null)
                throw new BadRequestException("Brand not found");
            brandId = bid;
        }

        product.Name = request.Name.Trim();
        if (!string.Equals(product.Slug, request.Name.ToSlug(), StringComparison.Ordinal))
            product.Slug = await UniqueSlugAsync(request.Name, product.Id, ct);
        product.Sku = request.Sku.Trim();
        product.ShortDescription = request.ShortDescription;
        product.Description = request.Description;
        product.CategoryId = category.Id;
        product.BrandId = brandId;
        product.Price = request.Price;
        product.CostPrice = request.CostPrice;
        product.DiscountPrice = request.DiscountPrice;
        product.Stock = request.Stock;
        product.LowStockThreshold = request.LowStockThreshold;
        product.Images = request.Images;
        product.ThumbnailUrl = request.ThumbnailUrl ?? request.Images.FirstOrDefault();
        product.Specifications = request.Specifications ?? new();
        product.Variants = MapVariants(request.Variants);
        product.Tags = request.Tags;
        product.IsFeatured = request.IsFeatured;
        product.IsActive = request.IsActive;
        product.SeoTitle = request.SeoTitle;
        product.SeoDescription = request.SeoDescription;
        product.UpdatedAt = DateTime.UtcNow;
        product.UpdatedBy = userId;
        await _uow.Products.UpdateAsync(product, ct);
        return await MapDetailAsync(product, ct);
    }

    public async Task DeleteProductAsync(string id, string? userId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Product not found");
        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == objectId && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Product not found");
        product.IsDeleted = true;
        product.UpdatedAt = DateTime.UtcNow;
        product.UpdatedBy = userId;
        await _uow.Products.UpdateAsync(product, ct);
    }

    public async Task<ProductDetailDto> MapDetailAsync(Product product, CancellationToken ct = default)
    {
        var categoryName = (await _uow.Categories.GetByIdAsync(product.CategoryId, ct))?.Name;
        var brandName = product.BrandId.HasValue ? (await _uow.Brands.GetByIdAsync(product.BrandId.Value, ct))?.Name : null;
        return product.ToDetail(categoryName, brandName);
    }

    public async Task<List<ProductSummaryDto>> MapSummariesAsync(List<Product> products, CancellationToken ct = default)
    {
        if (products.Count == 0) return new();
        var categoryIds = products.Select(p => p.CategoryId).Distinct().ToList();
        var brandIds = products.Where(p => p.BrandId.HasValue).Select(p => p.BrandId!.Value).Distinct().ToList();
        var categories = await _uow.Categories.FindAsync(c => categoryIds.Contains(c.Id), ct);
        var brands = brandIds.Count == 0 ? new List<Brand>() : await _uow.Brands.FindAsync(b => brandIds.Contains(b.Id), ct);
        var categoryMap = categories.ToDictionary(c => c.Id, c => c.Name);
        var brandMap = brands.ToDictionary(b => b.Id, b => b.Name);
        return products.Select(p => p.ToSummary(
            categoryMap.GetValueOrDefault(p.CategoryId),
            p.BrandId.HasValue ? brandMap.GetValueOrDefault(p.BrandId.Value) : null)).ToList();
    }

    private async Task<Category?> FindCategoryAsync(string idOrSlug, CancellationToken ct) =>
        ObjectId.TryParse(idOrSlug, out var id)
            ? await _uow.Categories.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct)
            : await _uow.Categories.FirstOrDefaultAsync(c => c.Slug == idOrSlug && !c.IsDeleted, ct);

    private async Task<Brand?> FindBrandAsync(string idOrSlug, CancellationToken ct) =>
        ObjectId.TryParse(idOrSlug, out var id)
            ? await _uow.Brands.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted, ct)
            : await _uow.Brands.FirstOrDefaultAsync(b => b.Slug == idOrSlug && !b.IsDeleted, ct);

    private async Task<Dictionary<ObjectId, long>> GetCategoryProductCountsAsync(CancellationToken ct)
    {
        var pipeline = new[]
        {
            new BsonDocument("$match", new BsonDocument("IsDeleted", false)),
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", "$CategoryId" },
                { "count", new BsonDocument("$sum", 1) }
            })
        };
        var result = await _uow.Products.Collection.AggregateAsync<BsonDocument>(pipeline, cancellationToken: ct);
        var list = await result.ToListAsync(ct);
        return list.ToDictionary(d => d["_id"].AsObjectId, d => d["count"].ToInt64());
    }

    private async Task<string> UniqueSlugAsync(string name, ObjectId? excludeId, CancellationToken ct)
    {
        var slug = name.ToSlug();
        var existing = await _uow.Products.FirstOrDefaultAsync(p => p.Slug == slug && p.Id != excludeId && !p.IsDeleted, ct);
        return existing is null ? slug : $"{slug}-{Guid.NewGuid().ToString("n")[..6]}";
    }

    private static List<ProductVariant> MapVariants(List<ProductVariantRequest>? variants) =>
        (variants ?? new()).Select(v => new ProductVariant
        {
            Id = !string.IsNullOrWhiteSpace(v.Id) && ObjectId.TryParse(v.Id, out var vid) ? vid : ObjectId.GenerateNewId(),
            Name = v.Name,
            Sku = v.Sku,
            Price = v.Price,
            Stock = v.Stock,
            Attributes = v.Attributes ?? new(),
            ImageUrl = v.ImageUrl
        }).ToList();

    private static BsonDocument EffectivePriceExpression() => new("$cond", new BsonArray
    {
        new BsonDocument("$and", new BsonArray
        {
            new BsonDocument("$gt", new BsonArray { "$discountPrice", BsonNull.Value }),
            new BsonDocument("$gt", new BsonArray { "$discountPrice", 0 }),
            new BsonDocument("$lt", new BsonArray { "$discountPrice", "$price" })
        }),
        "$discountPrice",
        "$price"
    });

    private static FilterDefinition<Product> VariantAttributeFilter(string attribute, IEnumerable<string> values) =>
        new BsonDocument("variants", new BsonDocument("$elemMatch", new BsonDocument(
            $"Attributes.{attribute}",
            new BsonDocument("$in", new BsonArray(values)))));

    private static SortDefinition<Product> BuildSort(ProductQuery query)
    {
        var descending = query.Descending;
        return (query.SortBy?.ToLowerInvariant()) switch
        {
            "price" => descending ? Builders<Product>.Sort.Descending(p => p.Price) : Builders<Product>.Sort.Ascending(p => p.Price),
            "rating" => descending ? Builders<Product>.Sort.Descending(p => p.RatingAverage) : Builders<Product>.Sort.Ascending(p => p.RatingAverage),
            "popularity" or "bestselling" => Builders<Product>.Sort.Descending(p => p.SoldCount),
            "name" => descending ? Builders<Product>.Sort.Descending(p => p.Name) : Builders<Product>.Sort.Ascending(p => p.Name),
            "latest" or "newest" => Builders<Product>.Sort.Descending(p => p.CreatedAt),
            _ => Builders<Product>.Sort.Descending(p => p.CreatedAt)
        };
    }
}
