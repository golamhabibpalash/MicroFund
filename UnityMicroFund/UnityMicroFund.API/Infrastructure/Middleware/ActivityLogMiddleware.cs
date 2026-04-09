using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using UnityMicroFund.API.Infrastructure.Logging;

namespace UnityMicroFund.API.Infrastructure.Middleware;

public class ActivityLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ActivityLogMiddleware> _logger;

    public ActivityLogMiddleware(RequestDelegate next, ILogger<ActivityLogMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IActivityLogService activityLogService)
    {
        var stopwatch = Stopwatch.StartNew();
        string? requestBody = null;

        try
        {
            if (context.Request.ContentLength > 0 && context.Request.ContentLength < 10000)
            {
                context.Request.EnableBuffering();
                using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
                requestBody = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;
            }

            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            var userId = GetUserId(context);
            if (userId.HasValue)
            {
                try
                {
                    var action = GetAction(context.Request.Method, context.Request.Path);
                    var module = GetModule(context.Request.Path);
                    var endpoint = context.Request.Path.Value;
                    var requestMethod = context.Request.Method;

                    await activityLogService.LogActivityAsync(
                        userId.Value,
                        action,
                        module,
                        $"{requestMethod} {endpoint}",
                        endpoint,
                        requestMethod,
                        requestBody,
                        context.Response.StatusCode,
                        stopwatch.Elapsed.TotalMilliseconds
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to log activity");
                }
            }
        }
    }

    private Guid? GetUserId(HttpContext context)
    {
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            return userId;
        return null;
    }

    private string GetAction(string method, PathString path)
    {
        return method.ToUpperInvariant() switch
        {
            "GET" => "VIEW",
            "POST" => "CREATE",
            "PUT" or "PATCH" => "UPDATE",
            "DELETE" => "DELETE",
            _ => "UNKNOWN"
        };
    }

    private string? GetModule(PathString path)
    {
        var pathValue = path.Value?.ToLowerInvariant() ?? "";
        
        if (pathValue.Contains("/api/members")) return "Members";
        if (pathValue.Contains("/api/contributions")) return "Contributions";
        if (pathValue.Contains("/api/investments")) return "Investments";
        if (pathValue.Contains("/api/dashboard")) return "Dashboard";
        if (pathValue.Contains("/api/settings")) return "Settings";
        if (pathValue.Contains("/api/auth")) return "Auth";
        
        return "Unknown";
    }
}

public static class ActivityLogMiddlewareExtensions
{
    public static IApplicationBuilder UseActivityLogging(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ActivityLogMiddleware>();
    }
}
