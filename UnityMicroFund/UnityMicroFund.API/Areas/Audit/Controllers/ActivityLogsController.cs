using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Data;

namespace UnityMicroFund.API.Areas.Audit.Controllers;

[ApiController]
[Route("api/activity-logs")]
[Authorize(Roles = "Admin")]
public class ActivityLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ActivityLogsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivityLogs(
        [FromQuery] Guid? userId = null,
        [FromQuery] string? module = null,
        [FromQuery] string? action = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.ActivityLogs.AsQueryable();

        if (userId.HasValue)
            query = query.Where(a => a.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(module))
            query = query.Where(a => a.Module == module);
        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);
        if (fromDate.HasValue)
            query = query.Where(a => a.Timestamp >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(a => a.Timestamp <= toDate.Value);

        var totalCount = await query.CountAsync();
        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            totalCount,
            page,
            pageSize,
            data = logs
        });
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserActivityLogs(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var totalCount = await _context.ActivityLogs.CountAsync(a => a.UserId == userId);
        var logs = await _context.ActivityLogs
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            totalCount,
            page,
            pageSize,
            data = logs
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetActivityLog(Guid id)
    {
        var log = await _context.ActivityLogs.FindAsync(id);
        if (log == null)
            return NotFound();

        return Ok(log);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetActivityStats([FromQuery] int days = 7)
    {
        var fromDate = DateTime.UtcNow.AddDays(-days);

        var stats = await _context.ActivityLogs
            .Where(a => a.Timestamp >= fromDate)
            .GroupBy(a => a.Action)
            .Select(g => new { Action = g.Key, Count = g.Count() })
            .ToListAsync();

        var moduleStats = await _context.ActivityLogs
            .Where(a => a.Timestamp >= fromDate)
            .GroupBy(a => a.Module)
            .Select(g => new { Module = g.Key, Count = g.Count() })
            .ToListAsync();

        var userStats = await _context.ActivityLogs
            .Where(a => a.Timestamp >= fromDate)
            .GroupBy(a => a.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync();

        return Ok(new { stats, moduleStats, userStats });
    }
}
