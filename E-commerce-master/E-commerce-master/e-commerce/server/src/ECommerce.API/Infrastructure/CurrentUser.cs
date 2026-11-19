using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;

namespace ECommerce.API.Infrastructure;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUser(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    private ClaimsPrincipal? Principal => _accessor.HttpContext?.User;

    public string? UserId =>
        Principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);

    public string? Email =>
        Principal?.FindFirstValue(ClaimTypes.Email) ?? Principal?.FindFirstValue(JwtRegisteredClaimNames.Email);

    public string? Role =>
        Principal?.FindFirstValue(ClaimTypes.Role) ?? Principal?.FindFirstValue(AppClaimTypes.Role);

    public IReadOnlyCollection<string> Permissions =>
        Principal?.FindAll(AppClaimTypes.Permission).Select(c => c.Value).Distinct().ToArray()
        ?? Array.Empty<string>();

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public bool IsInRole(params string[] roles) =>
        IsAuthenticated && Role is not null && roles.Contains(Role, StringComparer.OrdinalIgnoreCase);

    public bool HasPermission(string permission) =>
        Role == AppRoles.SuperAdmin ||
        (IsAuthenticated && Permissions.Contains(permission, StringComparer.OrdinalIgnoreCase));
}
