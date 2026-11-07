using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.Common.Options;
using ECommerce.Application.DTOs;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using ECommerce.Shared.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ECommerce.API.Controllers;

[Route("api/uploads")]
[Authorize]
public class UploadsController : ApiControllerBase
{
    private static readonly string[] UploadPermissions =
    {
        Permissions.ProductsManage, Permissions.CategoriesManage, Permissions.BrandsManage,
        Permissions.ContentManage, Permissions.SettingsManage
    };

    private readonly IFileStorage _storage;
    private readonly AppOptions _options;
    private readonly ICurrentUser _currentUser;

    public UploadsController(IFileStorage storage, IOptions<AppOptions> options, ICurrentUser currentUser)
    {
        _storage = storage;
        _options = options.Value;
        _currentUser = currentUser;
    }

    [HttpPost]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (!UploadPermissions.Any(_currentUser.HasPermission))
            throw new ForbiddenException("You do not have permission to upload files");
        if (file is null || file.Length == 0)
            throw new BadRequestException("Please choose a file to upload");
        if (file.Length > _options.MaxUploadBytes)
            throw new BadRequestException($"Files must be smaller than {_options.MaxUploadBytes / (1024 * 1024)}MB");
        if (!_options.AllowedImageTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            throw new BadRequestException("Only JPEG, PNG, GIF and WebP images are supported");

        await using var stream = file.OpenReadStream();
        var url = await _storage.SaveAsync(stream, file.FileName, file.ContentType, ct);

        return Success(new UploadResultDto
        {
            Url = url,
            FileName = Path.GetFileName(url),
            Size = file.Length
        }, "Image uploaded");
    }
}
