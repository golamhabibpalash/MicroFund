using System.Security.Claims;
using System.Text.Json;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Infrastructure.Logging;

public interface IAuditService
{
    Task LogAsync(string entityName, string action, object? oldValues, object? newValues, string? description = null);
    Task LogAsync(string entityName, string action, string? oldValuesJson, string? newValuesJson, string? description = null);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(string entityName, string action, object? oldValues, object? newValues, string? description = null)
    {
        var oldJson = oldValues != null ? JsonSerializer.Serialize(oldValues) : null;
        var newJson = newValues != null ? JsonSerializer.Serialize(newValues) : null;
        
        await LogAsync(entityName, action, oldJson, newJson, description);
    }

    public async Task LogAsync(string entityName, string action, string? oldValuesJson, string? newValuesJson, string? description = null)
    {
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            EntityName = entityName,
            Action = action,
            OldValues = oldValuesJson,
            NewValues = newValuesJson,
            Description = description,
            UserId = GetCurrentUserId(),
            UserEmail = GetCurrentUserEmail(),
            IpAddress = GetIpAddress(),
            UserAgent = GetUserAgent(),
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            return userId;
        return null;
    }

    private string? GetCurrentUserEmail()
    {
        return _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Email)?.Value;
    }

    private string? GetIpAddress()
    {
        return _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
    }

    private string? GetUserAgent()
    {
        return _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
    }
}
