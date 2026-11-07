using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class CartService
{
    private readonly IUnitOfWork _uow;
    private readonly SettingsService _settings;
    private readonly CouponService _coupons;
    private readonly ICurrentUser _currentUser;

    public CartService(IUnitOfWork uow, SettingsService settings, CouponService coupons, ICurrentUser currentUser)
    {
        _uow = uow;
        _settings = settings;
        _coupons = coupons;
        _currentUser = currentUser;
    }

    public async Task<CartDto> GetAsync(string? guestId, CancellationToken ct = default)
    {
        var cart = await FindCartAsync(guestId, false, ct);
        return cart is null ? new CartDto { Summary = await BuildEmptySummaryAsync(ct) } : await ToDtoAsync(cart, ct);
    }

    public async Task<CartDto> AddAsync(AddToCartRequest request, string? guestId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(request.ProductId, out var productId))
            throw new NotFoundException("Product not found");

        var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted && p.IsActive, ct)
            ?? throw new NotFoundException("Product not found");

        ObjectId? variantId = null;
        ProductVariant? variant = null;
        if (!string.IsNullOrWhiteSpace(request.VariantId))
        {
            if (!ObjectId.TryParse(request.VariantId, out var vid))
                throw new BadRequestException("Invalid variant");
            variant = product.Variants.FirstOrDefault(v => v.Id == vid)
                ?? throw new NotFoundException("Product variant not found");
            variantId = vid;
        }

        var stock = variant?.Stock ?? product.Stock;
        if (stock <= 0) throw new BadRequestException("This product is out of stock");

        var cart = await FindCartAsync(guestId, true, ct) ?? throw new BadRequestException("Unable to create cart");
        var item = cart.Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId);
        var requested = request.Quantity <= 0 ? 1 : request.Quantity;

        if (item is not null)
        {
            if (item.Quantity + requested > stock)
                throw new BadRequestException($"Only {stock} unit(s) available");
            item.Quantity += requested;
        }
        else
        {
            if (requested > stock) throw new BadRequestException($"Only {stock} unit(s) available");
            cart.Items.Add(new CartItem
            {
                ProductId = product.Id,
                VariantId = variantId,
                ProductName = product.Name,
                Sku = variant?.Sku ?? product.Sku,
                ImageUrl = variant?.ImageUrl ?? product.ThumbnailUrl ?? product.Images.FirstOrDefault(),
                VariantName = variant?.Name,
                UnitPrice = variant?.Price ?? product.EffectivePrice,
                Quantity = requested
            });
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _uow.Carts.UpdateAsync(cart, ct);
        return await ToDtoAsync(cart, ct);
    }

    public async Task<CartDto> UpdateItemAsync(string itemId, UpdateCartItemRequest request, string? guestId, CancellationToken ct = default)
    {
        var cart = await FindCartAsync(guestId, false, ct) ?? throw new NotFoundException("Cart not found");
        if (!ObjectId.TryParse(itemId, out var itemObjectId)) throw new NotFoundException("Cart item not found");
        var item = cart.Items.FirstOrDefault(i => i.Id == itemObjectId) ?? throw new NotFoundException("Cart item not found");

        if (request.Quantity <= 0)
        {
            cart.Items.Remove(item);
        }
        else
        {
            var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId && !p.IsDeleted, ct)
                ?? throw new NotFoundException("Product not found");
            var variant = item.VariantId.HasValue ? product.Variants.FirstOrDefault(v => v.Id == item.VariantId.Value) : null;
            var stock = variant?.Stock ?? product.Stock;
            if (request.Quantity > stock) throw new BadRequestException($"Only {stock} unit(s) available");
            if (!product.IsActive) throw new BadRequestException("This product is no longer available");
            item.Quantity = request.Quantity;
            item.UnitPrice = variant?.Price ?? product.EffectivePrice;
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _uow.Carts.UpdateAsync(cart, ct);
        return await ToDtoAsync(cart, ct);
    }

    public async Task<CartDto> RemoveItemAsync(string itemId, string? guestId, CancellationToken ct = default)
    {
        var cart = await FindCartAsync(guestId, false, ct) ?? throw new NotFoundException("Cart not found");
        if (!ObjectId.TryParse(itemId, out var itemObjectId)) throw new NotFoundException("Cart item not found");
        var item = cart.Items.FirstOrDefault(i => i.Id == itemObjectId) ?? throw new NotFoundException("Cart item not found");
        cart.Items.Remove(item);
        cart.UpdatedAt = DateTime.UtcNow;
        await _uow.Carts.UpdateAsync(cart, ct);
        return await ToDtoAsync(cart, ct);
    }

    public async Task<CartDto> ClearAsync(string? guestId, CancellationToken ct = default)
    {
        var cart = await FindCartAsync(guestId, false, ct);
        if (cart is not null)
        {
            cart.Items.Clear();
            cart.CouponCode = null;
            cart.UpdatedAt = DateTime.UtcNow;
            await _uow.Carts.UpdateAsync(cart, ct);
            return await ToDtoAsync(cart, ct);
        }
        return new CartDto { Summary = await BuildEmptySummaryAsync(ct) };
    }

    public async Task<CartDto> ApplyCouponAsync(string code, string? guestId, CancellationToken ct = default)
    {
        var cart = await FindCartAsync(guestId, false, ct) ?? throw new NotFoundException("Cart not found");
        if (cart.Items.Count == 0) throw new BadRequestException("Your cart is empty");

        var subtotal = cart.Subtotal;
        var result = await _coupons.ValidateAsync(code, subtotal, CurrentUserId, ct);
        if (!result.Valid) throw new BadRequestException(result.Message ?? "Invalid coupon");

        cart.CouponCode = result.Code;
        cart.UpdatedAt = DateTime.UtcNow;
        await _uow.Carts.UpdateAsync(cart, ct);
        return await ToDtoAsync(cart, ct);
    }

    public async Task<CartDto> RemoveCouponAsync(string? guestId, CancellationToken ct = default)
    {
        var cart = await FindCartAsync(guestId, false, ct) ?? throw new NotFoundException("Cart not found");
        cart.CouponCode = null;
        cart.UpdatedAt = DateTime.UtcNow;
        await _uow.Carts.UpdateAsync(cart, ct);
        return await ToDtoAsync(cart, ct);
    }

    public async Task<CartDto> MergeAsync(string guestId, CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated || !ObjectId.TryParse(_currentUser.UserId, out var userId))
            throw new UnauthorizedException();
        if (string.IsNullOrWhiteSpace(guestId)) return await GetAsync(null, ct);

        var guestCart = await _uow.Carts.FirstOrDefaultAsync(c => c.GuestId == guestId && !c.IsDeleted, ct);
        if (guestCart is null || guestCart.Items.Count == 0) return await GetAsync(null, ct);

        var userCart = await _uow.Carts.FirstOrDefaultAsync(c => c.UserId == userId && !c.IsDeleted, ct);
        if (userCart is null)
        {
            guestCart.GuestId = null;
            guestCart.UserId = userId;
            guestCart.UpdatedAt = DateTime.UtcNow;
            await _uow.Carts.UpdateAsync(guestCart, ct);
            return await ToDtoAsync(guestCart, ct);
        }

        foreach (var item in guestCart.Items)
        {
            var existing = userCart.Items.FirstOrDefault(i => i.ProductId == item.ProductId && i.VariantId == item.VariantId);
            if (existing is not null) existing.Quantity += item.Quantity;
            else userCart.Items.Add(item);
        }
        userCart.UpdatedAt = DateTime.UtcNow;
        await _uow.Carts.UpdateAsync(userCart, ct);

        guestCart.IsDeleted = true;
        await _uow.Carts.UpdateAsync(guestCart, ct);
        return await ToDtoAsync(userCart, ct);
    }

    public async Task<Cart?> FindCartAsync(string? guestId, bool create, CancellationToken ct = default)
    {
        Cart? cart;
        var userId = CurrentUserId;
        if (userId.HasValue)
        {
            cart = await _uow.Carts.FirstOrDefaultAsync(c => c.UserId == userId.Value && !c.IsDeleted, ct);
            if (cart is null && create)
            {
                cart = new Cart { UserId = userId.Value, CreatedBy = _currentUser.UserId };
                await _uow.Carts.AddAsync(cart, ct);
            }
        }
        else
        {
            if (string.IsNullOrWhiteSpace(guestId))
            {
                if (!create) return null;
                guestId = ObjectId.GenerateNewId().ToString();
            }
            cart = await _uow.Carts.FirstOrDefaultAsync(c => c.GuestId == guestId && !c.IsDeleted, ct);
            if (cart is null && create)
            {
                cart = new Cart { GuestId = guestId };
                await _uow.Carts.AddAsync(cart, ct);
            }
        }
        return cart;
    }

    public async Task ValidateForCheckoutAsync(Cart cart, CancellationToken ct = default)
    {
        if (cart.Items.Count == 0) throw new BadRequestException("Your cart is empty");
        foreach (var item in cart.Items)
        {
            var product = await _uow.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId && !p.IsDeleted, ct)
                ?? throw new BadRequestException($"{item.ProductName} is no longer available");
            if (!product.IsActive) throw new BadRequestException($"{item.ProductName} is no longer available");
            var variant = item.VariantId.HasValue ? product.Variants.FirstOrDefault(v => v.Id == item.VariantId.Value) : null;
            var available = variant?.Stock ?? product.Stock;
            if (item.Quantity > available)
                throw new BadRequestException($"{item.ProductName} only has {available} unit(s) available");
        }
    }

    private ObjectId? CurrentUserId =>
        _currentUser.IsAuthenticated && ObjectId.TryParse(_currentUser.UserId, out var id) ? id : null;

    private async Task<CartDto> ToDtoAsync(Cart cart, CancellationToken ct)
    {
        var productIds = cart.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = productIds.Count == 0
            ? new List<Product>()
            : await _uow.Products.FindAsync(p => productIds.Contains(p.Id), ct);
        var productMap = products.ToDictionary(p => p.Id);

        var items = new List<CartItemDto>();
        foreach (var item in cart.Items)
        {
            productMap.TryGetValue(item.ProductId, out var product);
            var variant = item.VariantId.HasValue ? product?.Variants.FirstOrDefault(v => v.Id == item.VariantId.Value) : null;
            var stock = variant?.Stock ?? product?.Stock ?? 0;
            items.Add(item.ToDto(stock, product is { IsActive: true } && stock >= item.Quantity, product?.Slug ?? string.Empty));
        }

        var settings = await _settings.GetEntityAsync(ct);
        var subtotal = items.Sum(i => i.UnitPrice * i.Quantity);
        var discount = 0m;
        if (!string.IsNullOrWhiteSpace(cart.CouponCode))
        {
            var validation = await _coupons.ValidateAsync(cart.CouponCode, subtotal, CurrentUserId, ct);
            if (validation.Valid) discount = validation.Discount;
        }

        var shipping = items.Count == 0 || subtotal - discount >= settings.FreeShippingThreshold
            ? 0
            : settings.FlatShippingRate;
        var tax = Math.Round((subtotal - discount) * settings.TaxRate / 100m, 2);
        var total = Math.Round(subtotal - discount + shipping + tax, 2);

        return new CartDto
        {
            Id = cart.Id.ToString(),
            GuestId = cart.GuestId,
            Items = items,
            Summary = new CartSummaryDto
            {
                Subtotal = Math.Round(subtotal, 2),
                Discount = Math.Round(discount, 2),
                CouponCode = cart.CouponCode,
                Shipping = Math.Round(shipping, 2),
                Tax = tax,
                Total = total,
                ItemCount = items.Sum(i => i.Quantity),
                FreeShippingThreshold = settings.FreeShippingThreshold,
                AmountToFreeShipping = Math.Max(0, Math.Round(settings.FreeShippingThreshold - (subtotal - discount), 2))
            }
        };
    }

    private async Task<CartSummaryDto> BuildEmptySummaryAsync(CancellationToken ct)
    {
        var settings = await _settings.GetEntityAsync(ct);
        return new CartSummaryDto
        {
            FreeShippingThreshold = settings.FreeShippingThreshold,
            AmountToFreeShipping = settings.FreeShippingThreshold
        };
    }
}
