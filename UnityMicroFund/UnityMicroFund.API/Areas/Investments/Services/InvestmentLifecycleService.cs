using System.Data;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Areas.Tasks.Services;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public class InvestmentLifecycleService : IInvestmentLifecycleService
{
    /// <summary>
    /// Legal manual transitions. FullySubscribed is reached automatically when the
    /// last share sells, and ProfitDistributed only via DistributeProfitAsync, so
    /// neither is a manual target here.
    /// </summary>
    private static readonly Dictionary<InvestmentStatus, InvestmentStatus[]> AllowedTransitions = new()
    {
        [InvestmentStatus.Draft] = new[] { InvestmentStatus.OpenForSubscription, InvestmentStatus.Cancelled },
        [InvestmentStatus.OpenForSubscription] = new[] { InvestmentStatus.Draft, InvestmentStatus.Cancelled },
        [InvestmentStatus.FullySubscribed] = new[] { InvestmentStatus.Active, InvestmentStatus.Cancelled },
        [InvestmentStatus.Active] = new[] { InvestmentStatus.Completed },
        [InvestmentStatus.Completed] = Array.Empty<InvestmentStatus>(),
        [InvestmentStatus.ProfitDistributed] = new[] { InvestmentStatus.Closed },
        [InvestmentStatus.Closed] = Array.Empty<InvestmentStatus>(),
        [InvestmentStatus.Cancelled] = Array.Empty<InvestmentStatus>()
    };

    private readonly AppDbContext _context;
    private readonly IWalletService _wallet;
    private readonly IInvestmentService _investments;
    private readonly INotificationService _notifications;

    public InvestmentLifecycleService(AppDbContext context, IWalletService wallet, IInvestmentService investments, INotificationService notifications)
    {
        _context = context;
        _wallet = wallet;
        _investments = investments;
        _notifications = notifications;
    }

    public async Task<InvestmentResponseDto> ChangeStatusAsync(
        Guid investmentId, string targetStatus, string? reason, string? actionedBy, CancellationToken cancellationToken = default)
    {
        var target = ParseStatus(targetStatus);

        if (target == InvestmentStatus.Cancelled)
        {
            return await CancelAsync(investmentId, reason, actionedBy, cancellationToken);
        }

        var investment = await _context.Investments
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        GuardTransition(investment.Status, target);

        if (target == InvestmentStatus.OpenForSubscription)
        {
            if (investment.TotalShares is null or <= 0)
            {
                throw new ValidationException("Set the total number of shares before opening the project for subscription.");
            }
            if (investment.SharePrice is null or <= 0)
            {
                throw new ValidationException("The share price could not be derived; check the project value and share count.");
            }
        }

        if (target == InvestmentStatus.Draft)
        {
            var sold = await SoldSharesAsync(investmentId, cancellationToken);
            if (sold > 0)
            {
                throw new ValidationException(
                    $"{sold} share(s) have already been sold; cancel the project instead of returning it to draft.");
            }
        }

        ApplyStatus(investment, target, actionedBy);

        // Circulating a project notifies every eligible member (spec section 2/17.1).
        // The project starts (becomes Active) later; starting closes further buying.
        if (target == InvestmentStatus.OpenForSubscription)
        {
            await NotifyMembersOnCirculationAsync(investment, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return (await _investments.GetInvestmentByIdAsync(investmentId, cancellationToken))!;
    }

    public async Task<InvestmentResponseDto> CompleteAsync(
        Guid investmentId, CompleteInvestmentDto dto, string? actionedBy, CancellationToken cancellationToken = default)
    {
        var investment = await _context.Investments
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.Status != InvestmentStatus.Active)
        {
            throw new ValidationException(
                $"Only an Active project can be completed (current status: {investment.Status}).");
        }

        investment.ActualGrossProfit = dto.ActualGrossProfit;
        investment.CompletionDate = dto.CompletionDate ?? DateTime.UtcNow;
        investment.ClosingNotes = dto.ClosingNotes;
        ApplyStatus(investment, InvestmentStatus.Completed, actionedBy);

        await _context.SaveChangesAsync(cancellationToken);

        return (await _investments.GetInvestmentByIdAsync(investmentId, cancellationToken))!;
    }

    public async Task<ProfitSettlementDto> DistributeProfitAsync(
        Guid investmentId, string? actionedBy, CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var investment = await _context.Investments
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.Status != InvestmentStatus.Completed)
        {
            throw new ValidationException(
                $"Profit can only be distributed for a Completed project (current status: {investment.Status}).");
        }

        if (investment.ActualGrossProfit is null)
        {
            throw new ValidationException("Record the actual gross profit before distributing.");
        }

        // Belt and braces against a double payout even though the status check above
        // should already prevent it.
        var alreadyDistributed = await _context.ProfitDistributions
            .AnyAsync(p => p.InvestmentId == investmentId, cancellationToken);
        if (alreadyDistributed)
        {
            throw new ConflictException("Profit has already been distributed for this project.");
        }

        var holdings = await _context.MemberInvestments
            .Include(mi => mi.Member)
            .Where(mi => mi.InvestmentId == investmentId && mi.SharesOwned > 0)
            .ToListAsync(cancellationToken);

        if (holdings.Count == 0)
        {
            throw new ValidationException("This project has no shareholders to distribute to.");
        }

        var totalShares = investment.TotalShares ?? holdings.Sum(h => h.SharesOwned);
        var grossProfit = investment.ActualGrossProfit.Value;

        // Accrued interim profits are included in the investable result, so a project
        // that paid profit along the way is settled correctly at the end.
        var interimProfitTotal = await _context.InvestmentInterimProfits
            .Where(p => p.InvestmentId == investmentId)
            .SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;

        // Section 11: the organisation's maintenance/% fee comes off the top of the
        // gross result (gross received + accrued interim profit).
        var grossResult = grossProfit + interimProfitTotal;
        var operationalExpense = Round2(grossResult * investment.OperationalExpensePercentage / 100m);
        var netProfit = grossResult - operationalExpense;

        // Loss policy (confirmed): on a loss the investor receives their principal back
        // and no profit; the shortfall is absorbed by the organisation - the wallet is
        // never debited for a negative "profit".
        var profitAvailable = Math.Max(0m, netProfit);

        var now = DateTime.UtcNow;
        var distributions = new List<ProfitDistribution>();
        var allocatedProfit = 0m;

        foreach (var holding in holdings.OrderByDescending(h => h.SharesOwned).ThenBy(h => h.MemberId))
        {
            // Section 12, computed from integer share counts rather than a stored
            // percentage, and always rounded DOWN so the sum can never exceed the pot.
            var profit = Floor2(profitAvailable * holding.SharesOwned / totalShares);
            allocatedProfit += profit;

            var distribution = new ProfitDistribution
            {
                Id = Guid.NewGuid(),
                InvestmentId = investmentId,
                MemberId = holding.MemberId,
                SharesOwned = holding.SharesOwned,
                OwnershipPercentage = Math.Round((decimal)holding.SharesOwned / totalShares * 100m, 6),
                PrincipalAmount = holding.AmountInvested,
                ProfitAmount = profit,
                TotalPayable = holding.AmountInvested + profit,
                DistributedAt = now
            };

            distributions.Add(distribution);
            _context.ProfitDistributions.Add(distribution);

            // Section 13: principal and profit both land back in the wallet, so the
            // investor can reinvest or request payout.
            _wallet.AddEntry(
                holding.MemberId, WalletEntryType.PrincipalReturn, holding.AmountInvested,
                $"Principal returned from {investment.Name}", actionedBy, investmentId: investmentId);

            if (profit > 0)
            {
                _wallet.AddEntry(
                    holding.MemberId, WalletEntryType.ProfitCredit, profit,
                    $"Profit from {investment.Name}", actionedBy, investmentId: investmentId);
            }
        }

        // Whatever rounding left behind stays with the organisation.
        var remainder = netProfit - allocatedProfit;

        investment.OperationalExpenseAmount = operationalExpense;
        investment.NetProfit = netProfit;
        investment.UndistributedRemainder = remainder;
        ApplyStatus(investment, InvestmentStatus.ProfitDistributed, actionedBy);

        var subscriptions = await _context.ShareSubscriptions
            .Where(s => s.InvestmentId == investmentId && s.Status == ShareSubscriptionStatus.Active)
            .ToListAsync(cancellationToken);
        foreach (var s in subscriptions)
        {
            s.Status = ShareSubscriptionStatus.Settled;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return await GetSettlementAsync(investmentId, cancellationToken);
    }

    public async Task<ProfitSettlementDto> GetSettlementAsync(
        Guid investmentId, CancellationToken cancellationToken = default)
    {
        var investment = await _context.Investments
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        var rows = await _context.ProfitDistributions
            .AsNoTracking()
            .Where(p => p.InvestmentId == investmentId)
            .OrderByDescending(p => p.SharesOwned)
            .Select(p => new ProfitDistributionDto
            {
                Id = p.Id,
                MemberId = p.MemberId,
                MemberName = p.Member!.Name,
                SharesOwned = p.SharesOwned,
                OwnershipPercentage = p.OwnershipPercentage,
                PrincipalAmount = p.PrincipalAmount,
                ProfitAmount = p.ProfitAmount,
                TotalPayable = p.TotalPayable,
                DistributedAt = p.DistributedAt,
                DisbursedAt = p.DisbursedAt
            })
            .ToListAsync(cancellationToken);

        var settlement = new ProfitSettlementDto
        {
            InvestmentId = investment.Id,
            InvestmentName = investment.Name,
            Status = investment.Status.ToString(),
            ActualGrossProfit = investment.ActualGrossProfit ?? 0m,
            OperationalExpensePercentage = investment.OperationalExpensePercentage,
            OperationalExpenseAmount = investment.OperationalExpenseAmount ?? 0m,
            NetProfit = investment.NetProfit ?? 0m,
            UndistributedRemainder = investment.UndistributedRemainder ?? 0m,
            TotalPrincipalReturned = rows.Sum(r => r.PrincipalAmount),
            TotalProfitDistributed = rows.Sum(r => r.ProfitAmount),
            TotalPayable = rows.Sum(r => r.TotalPayable),
            Distributions = rows
        };

        var totalShares = investment.TotalShares ?? rows.Sum(r => r.SharesOwned);
        var holdings = await _context.MemberInvestments
            .AsNoTracking()
            .Where(mi => mi.InvestmentId == investmentId)
            .ToListAsync(cancellationToken);

        settlement.TotalInvested = holdings.Sum(h => h.AmountInvested);
        settlement.SharesSold = rows.Sum(r => r.SharesOwned);
        settlement.InterimProfitTotal = await _context.InvestmentInterimProfits
            .Where(p => p.InvestmentId == investmentId)
            .SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;
        settlement.GrossResult = (investment.ActualGrossProfit ?? 0m) + settlement.InterimProfitTotal;

        return settlement;
    }

    public async Task<ProfitSettlementDto> DisburseAsync(
        Guid investmentId, Guid? memberId, string? actionedBy, CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var investment = await _context.Investments
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.Status is not (InvestmentStatus.ProfitDistributed or InvestmentStatus.Closed))
        {
            throw new ValidationException("Distribute the profit before disbursing payments.");
        }

        var pending = await _context.ProfitDistributions
            .Where(p => p.InvestmentId == investmentId
                     && p.DisbursedAt == null
                     && (memberId == null || p.MemberId == memberId))
            .ToListAsync(cancellationToken);

        if (pending.Count == 0)
        {
            throw new ValidationException("There is nothing left to disburse for this project.");
        }

        var now = DateTime.UtcNow;

        foreach (var row in pending)
        {
            var balance = await _context.WalletEntries
                .Where(w => w.MemberId == row.MemberId)
                .SumAsync(w => (decimal?)w.Amount, cancellationToken) ?? 0m;

            // The investor may already have reinvested the credited money elsewhere;
            // paying out more than the wallet holds would drive it negative.
            if (balance < row.TotalPayable)
            {
                throw new ValidationException(
                    $"{row.Member?.Name ?? "This investor"} has a wallet balance of {balance:N2}, " +
                    $"which is less than the {row.TotalPayable:N2} payable. The funds may already have been reinvested.");
            }

            _wallet.AddEntry(
                row.MemberId, WalletEntryType.Disbursement, -row.TotalPayable,
                $"Settlement paid out for {investment.Name}", actionedBy, investmentId: investmentId);

            row.DisbursedAt = now;
            row.DisbursedBy = actionedBy;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return await GetSettlementAsync(investmentId, cancellationToken);
    }

    public async Task<InvestmentResponseDto> CancelAsync(
        Guid investmentId, string? reason, string? actionedBy, CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var investment = await _context.Investments
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        GuardTransition(investment.Status, InvestmentStatus.Cancelled);

        var subscriptions = await _context.ShareSubscriptions
            .Where(s => s.InvestmentId == investmentId && s.Status == ShareSubscriptionStatus.Active)
            .ToListAsync(cancellationToken);

        foreach (var subscription in subscriptions)
        {
            _wallet.AddEntry(
                subscription.MemberId, WalletEntryType.PurchaseRefund, subscription.AmountPaid,
                $"Refund - {investment.Name} cancelled", actionedBy,
                investmentId: investmentId, shareSubscriptionId: subscription.Id);

            subscription.Status = ShareSubscriptionStatus.Cancelled;
        }

        var holdings = await _context.MemberInvestments
            .Where(mi => mi.InvestmentId == investmentId)
            .ToListAsync(cancellationToken);
        _context.MemberInvestments.RemoveRange(holdings);

        investment.ClosingNotes = string.IsNullOrWhiteSpace(reason)
            ? investment.ClosingNotes
            : $"Cancelled: {reason}";
        ApplyStatus(investment, InvestmentStatus.Cancelled, actionedBy);

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return (await _investments.GetInvestmentByIdAsync(investmentId, cancellationToken))!;
    }

    // ---- helpers -----------------------------------------------------------

    /// <summary>
    /// Notifies every eligible member's user account when a project is circulated.
    /// Members without a linked user account (older records) are skipped - the
    /// notification is a convenience, not a hard requirement.
    /// </summary>
    private async Task NotifyMembersOnCirculationAsync(Investment investment, CancellationToken cancellationToken)
    {
        var creator = await _context.Users
            .AsNoTracking()
            .Where(u => u.IsActive)
            .OrderBy(u => u.CreatedAt)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var targets = await _context.Members
            .AsNoTracking()
            .Where(m => m.IsActive && m.UserId != null)
            .Select(m => new { UserId = m.UserId!.Value, MemberId = m.Id, m.Name })
            .ToListAsync(cancellationToken);

        foreach (var target in targets)
        {
            await _notifications.CreateNotificationAsync(
                "New investment circulated",
                $"'{investment.Name}' is now open for subscription. Buy ৳{investment.SharePrice?.ToString("N2") ?? "n/a"} per share between " +
                $"{(investment.MinimumSharesPerMember?.ToString() ?? "1")} and {(investment.MaximumSharesPerMember?.ToString() ?? "unlimited")} shares.",
                NotificationType.InvestmentUpdate,
                target.UserId,
                creator,
                relatedMemberId: target.MemberId);
        }
    }

    private async Task<int> SoldSharesAsync(Guid investmentId, CancellationToken cancellationToken)
        => await _context.ShareSubscriptions
            .Where(s => s.InvestmentId == investmentId && s.Status == ShareSubscriptionStatus.Active)
            .SumAsync(s => (int?)s.SharesPurchased, cancellationToken) ?? 0;

    private static void GuardTransition(InvestmentStatus from, InvestmentStatus to)
    {
        if (from == to)
        {
            throw new ValidationException($"The project is already {from}.");
        }

        var allowed = AllowedTransitions.TryGetValue(from, out var targets) ? targets : Array.Empty<InvestmentStatus>();

        if (!allowed.Contains(to))
        {
            var list = allowed.Length == 0 ? "none (this is a final state)" : string.Join(", ", allowed);
            throw new ValidationException($"Cannot move from {from} to {to}. Allowed from {from}: {list}.");
        }
    }

    private static void ApplyStatus(Investment investment, InvestmentStatus status, string? actionedBy)
    {
        var now = DateTime.UtcNow;
        investment.Status = status;
        investment.UpdatedAt = now;
        investment.LastModifiedAt = now;
        investment.LastModifiedBy = actionedBy;
    }

    private static InvestmentStatus ParseStatus(string? value)
    {
        if (Enum.TryParse<InvestmentStatus>(value, ignoreCase: true, out var parsed) && Enum.IsDefined(parsed))
        {
            return parsed;
        }

        throw new ValidationException(
            $"'{value}' is not a valid status. Allowed values: {string.Join(", ", Enum.GetNames<InvestmentStatus>())}.");
    }

    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    /// <summary>Truncates to 2dp. Never rounds up, so allocations cannot overshoot the pot.</summary>
    private static decimal Floor2(decimal value) => Math.Floor(value * 100m) / 100m;
}
