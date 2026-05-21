using UnityMicroFund.API.Areas.Logging.DTOs;
using UnityMicroFund.API.Areas.Logging.Models;

namespace UnityMicroFund.API.Areas.Logging.Repository;

public interface ILogRepository
{
    Task AddAsync(LogEntry entry, CancellationToken cancellationToken = default);
    Task<PagedResult<LogEntryDto>> GetPagedAsync(LogFilterDto filter, CancellationToken cancellationToken = default);
    Task<LogEntryDto?> GetByIdAsync(Guid logId, CancellationToken cancellationToken = default);
    Task<LogStatsDto> GetStatsAsync(int days, CancellationToken cancellationToken = default);
}
