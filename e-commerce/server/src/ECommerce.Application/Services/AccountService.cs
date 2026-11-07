using ECommerce.Application.Common;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Services;

public class AccountService
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUser _currentUser;

    public AccountService(IUnitOfWork uow, ICurrentUser currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<List<AddressDto>> GetAddressesAsync(CancellationToken ct = default)
    {
        var userId = CurrentUserId();
        var addresses = await _uow.Addresses.FindAsync(a => a.UserId == userId && !a.IsDeleted, ct);
        return addresses
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => a.ToDto()).ToList();
    }

    public async Task<AddressDto> AddAddressAsync(AddressRequest request, CancellationToken ct = default)
    {
        var userId = CurrentUserId();
        var addresses = await _uow.Addresses.FindAsync(a => a.UserId == userId && !a.IsDeleted, ct);
        var isDefault = request.IsDefault || addresses.Count == 0;

        if (isDefault)
        {
            foreach (var existing in addresses.Where(a => a.IsDefault))
            {
                existing.IsDefault = false;
                await _uow.Addresses.UpdateAsync(existing, ct);
            }
        }

        var address = new Address
        {
            UserId = userId,
            FullName = request.FullName.Trim(),
            Phone = request.Phone.Trim(),
            Street = request.Street.Trim(),
            City = request.City.Trim(),
            State = request.State.Trim(),
            PostalCode = request.PostalCode.Trim(),
            Country = request.Country.Trim(),
            IsDefault = isDefault,
            CreatedBy = userId
        };
        await _uow.Addresses.AddAsync(address, ct);
        return address.ToDto();
    }

    public async Task<AddressDto> UpdateAddressAsync(string id, AddressRequest request, CancellationToken ct = default)
    {
        var address = await FindAddressAsync(id, ct);
        if (request.IsDefault && !address.IsDefault)
        {
            var addresses = await _uow.Addresses.FindAsync(a =>
                a.UserId == address.UserId && !a.IsDeleted && a.Id != address.Id, ct);
            foreach (var other in addresses.Where(a => a.IsDefault))
            {
                other.IsDefault = false;
                await _uow.Addresses.UpdateAsync(other, ct);
            }
        }

        address.FullName = request.FullName.Trim();
        address.Phone = request.Phone.Trim();
        address.Street = request.Street.Trim();
        address.City = request.City.Trim();
        address.State = request.State.Trim();
        address.PostalCode = request.PostalCode.Trim();
        address.Country = request.Country.Trim();
        address.IsDefault = request.IsDefault || address.IsDefault;
        address.UpdatedAt = DateTime.UtcNow;
        address.UpdatedBy = _currentUser.UserId;
        await _uow.Addresses.UpdateAsync(address, ct);
        return address.ToDto();
    }

    public async Task DeleteAddressAsync(string id, CancellationToken ct = default)
    {
        var address = await FindAddressAsync(id, ct);
        address.IsDeleted = true;
        address.UpdatedAt = DateTime.UtcNow;
        await _uow.Addresses.UpdateAsync(address, ct);

        if (address.IsDefault)
        {
            var remaining = await _uow.Addresses.FindAsync(a =>
                a.UserId == address.UserId && !a.IsDeleted, ct);
            if (remaining.Count > 0)
            {
                remaining[0].IsDefault = true;
                await _uow.Addresses.UpdateAsync(remaining[0], ct);
            }
        }
    }

    public async Task<AddressDto> SetDefaultAsync(string id, CancellationToken ct = default)
    {
        var address = await FindAddressAsync(id, ct);
        var addresses = await _uow.Addresses.FindAsync(a => a.UserId == address.UserId && !a.IsDeleted, ct);
        foreach (var item in addresses)
        {
            var shouldBeDefault = item.Id == address.Id;
            if (item.IsDefault == shouldBeDefault) continue;
            item.IsDefault = shouldBeDefault;
            await _uow.Addresses.UpdateAsync(item, ct);
        }
        return address.ToDto();
    }

    private async Task<Address> FindAddressAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out var objectId)) throw new NotFoundException("Address not found");
        var userId = CurrentUserId();
        return await _uow.Addresses.FirstOrDefaultAsync(a =>
            a.Id == objectId && a.UserId == userId && !a.IsDeleted, ct)
            ?? throw new NotFoundException("Address not found");
    }

    private string CurrentUserId()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
            throw new UnauthorizedException();
        return _currentUser.UserId!;
    }
}
