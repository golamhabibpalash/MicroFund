using UnityMicroFund.API.Areas.Logging.Models;

namespace UnityMicroFund.API.Areas.Logging.Services;

public interface ILogManager
{
    Task LogAsync(AppLogLevel level, string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null,
        Exception? exception = null, object? additionalData = null);

    Task LogErrorAsync(string action, string message, Exception? exception = null,
        string? module = null, string? subModule = null, string? correlationId = null);

    Task LogWarningAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null);

    Task LogInfoAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null);

    Task LogDebugAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null);

    Task LogAuditAsync(string action, string message, string? module = null,
        string? subModule = null, string? correlationId = null, object? additionalData = null);
}
