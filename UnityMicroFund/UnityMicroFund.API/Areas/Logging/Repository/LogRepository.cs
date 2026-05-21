using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Logging.DTOs;
using UnityMicroFund.API.Areas.Logging.Models;
using UnityMicroFund.API.Data;

namespace UnityMicroFund.API.Areas.Logging.Repository;

public class LogRepository : ILogRepository
{
    private readonly AppDbContext _context;

    public LogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(LogEntry entry, CancellationToken cancellationToken = default)
    {
        _context.LogEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResult<LogEntryDto>> GetPagedAsync(LogFilterDto filter, CancellationToken cancellationToken = default)
    {
        var query = _context.LogEntries.AsNoTracking().AsQueryable();

        if (filter.FromDate.HasValue)
            query = query.Where(l => l.Timestamp >= filter.FromDate.Value);
        if (filter.ToDate.HasValue)
            query = query.Where(l => l.Timestamp <= filter.ToDate.Value);
        if (!string.IsNullOrWhiteSpace(filter.LogLevel) && Enum.TryParse<AppLogLevel>(filter.LogLevel, true, out var level))
            query = query.Where(l => l.LogLevel == level);
        if (filter.UserId.HasValue)
            query = query.Where(l => l.UserId == filter.UserId.Value);
        if (!string.IsNullOrWhiteSpace(filter.Module))
            query = query.Where(l => l.Module == filter.Module);
        if (!string.IsNullOrWhiteSpace(filter.SubModule))
            query = query.Where(l => l.SubModule == filter.SubModule);
        if (!string.IsNullOrWhiteSpace(filter.Action))
            query = query.Where(l => l.Action.Contains(filter.Action));
        if (!string.IsNullOrWhiteSpace(filter.CorrelationId))
            query = query.Where(l => l.CorrelationId == filter.CorrelationId);
        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(l =>
                l.Message.Contains(filter.Search) ||
                (l.UserEmail != null && l.UserEmail.Contains(filter.Search)) ||
                l.Action.Contains(filter.Search));

        query = filter.SortBy?.ToLower() switch
        {
            "loglevel" => filter.SortDescending ? query.OrderByDescending(l => l.LogLevel) : query.OrderBy(l => l.LogLevel),
            "module"   => filter.SortDescending ? query.OrderByDescending(l => l.Module)   : query.OrderBy(l => l.Module),
            "action"   => filter.SortDescending ? query.OrderByDescending(l => l.Action)   : query.OrderBy(l => l.Action),
            _          => filter.SortDescending ? query.OrderByDescending(l => l.Timestamp) : query.OrderBy(l => l.Timestamp)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var pageSize = Math.Clamp(filter.PageSize, 1, 1000);
        var page = Math.Max(1, filter.Page);

        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new LogEntryDto
            {
                LogId = l.LogId,
                Timestamp = l.Timestamp,
                LogLevel = l.LogLevel.ToString(),
                UserId = l.UserId,
                UserEmail = l.UserEmail,
                Action = l.Action,
                Message = l.Message,
                Exception = l.Exception,
                IPAddress = l.IPAddress,
                UserAgent = l.UserAgent,
                Module = l.Module,
                SubModule = l.SubModule,
                CorrelationId = l.CorrelationId,
                AdditionalData = l.AdditionalData
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<LogEntryDto>
        {
            Data = data,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<LogEntryDto?> GetByIdAsync(Guid logId, CancellationToken cancellationToken = default)
    {
        return await _context.LogEntries
            .AsNoTracking()
            .Where(l => l.LogId == logId)
            .Select(l => new LogEntryDto
            {
                LogId = l.LogId,
                Timestamp = l.Timestamp,
                LogLevel = l.LogLevel.ToString(),
                UserId = l.UserId,
                UserEmail = l.UserEmail,
                Action = l.Action,
                Message = l.Message,
                Exception = l.Exception,
                IPAddress = l.IPAddress,
                UserAgent = l.UserAgent,
                Module = l.Module,
                SubModule = l.SubModule,
                CorrelationId = l.CorrelationId,
                AdditionalData = l.AdditionalData
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<LogStatsDto> GetStatsAsync(int days, CancellationToken cancellationToken = default)
    {
        var from = DateTime.UtcNow.AddDays(-days);

        var byLevel = await _context.LogEntries
            .AsNoTracking()
            .Where(l => l.Timestamp >= from)
            .GroupBy(l => l.LogLevel)
            .Select(g => new { Level = g.Key.ToString(), Count = g.Count() })
            .ToListAsync(cancellationToken);

        var byModule = await _context.LogEntries
            .AsNoTracking()
            .Where(l => l.Timestamp >= from && l.Module != null)
            .GroupBy(l => l.Module!)
            .Select(g => new { Module = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync(cancellationToken);

        var total = await _context.LogEntries
            .AsNoTracking()
            .CountAsync(l => l.Timestamp >= from, cancellationToken);

        return new LogStatsDto
        {
            ByLevel = byLevel.ToDictionary(e => e.Level, e => e.Count),
            ByModule = byModule.ToDictionary(e => e.Module, e => e.Count),
            TotalCount = total
        };
    }
}
