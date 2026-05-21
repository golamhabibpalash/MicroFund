using UnityMicroFund.API.Areas.Logging.DTOs;

namespace UnityMicroFund.API.Areas.Logging.CQRS.Queries;

public class GetLogsQuery : IQuery<PagedResult<LogEntryDto>>
{
    public LogFilterDto Filter { get; set; } = new();
}
