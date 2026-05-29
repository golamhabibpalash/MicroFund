using System.Net;
using System.Text.Json;

namespace UnityMicroFund.API.Infrastructure.ExceptionHandling;

public class GlobalExceptionHandler
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(RequestDelegate next, ILogger<GlobalExceptionHandler> logger)
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
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var response = context.Response;
        response.ContentType = "application/json";

        var errorResponse = new ErrorResponse();

        switch (exception)
        {
            case UnauthorizedException unauthorizedEx:
                _logger.LogWarning(unauthorizedEx, "Authorization failure. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.Forbidden;
                errorResponse.StatusCode = (int)HttpStatusCode.Forbidden;
                errorResponse.Message = unauthorizedEx.Message;
                errorResponse.ErrorCode = "FORBIDDEN";
                break;

            case NotFoundException notFoundCustomEx:
                _logger.LogWarning(notFoundCustomEx, "Resource not found. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.NotFound;
                errorResponse.StatusCode = (int)HttpStatusCode.NotFound;
                errorResponse.Message = notFoundCustomEx.Message;
                errorResponse.ErrorCode = "NOT_FOUND";
                break;

            case ValidationException validationEx:
                _logger.LogWarning(validationEx, "Validation failure. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse.Message = validationEx.Message;
                errorResponse.ErrorCode = "VALIDATION_ERROR";
                break;

            case ConflictException conflictEx:
                _logger.LogWarning(conflictEx, "Conflict. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.Conflict;
                errorResponse.StatusCode = (int)HttpStatusCode.Conflict;
                errorResponse.Message = conflictEx.Message;
                errorResponse.ErrorCode = "CONFLICT";
                break;

            case ArgumentException argEx:
                _logger.LogWarning(argEx, "Bad request argument. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse.Message = argEx.Message;
                errorResponse.ErrorCode = "BAD_REQUEST";
                break;

            case UnauthorizedAccessException unauthEx:
                _logger.LogWarning(unauthEx, "Unauthorized access. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.Message = unauthEx.Message;
                errorResponse.ErrorCode = "UNAUTHORIZED";
                break;

            case KeyNotFoundException notFoundEx:
                _logger.LogWarning(notFoundEx, "Resource not found. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.NotFound;
                errorResponse.StatusCode = (int)HttpStatusCode.NotFound;
                errorResponse.Message = notFoundEx.Message;
                errorResponse.ErrorCode = "NOT_FOUND";
                break;

            case InvalidOperationException invalidOpEx:
                _logger.LogWarning(invalidOpEx, "Invalid operation. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.Conflict;
                errorResponse.StatusCode = (int)HttpStatusCode.Conflict;
                errorResponse.Message = invalidOpEx.Message;
                errorResponse.ErrorCode = "CONFLICT";
                break;

            case OperationCanceledException:
                response.StatusCode = (int)HttpStatusCode.RequestTimeout;
                errorResponse.StatusCode = (int)HttpStatusCode.RequestTimeout;
                errorResponse.Message = "The request was cancelled";
                errorResponse.ErrorCode = "REQUEST_CANCELLED";
                break;

            default:
                _logger.LogError(exception, "Unhandled exception occurred. TraceId: {TraceId}", context.TraceIdentifier);
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
                errorResponse.StatusCode = (int)HttpStatusCode.InternalServerError;

                var isAdmin = context.User.IsInRole("Admin");
                errorResponse.Message = isAdmin
                    ? $"[{exception.GetType().Name}] {exception.Message}"
                    : "An internal server error occurred. Please try again later.";
                errorResponse.ErrorCode = "INTERNAL_ERROR";

                if (isAdmin)
                {
                    errorResponse.Errors = new Dictionary<string, string[]>
                    {
                        ["exceptionType"] = [exception.GetType().FullName ?? exception.GetType().Name],
                        ["stackTrace"] = [exception.StackTrace ?? "N/A"]
                    };
                }
                break;
        }

        errorResponse.Timestamp = DateTime.UtcNow;
        errorResponse.TraceId = context.TraceIdentifier;

        var result = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await response.WriteAsync(result);
    }
}

public class ErrorResponse
{
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string? TraceId { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }
}

public static class GlobalExceptionHandlerExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionHandler>();
    }
}
