using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class WishlistService
{
    private readonly IUnitOfWork _uow;
    private readonly CatalogService _catalog;

    public WishlistService(IUnitOfWork uow, CatalogService catalog)
    {
        _uow = uow;
        _catalog = catalog;
    }

    public async Task<WishlistDto> GetAsync(ObjectId userId, CancellationToken ct = default)
    {
        var wishlist = await FindAsync(userId, ct);
        if (wishlist is null || wishlist.Items.Count == 0) return new WishlistDto();

        var products = await _catalog.GetByIdsAsync(wishlist.Items.Select(i => i.ProductId.ToString()), ct);
        var map = products.ToDictionary(p => p.Id);
        return new WishlistDto
        {
            Items = wishlist.Items
                .Where(i => map.ContainsKey(i.ProductId.ToString()))
                .Select(i => new WishlistItemDto
                {
                    ProductId = i.ProductId.ToString(),
                    Product = map[i.ProductId.ToString()],
                    AddedAt = i.AddedAt
                }).ToList()
        };
    }

    public async Task<WishlistDto> AddAsync(ObjectId userId, string productId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(productId, out var pid)) throw new NotFoundException("Product not found");
        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == pid && !p.IsDeleted && p.IsActive, ct)
            ?? throw new NotFoundException("Product not found");

        var wishlist = await FindAsync(userId, ct);
        if (wishlist is null)
        {
            wishlist = new Wishlist { UserId = userId, Items = new List<WishlistItem> { new() { ProductId = product.Id } } };
            await _uow.Wishlists.AddAsync(wishlist, ct);
        }
        else
        {
            if (wishlist.Items.All(i => i.ProductId != product.Id))
            {
                wishlist.Items.Add(new WishlistItem { ProductId = product.Id });
                wishlist.UpdatedAt = DateTime.UtcNow;
                await _uow.Wishlists.UpdateAsync(wishlist, ct);
            }
        }
        return await GetAsync(userId, ct);
    }

    public async Task<WishlistDto> RemoveAsync(ObjectId userId, string productId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(productId, out var pid)) throw new NotFoundException("Product not found");
        var wishlist = await FindAsync(userId, ct);
        if (wishlist is not null)
        {
            var item = wishlist.Items.FirstOrDefault(i => i.ProductId == pid);
            if (item is not null)
            {
                wishlist.Items.Remove(item);
                wishlist.UpdatedAt = DateTime.UtcNow;
                await _uow.Wishlists.UpdateAsync(wishlist, ct);
            }
        }
        return await GetAsync(userId, ct);
    }

    public async Task<bool> ContainsAsync(ObjectId userId, string productId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(productId, out var pid)) return false;
        var wishlist = await FindAsync(userId, ct);
        return wishlist?.Items.Any(i => i.ProductId == pid) == true;
    }

    private Task<Wishlist?> FindAsync(ObjectId userId, CancellationToken ct) =>
        _uow.Wishlists.FirstOrDefaultAsync(w => w.UserId == userId && !w.IsDeleted, ct);
}
