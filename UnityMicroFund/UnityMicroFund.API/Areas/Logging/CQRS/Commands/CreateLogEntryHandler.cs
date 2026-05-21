using UnityMicroFund.API.Areas.Logging.Models;
using UnityMicroFund.API.Areas.Logging.Repository;

namespace UnityMicroFund.API.Areas.Logging.CQRS.Commands;

public class CreateLogEntryHandler : ICommandHandler<CreateLogEntryCommand, Guid>
{
    private readonly ILogRepository _repository;

    public CreateLogEntryHandler(ILogRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> HandleAsync(CreateLogEntryCommand command, CancellationToken cancellationToken = default)
    {
        var entry = new LogEntry
        {
            LogId = Guid.NewGuid(),
            Timestamp = DateTime.UtcNow,
            LogLevel = command.LogLevel,
            UserId = command.UserId,
            UserEmail = command.UserEmail,
            Action = command.Action,
            Message = command.Message,
            Exception = command.Exception,
            IPAddress = command.IPAddress,
            UserAgent = command.UserAgent,
            Module = command.Module,
            SubModule = command.SubModule,
            CorrelationId = command.CorrelationId,
            AdditionalData = command.AdditionalData
        };

        await _repository.AddAsync(entry, cancellationToken);
        return entry.LogId;
    }
}
