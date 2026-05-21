using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Logging.CQRS;
using UnityMicroFund.API.Areas.Logging.CQRS.Queries;
using UnityMicroFund.API.Areas.Logging.DTOs;
using UnityMicroFund.API.Areas.Logging.Repository;

namespace UnityMicroFund.API.Areas.Logging.Controllers;

[ApiController]
[Route("api/logs")]
[Authorize(Roles = "Admin")]
public class LogsController : ControllerBase
{
    private readonly IQueryHandler<GetLogsQuery, PagedResult<LogEntryDto>> _getLogsHandler;
    private readonly ILogRepository _repository;

    public LogsController(
        IQueryHandler<GetLogsQuery, PagedResult<LogEntryDto>> getLogsHandler,
        ILogRepository repository)
    {
        _getLogsHandler = getLogsHandler;
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] LogFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _getLogsHandler.HandleAsync(new GetLogsQuery { Filter = filter }, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetLog(Guid id, CancellationToken cancellationToken)
    {
        var log = await _repository.GetByIdAsync(id, cancellationToken);
        return log == null ? NotFound(new { message = "Log entry not found" }) : Ok(log);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] int days = 7, CancellationToken cancellationToken = default)
    {
        if (days < 1 || days > 365)
            return BadRequest(new { message = "days must be between 1 and 365" });

        var stats = await _repository.GetStatsAsync(days, cancellationToken);
        return Ok(stats);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] LogFilterDto filter, CancellationToken cancellationToken)
    {
        filter.Page = 1;
        filter.PageSize = 10000;

        var result = await _getLogsHandler.HandleAsync(new GetLogsQuery { Filter = filter }, cancellationToken);

        var csv = BuildCsv(result.Data);
        var fileName = $"logs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", fileName);
    }

    private static string BuildCsv(IReadOnlyList<LogEntryDto> data)
    {
        var sb = new StringBuilder();
        sb.AppendLine("LogId,Timestamp,LogLevel,UserEmail,Action,Module,SubModule,Message,IPAddress,CorrelationId");

        foreach (var log in data)
        {
            sb.AppendLine(string.Join(",", [
                log.LogId.ToString(),
                log.Timestamp.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                log.LogLevel,
                Escape(log.UserEmail),
                Escape(log.Action),
                Escape(log.Module),
                Escape(log.SubModule),
                Escape(log.Message),
                log.IPAddress ?? "",
                log.CorrelationId ?? ""
            ]));
        }

        return sb.ToString();
    }

    private static string Escape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
