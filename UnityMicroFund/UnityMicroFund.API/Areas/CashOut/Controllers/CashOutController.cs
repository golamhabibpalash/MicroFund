using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.CashOut.DTOs;
using UnityMicroFund.API.Areas.CashOut.Services;
using UnityMicroFund.API.Data;

namespace UnityMicroFund.API.Areas.CashOut.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CashOutController : ControllerBase
{
    private readonly ICashOutService _cashOutService;
    private readonly AppDbContext _context;

    public CashOutController(ICashOutService cashOutService, AppDbContext context)
    {
        _cashOutService = cashOutService;
        _context = context;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyRequests(CancellationToken cancellationToken)
    {
        var memberId = await ResolveCurrentMemberIdAsync(cancellationToken);
        if (memberId == null)
        {
            return NotFound(new { message = "No member profile is linked to this account." });
        }
        return Ok(await _cashOutService.GetMemberRequestsAsync(memberId.Value, cancellationToken));
    }

    [HttpGet("me/available")]
    public async Task<IActionResult> GetMyAvailableBalance(CancellationToken cancellationToken)
    {
        var memberId = await ResolveCurrentMemberIdAsync(cancellationToken);
        if (memberId == null)
        {
            return NotFound(new { message = "No member profile is linked to this account." });
        }
        return Ok(await _cashOutService.GetAvailableBalanceAsync(memberId.Value, cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCashOutRequestDto dto, CancellationToken cancellationToken)
    {
        var memberId = await ResolveCurrentMemberIdAsync(cancellationToken);
        if (memberId == null)
        {
            return NotFound(new { message = "No member profile is linked to this account." });
        }
        try
        {
            var result = await _cashOutService.CreateAsync(memberId.Value, dto, GetCurrentUserName() ?? "member", cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var memberId = await ResolveCurrentMemberIdAsync(cancellationToken);
        if (memberId == null)
        {
            return NotFound(new { message = "No member profile is linked to this account." });
        }
        try
        {
            var result = await _cashOutService.CancelAsync(id, memberId.Value, cancellationToken);
            return result ? Ok(new { message = "Cash-out request cancelled." }) : NotFound(new { message = "Request not found." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAll([FromQuery] string? status = null, [FromQuery] string? search = null, CancellationToken cancellationToken = default)
        => Ok(await _cashOutService.GetAllRequestsAsync(status, search, cancellationToken));

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _cashOutService.GetByIdAsync(id, cancellationToken);
        return result == null ? NotFound(new { message = "Request not found." }) : Ok(result);
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _cashOutService.ApproveAsync(id, GetCurrentUserName() ?? "admin", cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] CashOutActionDto? dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _cashOutService.RejectAsync(id, dto?.AdminRemarks, GetCurrentUserName() ?? "admin", cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<Guid?> ResolveCurrentMemberIdAsync(CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);

        if (Guid.TryParse(userIdRaw, out var userId))
        {
            var byUser = await _context.Members
                .AsNoTracking()
                .Where(m => m.UserId == userId)
                .Select(m => (Guid?)m.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (byUser.HasValue) return byUser;
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            return await _context.Members
                .AsNoTracking()
                .Where(m => m.Email == email)
                .Select(m => (Guid?)m.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return null;
    }

    private string? GetCurrentUserName() =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue(ClaimTypes.Email)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
}
