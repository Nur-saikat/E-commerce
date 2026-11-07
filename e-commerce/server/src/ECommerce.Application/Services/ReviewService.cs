using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class ReviewService
{
    private readonly IUnitOfWork _uow;

    public ReviewService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ReviewListDto> GetProductReviewsAsync(string productId, int page = 1, int pageSize = 10, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(productId, out var pid)) throw new NotFoundException("Product not found");
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var filter = Builders<ProductReview>.Filter.And(
            Builders<ProductReview>.Filter.Eq(r => r.ProductId, pid),
            Builders<ProductReview>.Filter.Eq(r => r.IsDeleted, false),
            Builders<ProductReview>.Filter.Eq(r => r.IsApproved, true));

        var total = await _uow.Reviews.CountAsync(filter, ct);
        var reviews = await _uow.Reviews.Collection.Find(filter)
            .Sort(Builders<ProductReview>.Sort.Descending(r => r.CreatedAt))
            .Skip((page - 1) * pageSize).Limit(pageSize).ToListAsync(ct);

        var all = await _uow.Reviews.FindAsync(r => r.ProductId == pid && !r.IsDeleted && r.IsApproved, ct);
        var summary = new ReviewSummaryDto
        {
            Total = all.Count,
            Average = all.Count == 0 ? 0 : Math.Round(all.Average(r => r.Rating), 1),
            Distribution = Enumerable.Range(1, 5).ToDictionary(i => i, i => all.Count(r => r.Rating == i))
        };

        return new ReviewListDto
        {
            Summary = summary,
            Reviews = reviews.Select(r => r.ToDto()).ToList(),
            Pagination = new PaginationMeta
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            }
        };
    }

    public async Task<ReviewDto> CreateAsync(string productId, CreateReviewRequest request, ObjectId userId, string userName, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(productId, out var pid)) throw new NotFoundException("Product not found");
        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == pid && !p.IsDeleted, ct)
            ?? throw new NotFoundException("Product not found");

        var existing = await _uow.Reviews.FirstOrDefaultAsync(
            r => r.ProductId == pid && r.UserId == userId && !r.IsDeleted, ct);
        if (existing is not null)
            throw new ConflictException("You have already reviewed this product");

        var purchased = await _uow.Orders.Collection.Find(Builders<Order>.Filter.And(
            Builders<Order>.Filter.Eq(o => o.UserId, userId),
            Builders<Order>.Filter.Eq(o => o.IsDeleted, false),
            Builders<Order>.Filter.Ne(o => o.Status, "Cancelled"),
            Builders<Order>.Filter.ElemMatch(o => o.Items, i => i.ProductId == pid))).AnyAsync(ct);

        var review = new ProductReview
        {
            ProductId = pid,
            UserId = userId,
            UserName = userName,
            Rating = Math.Clamp(request.Rating, 1, 5),
            Title = request.Title,
            Comment = request.Comment.Trim(),
            IsApproved = false,
            IsVerifiedPurchase = purchased
        };
        await _uow.Reviews.AddAsync(review, ct);
        return review.ToDto(product.Name);
    }

    public async Task<PagedResult<ReviewDto>> GetMyReviewsAsync(ObjectId userId, PagedQuery query, CancellationToken ct = default)
    {
        var filter = Builders<ProductReview>.Filter.And(
            Builders<ProductReview>.Filter.Eq(r => r.UserId, userId),
            Builders<ProductReview>.Filter.Eq(r => r.IsDeleted, false));
        var total = await _uow.Reviews.CountAsync(filter, ct);
        var reviews = await _uow.Reviews.Collection.Find(filter)
            .Sort(Builders<ProductReview>.Sort.Descending(r => r.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);

        var productIds = reviews.Select(r => r.ProductId).Distinct().ToList();
        var products = productIds.Count == 0 ? new List<Product>() :
            await _uow.Products.FindAsync(p => productIds.Contains(p.Id), ct);
        var names = products.ToDictionary(p => p.Id, p => p.Name);
        return new PagedResult<ReviewDto>(
            reviews.Select(r => r.ToDto(names.GetValueOrDefault(r.ProductId))).ToList(),
            total, query.Page, query.PageSize);
    }

    public async Task<PagedResult<ReviewDto>> GetForAdminAsync(PagedQuery query, bool? approved, CancellationToken ct = default)
    {
        var filters = new List<FilterDefinition<ProductReview>>
        {
            Builders<ProductReview>.Filter.Eq(r => r.IsDeleted, false)
        };
        if (approved.HasValue)
            filters.Add(Builders<ProductReview>.Filter.Eq(r => r.IsApproved, approved.Value));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(query.Search), "i");
            filters.Add(Builders<ProductReview>.Filter.Or(
                Builders<ProductReview>.Filter.Regex(r => r.UserName, pattern),
                Builders<ProductReview>.Filter.Regex(r => r.Comment, pattern)));
        }

        var filter = Builders<ProductReview>.Filter.And(filters);
        var total = await _uow.Reviews.CountAsync(filter, ct);
        var reviews = await _uow.Reviews.Collection.Find(filter)
            .Sort(Builders<ProductReview>.Sort.Descending(r => r.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);

        var productIds = reviews.Select(r => r.ProductId).Distinct().ToList();
        var products = productIds.Count == 0 ? new List<Product>() :
            await _uow.Products.FindAsync(p => productIds.Contains(p.Id), ct);
        var names = products.ToDictionary(p => p.Id, p => p.Name);
        return new PagedResult<ReviewDto>(
            reviews.Select(r => r.ToDto(names.GetValueOrDefault(r.ProductId))).ToList(),
            total, query.Page, query.PageSize);
    }

    public async Task ApproveAsync(string id, string? adminId, CancellationToken ct = default)
    {
        var review = await FindAsync(id, ct);
        review.IsApproved = true;
        review.UpdatedAt = DateTime.UtcNow;
        review.UpdatedBy = adminId;
        await _uow.Reviews.UpdateAsync(review, ct);
        await RecalculateProductRatingAsync(review.ProductId, ct);
    }

    public async Task RejectAsync(string id, string? adminId, CancellationToken ct = default)
    {
        var review = await FindAsync(id, ct);
        review.IsApproved = false;
        review.UpdatedAt = DateTime.UtcNow;
        review.UpdatedBy = adminId;
        await _uow.Reviews.UpdateAsync(review, ct);
        await RecalculateProductRatingAsync(review.ProductId, ct);
    }

    public async Task DeleteAsync(string id, string? adminId, CancellationToken ct = default)
    {
        var review = await FindAsync(id, ct);
        review.IsDeleted = true;
        review.UpdatedAt = DateTime.UtcNow;
        review.UpdatedBy = adminId;
        await _uow.Reviews.UpdateAsync(review, ct);
        await RecalculateProductRatingAsync(review.ProductId, ct);
    }

    private async Task RecalculateProductRatingAsync(ObjectId productId, CancellationToken ct)
    {
        var reviews = await _uow.Reviews.FindAsync(
            r => r.ProductId == productId && r.IsApproved && !r.IsDeleted, ct);
        var average = reviews.Count == 0 ? 0 : reviews.Average(r => r.Rating);
        await _uow.Products.UpdateOneAsync(
            Builders<Product>.Filter.Eq(p => p.Id, productId),
            Builders<Product>.Update
                .Set(p => p.RatingAverage, Math.Round(average, 2))
                .Set(p => p.ReviewCount, reviews.Count), ct);
    }

    private async Task<ProductReview> FindAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Review not found");
        return await _uow.Reviews.FirstOrDefaultAsync(r => r.Id == objectId && !r.IsDeleted, ct)
            ?? throw new NotFoundException("Review not found");
    }
}
