namespace ECommerce.Shared.Common;

public interface ICurrentUser
{
    string? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    IReadOnlyCollection<string> Permissions { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(params string[] roles);
    bool HasPermission(string permission);
}
