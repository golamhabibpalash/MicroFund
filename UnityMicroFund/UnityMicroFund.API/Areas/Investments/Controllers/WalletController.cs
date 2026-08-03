using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.Services;
using UnityMicroFund.API.Data;

namespace UnityMicroFund.API.Areas.Investments.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly IWalletService _wallet;
    private readonly ISubscriptionService _subscriptions;
    private readonly AppDbContext _context;

    public WalletController(IWalletService wallet, ISubscriptionService subscriptions, AppDbContext context)
    {
        _wallet = wallet;
        _subscriptions = subscriptions;
        _context = context;
    }

    /// <summary>Signed-in member's own wallet.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMyWallet(CancellationToken cancellationToken)
    {
        var memberId = await ResolveCurrentMemberIdAsync(cancellationToken);
        if (memberId == null)
        {
            return NotFound(new { message = "No member profile is linked to this account." });
        }

        var summary = await _wallet.GetSummaryAsync(memberId.Value, cancellationToken);
        return summary == null ? NotFound(new { message = "Wallet not found." }) : Ok(summary);
    }

    [HttpGet("me/subscriptions")]
    public async Task<IActionResult> GetMySubscriptions(CancellationToken cancellationToken)
    {
        var memberId = await ResolveCurrentMemberIdAsync(cancellationToken);
        if (memberId == null)
        {
            return NotFound(new { message = "No member profile is linked to this account." });
        }

        return Ok(await _subscriptions.GetMemberSubscriptionsAsync(memberId.Value, cancellationToken));
    }

    [HttpGet("{memberId:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetMemberWallet(Guid memberId, CancellationToken cancellationToken)
    {
        var summary = await _wallet.GetSummaryAsync(memberId, cancellationToken);
        return summary == null ? NotFound(new { message = "Member not found." }) : Ok(summary);
    }

    /// <summary>Balances for every member, for the admin overview.</summary>
    [HttpGet("balances")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAllBalances(CancellationToken cancellationToken)
    {
        var balances = await _context.WalletEntries
            .AsNoTracking()
            .GroupBy(w => new { w.MemberId, w.Member!.Name })
            .Select(g => new
            {
                memberId = g.Key.MemberId,
                memberName = g.Key.Name,
                balance = g.Sum(w => w.Amount),
                entryCount = g.Count()
            })
            .OrderByDescending(x => x.balance)
            .ToListAsync(cancellationToken);

        return Ok(balances);
    }

    /// <summary>
    /// Members are matched by linked user id first, then email - mirroring
    /// MembersController.GetCurrentUserMember.
    /// </summary>
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
}
