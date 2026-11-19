using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.Common.Options;
using ECommerce.Shared.Exceptions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECommerce.Infrastructure.Storage;

public class LocalFileStorage : IFileStorage
{
    private readonly string _root;
    private readonly string _publicBaseUrl;
    private readonly long _maxBytes;
    private readonly ILogger<LocalFileStorage> _logger;

    public LocalFileStorage(IOptions<StorageOptions> storage, IOptions<AppOptions> app, IHostEnvironment environment,
        ILogger<LocalFileStorage> logger)
    {
        _root = Path.GetFullPath(storage.Value.LocalPath, environment.ContentRootPath);
        _publicBaseUrl = storage.Value.PublicBaseUrl.TrimEnd('/');
        _maxBytes = app.Value.MaxUploadBytes;
        _logger = logger;
    }

    public async Task<string> SaveAsync(Stream stream, string fileName, string contentType, CancellationToken ct = default)
    {
        if (stream.Length > _maxBytes)
            throw new BadRequestException($"File exceeds the maximum size of {_maxBytes / (1024 * 1024)}MB");

        var header = new byte[12];
        var read = await stream.ReadAsync(header.AsMemory(0, 12), ct);
        if (!IsValidImage(header, read, contentType))
            throw new BadRequestException("Only JPEG, PNG, WebP and GIF images are allowed");

        var extension = contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => throw new BadRequestException("Unsupported image type")
        };

        if (stream.CanSeek) stream.Position = 0;
        return await SaveStreamAsync(stream, DateTime.UtcNow.ToString("yyyy/MM"), extension, ct);
    }

    public async Task<string> SaveDocumentAsync(Stream stream, string fileName, string contentType, long maxBytes,
        CancellationToken ct = default)
    {
        if (stream.Length > maxBytes)
            throw new BadRequestException($"File exceeds the maximum size of {maxBytes / (1024 * 1024)}MB");

        var header = new byte[12];
        var read = await stream.ReadAsync(header.AsMemory(0, 12), ct);
        var normalized = contentType.ToLowerInvariant();
        if (!IsValidDocument(header, read, normalized))
            throw new BadRequestException("Only PDF, Word and image documents are allowed");

        var extension = normalized switch
        {
            "application/pdf" => ".pdf",
            "application/msword" => ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => ".docx",
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            _ => throw new BadRequestException("Unsupported document type")
        };

        if (stream.CanSeek) stream.Position = 0;
        return await SaveStreamAsync(stream, $"documents/{DateTime.UtcNow:yyyy/MM}", extension, ct);
    }

    private async Task<string> SaveStreamAsync(Stream stream, string relativeFolder, string extension, CancellationToken ct)
    {
        var directory = Path.Combine(_root, relativeFolder);
        Directory.CreateDirectory(directory);

        var name = $"{Guid.NewGuid():n}{extension}";
        var path = Path.Combine(directory, name);
        await using (var target = File.Create(path))
        {
            await stream.CopyToAsync(target, ct);
        }

        _logger.LogInformation("Stored upload {Path} ({Bytes} bytes)", path, stream.Length);
        return $"{_publicBaseUrl}/{relativeFolder}/{name}".Replace('\\', '/');
    }

    public Task DeleteAsync(string url)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url) || !url.StartsWith(_publicBaseUrl, StringComparison.OrdinalIgnoreCase))
                return Task.CompletedTask;

            var relative = url[_publicBaseUrl.Length..].TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var path = Path.GetFullPath(Path.Combine(_root, relative));
            if (!path.StartsWith(_root, StringComparison.OrdinalIgnoreCase)) return Task.CompletedTask;
            if (File.Exists(path)) File.Delete(path);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to delete file {Url}", url);
        }
        return Task.CompletedTask;
    }

    private static bool IsValidImage(byte[] header, int read, string contentType)
    {
        if (read < 4) return false;
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
            "image/gif" => header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38,
            "image/webp" => read >= 12 &&
                            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
            _ => false
        };
    }

    private static bool IsValidDocument(byte[] header, int read, string contentType)
    {
        if (read < 4) return false;
        return contentType switch
        {
            "application/pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
            "application/msword" => read >= 8 &&
                                    header[0] == 0xD0 && header[1] == 0xCF && header[2] == 0x11 && header[3] == 0xE0 &&
                                    header[4] == 0xA1 && header[5] == 0xB1 && header[6] == 0x1A && header[7] == 0xE1,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" =>
                header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04,
            _ => IsValidImage(header, read, contentType)
        };
    }
}
