using System.Security.Claims;
using System.Text.Json;
using UnityMicroFund.API.Areas.Logging.CQRS;
using UnityMicroFund.API.Areas.Logging.CQRS.Commands;
using UnityMicroFund.API.Areas.Logging.Models;

namespace UnityMicroFund.API.Areas.Logging.Services;

public class LogManager : ILogManager
{
    private readonly ICommandHandler<CreateLogEntryCommand, Guid> _createHandler;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public LogManager(
        ICommandHandler<CreateLogEntryCommand, Guid> createHandler,
        IHttpContextAccessor httpContextAccessor)
    {
        _createHandler = createHandler;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(AppLogLevel level, string action, string message,
        string? module = null, string? subModule = null, string? correlationId = null,
        Exception? exception = null, object? additionalData = null)
    {
        var context = _httpContextAccessor.HttpContext;

        var command = new CreateLogEntryCommand
        {
            LogLevel = level,
            UserId = GetUserId(context),
            UserEmail = GetUserEmail(context),
            Action = action,
            Message = message,
            Exception = exception?.ToString(),
            IPAddress = context?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = context?.Request.Headers.UserAgent.ToString(),
            Module = module,
            SubModule = subModule,
            CorrelationId = correlationId ?? context?.TraceIdentifier,
            AdditionalData = additionalData != null
                ? JsonSerializer.Serialize(additionalData, new JsonSerializerOptions { WriteIndented = false })
                : null
        };

        try
        {
            await _createHandler.HandleAsync(command);
        }
        catch
        {
            // Swallow — logging must never break the caller
        }
    }

    public Task LogErrorAsync(string action, string message, Exception? exception = null,
        string? module = null, string? subModule = null, string? correlationId = null)
        => LogAsync(AppLogLevel.Error, action, message, module, subModule, correlationId, exception);

    public Task LogWarningAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null)
        => LogAsync(AppLogLevel.Warning, action, message, module, subModule, correlationId);

    public Task LogInfoAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null)
        => LogAsync(AppLogLevel.Info, action, message, module, subModule, correlationId);

    public Task LogDebugAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null)
        => LogAsync(AppLogLevel.Debug, action, message, module, subModule, correlationId);

    public Task LogAuditAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null, object? additionalData = null)
        => LogAsync(AppLogLevel.Audit, action, message, module, subModule, correlationId, null, additionalData);

    private static Guid? GetUserId(HttpContext? context)
    {
        var value = context?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static string? GetUserEmail(HttpContext? context)
        => context?.User.FindFirstValue(ClaimTypes.Email);
}
