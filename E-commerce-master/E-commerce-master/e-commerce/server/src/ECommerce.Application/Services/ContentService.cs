using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class ContentService
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUser _currentUser;

    public ContentService(IUnitOfWork uow, ICurrentUser currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<List<BannerDto>> GetBannersAsync(string? position = null, bool includeInactive = false, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var filters = new List<FilterDefinition<Banner>>
        {
            Builders<Banner>.Filter.Eq(b => b.IsDeleted, false)
        };
        if (!includeInactive)
        {
            filters.Add(Builders<Banner>.Filter.Eq(b => b.IsActive, true));
            filters.Add(Builders<Banner>.Filter.Or(
                Builders<Banner>.Filter.Eq(b => b.StartAt, null),
                Builders<Banner>.Filter.Lte(b => b.StartAt, now)));
            filters.Add(Builders<Banner>.Filter.Or(
                Builders<Banner>.Filter.Eq(b => b.EndAt, null),
                Builders<Banner>.Filter.Gte(b => b.EndAt, now)));
        }
        if (!string.IsNullOrWhiteSpace(position))
            filters.Add(Builders<Banner>.Filter.Eq(b => b.Position, position));

        var banners = await _uow.Banners.Collection.Find(Builders<Banner>.Filter.And(filters))
            .Sort(Builders<Banner>.Sort.Ascending(b => b.SortOrder)).ToListAsync(ct);
        return banners.Select(b => b.ToDto()).ToList();
    }

    public async Task<BannerDto> CreateBannerAsync(BannerRequest request, CancellationToken ct = default)
    {
        var banner = new Banner
        {
            Title = request.Title.Trim(),
            Subtitle = request.Subtitle,
            ImageUrl = request.ImageUrl,
            LinkUrl = request.LinkUrl,
            ButtonText = request.ButtonText,
            Position = request.Position,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            CreatedBy = _currentUser.UserId
        };
        await _uow.Banners.AddAsync(banner, ct);
        return banner.ToDto();
    }

    public async Task<BannerDto> UpdateBannerAsync(string id, BannerRequest request, CancellationToken ct = default)
    {
        var banner = await FindBannerAsync(id, ct);
        banner.Title = request.Title.Trim();
        banner.Subtitle = request.Subtitle;
        banner.ImageUrl = request.ImageUrl;
        banner.LinkUrl = request.LinkUrl;
        banner.ButtonText = request.ButtonText;
        banner.Position = request.Position;
        banner.SortOrder = request.SortOrder;
        banner.IsActive = request.IsActive;
        banner.StartAt = request.StartAt;
        banner.EndAt = request.EndAt;
        banner.UpdatedAt = DateTime.UtcNow;
        banner.UpdatedBy = _currentUser.UserId;
        await _uow.Banners.UpdateAsync(banner, ct);
        return banner.ToDto();
    }

    public async Task DeleteBannerAsync(string id, CancellationToken ct = default)
    {
        var banner = await FindBannerAsync(id, ct);
        banner.IsDeleted = true;
        banner.UpdatedAt = DateTime.UtcNow;
        await _uow.Banners.UpdateAsync(banner, ct);
    }

    public async Task<List<TestimonialDto>> GetTestimonialsAsync(bool includeInactive = false, CancellationToken ct = default)
    {
        var testimonials = includeInactive
            ? await _uow.Testimonials.FindAsync(t => !t.IsDeleted, ct)
            : await _uow.Testimonials.FindAsync(t => !t.IsDeleted && t.IsActive, ct);
        return testimonials.OrderBy(t => t.SortOrder).Select(t => t.ToDto()).ToList();
    }

    public async Task<TestimonialDto> CreateTestimonialAsync(TestimonialRequest request, CancellationToken ct = default)
    {
        var testimonial = new Testimonial
        {
            Name = request.Name.Trim(),
            Role = request.Role,
            AvatarUrl = request.AvatarUrl,
            Rating = Math.Clamp(request.Rating, 1, 5),
            Quote = request.Quote.Trim(),
            IsActive = request.IsActive,
            SortOrder = request.SortOrder,
            CreatedBy = _currentUser.UserId
        };
        await _uow.Testimonials.AddAsync(testimonial, ct);
        return testimonial.ToDto();
    }

    public async Task<TestimonialDto> UpdateTestimonialAsync(string id, TestimonialRequest request, CancellationToken ct = default)
    {
        var testimonial = await FindTestimonialAsync(id, ct);
        testimonial.Name = request.Name.Trim();
        testimonial.Role = request.Role;
        testimonial.AvatarUrl = request.AvatarUrl;
        testimonial.Rating = Math.Clamp(request.Rating, 1, 5);
        testimonial.Quote = request.Quote.Trim();
        testimonial.IsActive = request.IsActive;
        testimonial.SortOrder = request.SortOrder;
        testimonial.UpdatedAt = DateTime.UtcNow;
        testimonial.UpdatedBy = _currentUser.UserId;
        await _uow.Testimonials.UpdateAsync(testimonial, ct);
        return testimonial.ToDto();
    }

    public async Task DeleteTestimonialAsync(string id, CancellationToken ct = default)
    {
        var testimonial = await FindTestimonialAsync(id, ct);
        testimonial.IsDeleted = true;
        testimonial.UpdatedAt = DateTime.UtcNow;
        await _uow.Testimonials.UpdateAsync(testimonial, ct);
    }

    public async Task SubmitContactAsync(ContactRequest request, CancellationToken ct = default)
    {
        await _uow.ContactMessages.AddAsync(new ContactMessage
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone,
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim()
        }, ct);
    }

    public async Task<PagedResult<ContactMessageDto>> GetContactMessagesAsync(PagedQuery query, CancellationToken ct = default)
    {
        var total = await _uow.ContactMessages.CountAsync(
            Builders<ContactMessage>.Filter.Eq(m => m.IsDeleted, false), ct);
        var messages = await _uow.ContactMessages.Collection.Find(
                Builders<ContactMessage>.Filter.Eq(m => m.IsDeleted, false))
            .Sort(Builders<ContactMessage>.Sort.Descending(m => m.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);
        return new PagedResult<ContactMessageDto>(messages.Select(m => m.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task MarkContactReadAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Message not found");
        await _uow.ContactMessages.UpdateOneAsync(
            Builders<ContactMessage>.Filter.Eq(m => m.Id, objectId),
            Builders<ContactMessage>.Update.Set(m => m.IsRead, true), ct);
    }

    public async Task DeleteContactAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Message not found");
        await _uow.ContactMessages.UpdateOneAsync(
            Builders<ContactMessage>.Filter.Eq(m => m.Id, objectId),
            Builders<ContactMessage>.Update.Set(m => m.IsDeleted, true), ct);
    }

    public async Task<NewsletterSubscriberDto> SubscribeAsync(NewsletterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var existing = await _uow.NewsletterSubscribers.FirstOrDefaultAsync(s => s.Email == email, ct);
        if (existing is not null)
        {
            if (!existing.IsActive || existing.IsDeleted)
            {
                existing.IsActive = true;
                existing.IsDeleted = false;
                existing.UpdatedAt = DateTime.UtcNow;
                await _uow.NewsletterSubscribers.UpdateAsync(existing, ct);
            }
            return existing.ToDto();
        }

        var subscriber = new NewsletterSubscriber { Email = email };
        await _uow.NewsletterSubscribers.AddAsync(subscriber, ct);
        return subscriber.ToDto();
    }

    public async Task<PagedResult<NewsletterSubscriberDto>> GetSubscribersAsync(PagedQuery query, CancellationToken ct = default)
    {
        var filter = Builders<NewsletterSubscriber>.Filter.Eq(s => s.IsDeleted, false);
        var total = await _uow.NewsletterSubscribers.CountAsync(filter, ct);
        var subscribers = await _uow.NewsletterSubscribers.Collection.Find(filter)
            .Sort(Builders<NewsletterSubscriber>.Sort.Descending(s => s.CreatedAt))
            .Skip((query.Page - 1) * query.PageSize).Limit(query.PageSize).ToListAsync(ct);
        return new PagedResult<NewsletterSubscriberDto>(subscribers.Select(s => s.ToDto()).ToList(), total, query.Page, query.PageSize);
    }

    public async Task UnsubscribeAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Subscriber not found");
        await _uow.NewsletterSubscribers.UpdateOneAsync(
            Builders<NewsletterSubscriber>.Filter.Eq(s => s.Id, objectId),
            Builders<NewsletterSubscriber>.Update.Set(s => s.IsActive, false), ct);
    }

    public async Task<List<NotificationDto>> GetMyNotificationsAsync(int limit = 20, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException();
        var notifications = await _uow.Notifications.FindAsync(n => n.UserId == userId && !n.IsDeleted, ct);
        return notifications.OrderByDescending(n => n.CreatedAt).Take(limit).Select(n => n.ToDto()).ToList();
    }

    public async Task MarkNotificationReadAsync(string id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException();
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Notification not found");
        await _uow.Notifications.UpdateOneAsync(
            Builders<Notification>.Filter.And(
                Builders<Notification>.Filter.Eq(n => n.Id, objectId),
                Builders<Notification>.Filter.Eq(n => n.UserId, userId)),
            Builders<Notification>.Update.Set(n => n.IsRead, true), ct);
    }

    public async Task MarkAllNotificationsReadAsync(CancellationToken ct = default)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException();
        await _uow.Notifications.Collection.UpdateManyAsync(
            Builders<Notification>.Filter.And(
                Builders<Notification>.Filter.Eq(n => n.UserId, userId),
                Builders<Notification>.Filter.Eq(n => n.IsRead, false)),
            Builders<Notification>.Update.Set(n => n.IsRead, true),
            cancellationToken: ct);
    }

    private async Task<Banner> FindBannerAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Banner not found");
        return await _uow.Banners.FirstOrDefaultAsync(b => b.Id == objectId && !b.IsDeleted, ct)
            ?? throw new NotFoundException("Banner not found");
    }

    private async Task<Testimonial> FindTestimonialAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Testimonial not found");
        return await _uow.Testimonials.FirstOrDefaultAsync(t => t.Id == objectId && !t.IsDeleted, ct)
            ?? throw new NotFoundException("Testimonial not found");
    }
}
