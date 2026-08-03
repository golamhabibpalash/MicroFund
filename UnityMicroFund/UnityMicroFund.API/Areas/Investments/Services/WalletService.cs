using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public class WalletService : IWalletService
{
    private readonly AppDbContext _context;

    public WalletService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<decimal> GetBalanceAsync(Guid memberId, CancellationToken cancellationToken = default)
    {
        // Summed from history rather than read from a stored column, so the balance
        // cannot drift away from the entries that justify it.
        return await _context.WalletEntries
            .AsNoTracking()
            .Where(w => w.MemberId == memberId)
            .SumAsync(w => (decimal?)w.Amount, cancellationToken) ?? 0m;
    }

    public async Task<WalletSummaryDto?> GetSummaryAsync(Guid memberId, CancellationToken cancellationToken = default)
    {
        var member = await _context.Members
            .AsNoTracking()
            .Where(m => m.Id == memberId)
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.ProfileImageUrl,
                m.MemberId,
                m.Email,
                m.Phone,
                m.Occupation,
                m.JoinDate,
                m.IsActive
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) return null;

        var entries = await _context.WalletEntries
            .AsNoTracking()
            .Where(w => w.MemberId == memberId)
            .OrderBy(w => w.CreatedAt).ThenBy(w => w.Id)
            .Select(w => new
            {
                w.Id,
                w.EntryType,
                w.Amount,
                w.InvestmentId,
                InvestmentName = w.Investment != null ? w.Investment.Name : null,
                w.Description,
                w.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var summary = new WalletSummaryDto
        {
            MemberId = member.Id,
            MemberName = member.Name,
            MemberImageUrl = member.ProfileImageUrl,
            MemberCode = member.MemberId,
            Email = member.Email,
            Phone = member.Phone,
            Occupation = member.Occupation,
            JoinDate = member.JoinDate,
            IsActive = member.IsActive
        };

        var running = 0m;
        foreach (var e in entries)
        {
            running += e.Amount;
            summary.Entries.Add(new WalletEntryDto
            {
                Id = e.Id,
                EntryType = e.EntryType.ToString(),
                Amount = e.Amount,
                BalanceAfter = running,
                InvestmentId = e.InvestmentId,
                InvestmentName = e.InvestmentName,
                Description = e.Description,
                CreatedAt = e.CreatedAt
            });
        }

        summary.Balance = running;
        summary.TotalDeposited = entries.Where(e => e.EntryType == WalletEntryType.Deposit).Sum(e => e.Amount);
        summary.TotalProfitEarned = entries.Where(e => e.EntryType == WalletEntryType.ProfitCredit).Sum(e => e.Amount);

        // Purchases and disbursements are stored negative; report them as magnitudes.
        summary.TotalInvested = -entries.Where(e => e.EntryType == WalletEntryType.SharePurchase).Sum(e => e.Amount);
        summary.TotalDisbursed = -entries.Where(e => e.EntryType == WalletEntryType.Disbursement).Sum(e => e.Amount);

        // Newest first for display; the running balance was computed oldest-first.
        summary.Entries.Reverse();

        return summary;
    }

    public WalletEntry AddEntry(
        Guid memberId,
        WalletEntryType type,
        decimal signedAmount,
        string? description,
        string? createdBy,
        Guid? investmentId = null,
        Guid? shareSubscriptionId = null,
        Guid? transactionId = null)
    {
        var entry = new WalletEntry
        {
            Id = Guid.NewGuid(),
            MemberId = memberId,
            EntryType = type,
            Amount = signedAmount,
            InvestmentId = investmentId,
            ShareSubscriptionId = shareSubscriptionId,
            TransactionId = transactionId,
            Description = description,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.WalletEntries.Add(entry);
        return entry;
    }
}
