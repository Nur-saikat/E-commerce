using System.Linq.Expressions;
using ECommerce.Application.Common.Interfaces;
using ECommerce.Domain.Common;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Infrastructure.Persistence;

public class MongoRepository<T> : IMongoRepository<T> where T : BaseEntity
{
    public MongoRepository(IMongoDatabase database, string collectionName)
    {
        Collection = database.GetCollection<T>(collectionName);
    }

    public IMongoCollection<T> Collection { get; }

    public async Task<T?> GetByIdAsync(ObjectId id, CancellationToken ct = default) =>
        await Collection.Find(Builders<T>.Filter.Eq(x => x.Id, id)).FirstOrDefaultAsync(ct);

    public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default) =>
        await Collection.Find(predicate).FirstOrDefaultAsync(ct);

    public async Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default) =>
        await Collection.Find(predicate).ToListAsync(ct);

    public async Task<List<T>> FindAsync(FilterDefinition<T> filter, SortDefinition<T>? sort = null,
        int? skip = null, int? limit = null, CancellationToken ct = default)
    {
        var query = Collection.Find(filter);
        if (sort is not null) query = query.Sort(sort);
        if (skip.HasValue) query = query.Skip(skip.Value);
        if (limit.HasValue) query = query.Limit(limit.Value);
        return await query.ToListAsync(ct);
    }

    public async Task<long> CountAsync(FilterDefinition<T> filter, CancellationToken ct = default) =>
        await Collection.CountDocumentsAsync(filter, cancellationToken: ct);

    public async Task AddAsync(T entity, CancellationToken ct = default) =>
        await Collection.InsertOneAsync(entity, cancellationToken: ct);

    public async Task UpdateAsync(T entity, CancellationToken ct = default)
    {
        entity.UpdatedAt ??= DateTime.UtcNow;
        await Collection.ReplaceOneAsync(
            Builders<T>.Filter.Eq(x => x.Id, entity.Id), entity,
            new ReplaceOptions { IsUpsert = false }, ct);
    }

    public async Task UpdateOneAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, CancellationToken ct = default) =>
        await Collection.UpdateOneAsync(filter, update, cancellationToken: ct);

    public async Task<bool> SoftDeleteAsync(ObjectId id, string? updatedBy = null, CancellationToken ct = default)
    {
        var update = Builders<T>.Update
            .Set(x => x.IsDeleted, true)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);
        if (!string.IsNullOrWhiteSpace(updatedBy))
            update = update.Set(x => x.UpdatedBy, updatedBy);
        var result = await Collection.UpdateOneAsync(Builders<T>.Filter.Eq(x => x.Id, id), update, cancellationToken: ct);
        return result.ModifiedCount == 1;
    }
}
