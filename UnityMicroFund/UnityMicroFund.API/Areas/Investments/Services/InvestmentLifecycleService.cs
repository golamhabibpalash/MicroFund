using System.Data;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
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

    public InvestmentLifecycleService(AppDbContext context, IWalletService wallet, IInvestmentService investments)
    {
        _context = context;
        _wallet = wallet;
        _investments = investments;
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

        if (target == InvestmentStatus.Active)
        {
            await GuardFullySubscribedAsync(investment, cancellationToken);
        }

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

        // Section 11: the organisation's operational fee comes off the top.
        var operationalExpense = Round2(grossProfit * investment.OperationalExpensePercentage / 100m);
        var netProfit = grossProfit - operationalExpense;

        var now = DateTime.UtcNow;
        var distributions = new List<ProfitDistribution>();
        var allocatedProfit = 0m;

        foreach (var holding in holdings.OrderByDescending(h => h.SharesOwned).ThenBy(h => h.MemberId))
        {
            // Section 12, computed from integer share counts rather than a stored
            // percentage, and always rounded DOWN so the sum can never exceed net profit.
            var profit = Floor2(netProfit * holding.SharesOwned / totalShares);
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

        return new ProfitSettlementDto
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

    /// <summary>Section 9: a project cannot start until every share is sold.</summary>
    private async Task GuardFullySubscribedAsync(Investment investment, CancellationToken cancellationToken)
    {
        var totalShares = investment.TotalShares ?? 0;
        var sold = await SoldSharesAsync(investment.Id, cancellationToken);

        if (totalShares <= 0 || sold < totalShares)
        {
            throw new ValidationException(
                $"'{investment.Name}' cannot start until all shares are sold ({sold} of {totalShares} sold, {totalShares - sold} remaining).");
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
