using ECommerce.Application.Common.Interfaces;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;

namespace ECommerce.API.Middleware;

public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLogMiddleware> _logger;

    public AuditLogMiddleware(RequestDelegate next, ILogger<AuditLogMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);

        if (!ShouldAudit(context)) return;

        try
        {
            var currentUser = context.RequestServices.GetRequiredService<ICurrentUser>();
            var uow = context.RequestServices.GetRequiredService<IUnitOfWork>();
            var segments = context.Request.Path.Value?.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();

            var log = new AuditLog
            {
                UserId = currentUser.UserId,
                UserEmail = currentUser.Email,
                Action = $"{context.Request.Method} {context.Request.Path}",
                Entity = segments.Length > 1 ? segments[1] : "api",
                EntityId = segments.Length > 2 ? segments[^1] : null,
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                CreatedBy = currentUser.UserId
            };

            await uow.AuditLogs.AddAsync(log, context.RequestAborted);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to persist audit log for {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
    }

    private static bool ShouldAudit(HttpContext context) =>
        context.Request.Path.StartsWithSegments("/api") &&
        context.Request.Method is "POST" or "PUT" or "PATCH" or "DELETE" &&
        context.Response.StatusCode is >= 200 and < 300;
}
