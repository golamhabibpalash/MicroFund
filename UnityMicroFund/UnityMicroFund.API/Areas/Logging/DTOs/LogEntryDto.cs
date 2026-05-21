namespace UnityMicroFund.API.Areas.Logging.DTOs;

public class LogEntryDto
{
    public Guid LogId { get; set; }
    public DateTime Timestamp { get; set; }
    public string LogLevel { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string? IPAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Module { get; set; }
    public string? SubModule { get; set; }
    public string? CorrelationId { get; set; }
    public string? AdditionalData { get; set; }
}

public class LogStatsDto
{
    public Dictionary<string, int> ByLevel { get; set; } = new();
    public Dictionary<string, int> ByModule { get; set; } = new();
    public int TotalCount { get; set; }
}
