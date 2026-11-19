using System.Text.Json;
using ECommerce.Shared.Common;
using ECommerce.Shared.Exceptions;

namespace ECommerce.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationAppException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message, ex.Errors);
        }
        catch (AppException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message);
        }
        catch (BadHttpRequestException ex)
        {
            await WriteAsync(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client disconnected; nothing to write.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception while processing {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await WriteAsync(context, StatusCodes.Status500InternalServerError,
                "An unexpected error occurred. Please try again later.");
        }
    }

    private static async Task WriteAsync(HttpContext context, int statusCode, string message, List<string>? errors = null)
    {
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = ApiResponse<object>.Fail(message, errors);
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions));
    }

    internal static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
