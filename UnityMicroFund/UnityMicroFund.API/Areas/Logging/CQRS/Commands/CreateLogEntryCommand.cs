using UnityMicroFund.API.Areas.Logging.Models;

namespace UnityMicroFund.API.Areas.Logging.CQRS.Commands;

public class CreateLogEntryCommand : ICommand<Guid>
{
    public AppLogLevel LogLevel { get; set; }
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
