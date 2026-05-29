using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using UnityMicroFund.API.Areas.Logging.Models;
using UnityMicroFund.API.Areas.Logging.Services;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;

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

    public async Task InvokeAsync(HttpContext context, ILogManager logManager)
    {
        var stopwatch = Stopwatch.StartNew();
        string? requestBody = null;
        int responseStatusCode = 200;
        string? exceptionMessage = null;
        string? exceptionType = null;

        if (context.Request.ContentLength > 0 && context.Request.ContentLength < 10000)
        {
            context.Request.EnableBuffering();
            using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
            requestBody = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;
        }

        try
        {
            await _next(context);
            responseStatusCode = context.Response.StatusCode;
        }
        catch (Exception ex)
        {
            // GlobalExceptionHandler (outer middleware) will write the HTTP error response.
            // Capture exception details here so the log entry explains the reason.
            responseStatusCode = InferStatusCode(ex);
            exceptionMessage = ex.Message;
            exceptionType = ex.GetType().Name;
            throw;
        }
        finally
        {
            stopwatch.Stop();

            var action = GetAction(context.Request.Method);
            if (GetUserId(context).HasValue && action != "VIEW")
            {
                var module  = GetModule(context.Request.Path);
                var method  = context.Request.Method;
                var path    = context.Request.Path.Value ?? string.Empty;

                var message = exceptionMessage != null
                    ? $"{method} {path} -> {responseStatusCode}: {exceptionMessage}"
                    : $"{method} {path} -> {responseStatusCode} ({stopwatch.Elapsed.TotalMilliseconds:F0}ms)";

                var level = responseStatusCode >= 500 ? AppLogLevel.Error
                          : responseStatusCode >= 400 ? AppLogLevel.Warning
                          : AppLogLevel.Info;

                object? extra = responseStatusCode >= 400
                    ? new
                    {
                        exceptionType,
                        exceptionMessage,
                        responseStatusCode,
                        durationMs = stopwatch.Elapsed.TotalMilliseconds,
                        requestBody
                    }
                    : null;

                await logManager.LogAsync(level, action, message, module, additionalData: extra);
            }
        }
    }

    private static int InferStatusCode(Exception ex) => ex switch
    {
        ArgumentException           => 400,
        ValidationException         => 400,
        UnauthorizedAccessException => 401,
        UnauthorizedException       => 403,
        NotFoundException           => 404,
        KeyNotFoundException        => 404,
        InvalidOperationException or ConflictException => 409,
        OperationCanceledException  => 408,
        _                           => 500
    };

    private static Guid? GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : null;
    }

    private static string GetAction(string method) => method.ToUpperInvariant() switch
    {
        "GET"              => "VIEW",
        "POST"             => "CREATE",
        "PUT" or "PATCH"   => "UPDATE",
        "DELETE"           => "DELETE",
        _                  => "UNKNOWN"
    };

    private static string? GetModule(PathString path)
    {
        var p = path.Value?.ToLowerInvariant() ?? string.Empty;
        if (p.Contains("/api/members"))       return "Members";
        if (p.Contains("/api/contributions")) return "Contributions";
        if (p.Contains("/api/investments"))   return "Investments";
        if (p.Contains("/api/transactions"))  return "Transactions";
        if (p.Contains("/api/dashboard"))     return "Dashboard";
        if (p.Contains("/api/settings"))      return "Settings";
        if (p.Contains("/api/auth"))          return "Auth";
        return "Unknown";
    }
}

public static class ActivityLogMiddlewareExtensions
{
    public static IApplicationBuilder UseActivityLogging(this IApplicationBuilder app)
        => app.UseMiddleware<ActivityLogMiddleware>();
}
