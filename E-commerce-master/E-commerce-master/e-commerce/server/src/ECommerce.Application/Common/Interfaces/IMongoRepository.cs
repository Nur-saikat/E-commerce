using System.Linq.Expressions;
using ECommerce.Domain.Common;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Application.Common.Interfaces;

public interface IMongoRepository<T> where T : BaseEntity
{
    IMongoCollection<T> Collection { get; }
    Task<T?> GetByIdAsync(ObjectId id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> FindAsync(FilterDefinition<T> filter, SortDefinition<T>? sort = null, int? skip = null, int? limit = null, CancellationToken ct = default);
    Task<long> CountAsync(FilterDefinition<T> filter, CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    Task UpdateAsync(T entity, CancellationToken ct = default);
    Task UpdateOneAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, CancellationToken ct = default);
    Task<bool> SoftDeleteAsync(ObjectId id, string? updatedBy = null, CancellationToken ct = default);
}
