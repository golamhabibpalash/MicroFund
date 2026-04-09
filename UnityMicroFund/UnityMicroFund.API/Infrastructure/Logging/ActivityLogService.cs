using System.Security.Claims;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Infrastructure.Logging;

public interface IActivityLogService
{
    Task LogActivityAsync(Guid userId, string action, string? module, string? description, 
        string? endpoint, string? requestMethod, string? requestBody, 
        int? responseStatusCode, double? durationMs);
}

public class ActivityLogService : IActivityLogService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ActivityLogService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogActivityAsync(Guid userId, string action, string? module, string? description,
        string? endpoint, string? requestMethod, string? requestBody,
        int? responseStatusCode, double? durationMs)
    {
        var activityLog = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            Module = module,
            Description = description,
            Endpoint = endpoint,
            RequestMethod = requestMethod,
            RequestBody = requestBody,
            ResponseStatusCode = responseStatusCode,
            IpAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString(),
            Timestamp = DateTime.UtcNow,
            DurationMs = durationMs
        };

        _context.ActivityLogs.Add(activityLog);
        await _context.SaveChangesAsync();
    }
}
