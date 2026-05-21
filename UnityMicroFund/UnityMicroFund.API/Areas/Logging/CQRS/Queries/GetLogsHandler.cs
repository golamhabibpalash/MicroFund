using UnityMicroFund.API.Areas.Logging.DTOs;
using UnityMicroFund.API.Areas.Logging.Repository;

namespace UnityMicroFund.API.Areas.Logging.CQRS.Queries;

public class GetLogsHandler : IQueryHandler<GetLogsQuery, PagedResult<LogEntryDto>>
{
    private readonly ILogRepository _repository;

    public GetLogsHandler(ILogRepository repository)
    {
        _repository = repository;
    }

    public Task<PagedResult<LogEntryDto>> HandleAsync(GetLogsQuery query, CancellationToken cancellationToken = default)
        => _repository.GetPagedAsync(query.Filter, cancellationToken);
}
