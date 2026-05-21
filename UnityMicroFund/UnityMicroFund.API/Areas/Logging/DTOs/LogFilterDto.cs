namespace UnityMicroFund.API.Areas.Logging.DTOs;

public class LogFilterDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? LogLevel { get; set; }
    public Guid? UserId { get; set; }
    public string? Module { get; set; }
    public string? SubModule { get; set; }
    public string? Action { get; set; }
    public string? Search { get; set; }
    public string? CorrelationId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortBy { get; set; } = "Timestamp";
    public bool SortDescending { get; set; } = true;
}
