using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Areas.Logging.Models;

public enum AppLogLevel { Error, Warning, Info, Debug, Audit }

[Table("log_entries")]
public class LogEntry
{
    [Key]
    public Guid LogId { get; set; } = Guid.NewGuid();

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Required]
    public AppLogLevel LogLevel { get; set; }

    public Guid? UserId { get; set; }

    [MaxLength(200)]
    public string? UserEmail { get; set; }

    [Required]
    [MaxLength(200)]
    public string Action { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    public string? Exception { get; set; }

    [MaxLength(100)]
    public string? IPAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [MaxLength(100)]
    public string? Module { get; set; }

    [MaxLength(100)]
    public string? SubModule { get; set; }

    [MaxLength(100)]
    public string? CorrelationId { get; set; }

    public string? AdditionalData { get; set; }
}
