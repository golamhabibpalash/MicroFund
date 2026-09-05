using System.Data;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _context;
    private readonly IWalletService _wallet;
    private readonly IInvestmentSettings _settings;

    public SubscriptionService(AppDbContext context, IWalletService wallet, IInvestmentSettings settings)
    {
        _context = context;
        _wallet = wallet;
        _settings = settings;
    }

    public async Task<ShareSubscriptionDto> SubscribeAsync(
        Guid investmentId,
        Guid memberId,
        int shares,
        bool agreementAccepted,
        string? createdBy,
        CancellationToken cancellationToken = default)
    {
        // Enforced here, not just in the UI, so the rule cannot be bypassed by calling
        // the API directly.
        if (!agreementAccepted)
        {
            throw new ValidationException(
                "You must read and accept the investment agreement / caution before purchasing shares.");
        }

        if (shares <= 0)
        {
            throw new ValidationException("Number of shares must be greater than zero.");
        }

        // Serializable so two concurrent buyers cannot both pass the "shares remaining"
        // check and oversubscribe the project between read and write.
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var investment = await _context.Investments
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.Status != InvestmentStatus.OpenForSubscription)
        {
            throw new ValidationException(
                $"'{investment.Name}' is not open for subscription (current status: {investment.Status}).");
        }

        if (investment.TotalShares is null or <= 0 || investment.SharePrice is null or <= 0)
        {
            throw new ValidationException("This project has no share structure defined yet.");
        }

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.Id == memberId, cancellationToken)
            ?? throw new NotFoundException("Member not found.");

        if (!member.IsActive)
        {
            throw new ValidationException("Inactive members cannot subscribe to investments.");
        }

        var totalShares = investment.TotalShares.Value;
        var sharePrice = investment.SharePrice.Value;

        var soldShares = await _context.ShareSubscriptions
            .Where(s => s.InvestmentId == investmentId && s.Status == ShareSubscriptionStatus.Active)
            .SumAsync(s => (int?)s.SharesPurchased, cancellationToken) ?? 0;

        var remaining = totalShares - soldShares;
        if (shares > remaining)
        {
            throw new ValidationException(
                $"Only {remaining} share(s) remain in '{investment.Name}'.");
        }

        var amount = shares * sharePrice;

        var balance = await _context.WalletEntries
            .Where(w => w.MemberId == memberId)
            .SumAsync(w => (decimal?)w.Amount, cancellationToken) ?? 0m;

        if (balance < amount)
        {
            throw new ValidationException(
                $"Insufficient wallet balance. Required {amount:N2}, available {balance:N2}.");
        }

        await EnforceInvestorLimitsAsync(investment, memberId, shares, totalShares, cancellationToken);

        var now = DateTime.UtcNow;

        // One consolidated subscription row per investor per project. A repeat purchase
        // increments the existing row's share count and paid amount instead of inserting
        // a second row, so an investor is only ever listed once per project.
        var subscription = await _context.ShareSubscriptions
            .FirstOrDefaultAsync(
                s => s.InvestmentId == investmentId
                  && s.MemberId == memberId
                  && s.Status == ShareSubscriptionStatus.Active,
                cancellationToken);

        if (subscription is null)
        {
            subscription = new ShareSubscription
            {
                Id = Guid.NewGuid(),
                InvestmentId = investmentId,
                MemberId = memberId,
                SharesPurchased = shares,
                SharePriceAtPurchase = sharePrice,
                AmountPaid = amount,
                Status = ShareSubscriptionStatus.Active,
                PurchasedAt = now,
                AgreementAcceptedAt = now,
                CreatedBy = createdBy
            };
            _context.ShareSubscriptions.Add(subscription);
        }
        else
        {
            subscription.SharesPurchased += shares;
            subscription.AmountPaid += amount;
            subscription.SharePriceAtPurchase = sharePrice;
            subscription.PurchasedAt = now;
            subscription.AgreementAcceptedAt = now;
        }

        _wallet.AddEntry(
            memberId,
            WalletEntryType.SharePurchase,
            -amount,
            $"{shares} share(s) in {investment.Name}",
            createdBy,
            investmentId: investmentId,
            shareSubscriptionId: subscription.Id);

        await UpsertHoldingAsync(investment, memberId, shares, amount, totalShares, now, cancellationToken);

        // Auto-transition once the last share is taken (spec section 8/9).
        if (soldShares + shares >= totalShares)
        {
            investment.Status = InvestmentStatus.FullySubscribed;
            investment.LastModifiedAt = now;
            investment.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return new ShareSubscriptionDto
        {
            Id = subscription.Id,
            InvestmentId = investmentId,
            InvestmentName = investment.Name,
            MemberId = memberId,
            MemberName = member.Name,
            SharesPurchased = subscription.SharesPurchased,
            SharePriceAtPurchase = subscription.SharePriceAtPurchase,
            AmountPaid = subscription.AmountPaid,
            OwnershipPercentage = Math.Round((decimal)subscription.SharesPurchased / totalShares * 100m, 6),
            Status = subscription.Status.ToString(),
            PurchasedAt = subscription.PurchasedAt
        };
    }

    public async Task<IReadOnlyList<ShareSubscriptionDto>> GetSubscriptionsAsync(
        Guid investmentId,
        CancellationToken cancellationToken = default)
    {
        var investment = await _context.Investments
            .AsNoTracking()
            .Where(i => i.Id == investmentId)
            .Select(i => new { i.Name, i.TotalShares })
            .FirstOrDefaultAsync(cancellationToken);

        var totalShares = investment?.TotalShares ?? 0;
        var investmentName = investment?.Name ?? string.Empty;

        var raw = await _context.ShareSubscriptions
            .AsNoTracking()
            .Where(s => s.InvestmentId == investmentId)
            .Select(s => new
            {
                s.Id,
                s.MemberId,
                MemberName = s.Member!.Name,
                s.SharesPurchased,
                s.SharePriceAtPurchase,
                s.AmountPaid,
                s.Status,
                s.PurchasedAt
            })
            .ToListAsync(cancellationToken);

        // Collapse any historical multi-row purchases into one entry per investor
        // (grouped by status so an active holding is never merged with a settled or
        // cancelled one).
        var rows = raw
            .GroupBy(s => new { s.MemberId, s.MemberName, s.Status })
            .Select(g =>
            {
                var sharesPurchased = g.Sum(x => x.SharesPurchased);
                return new ShareSubscriptionDto
                {
                    Id = g.OrderByDescending(x => x.PurchasedAt).First().Id,
                    InvestmentId = investmentId,
                    InvestmentName = investmentName,
                    MemberId = g.Key.MemberId,
                    MemberName = g.Key.MemberName,
                    SharesPurchased = sharesPurchased,
                    SharePriceAtPurchase = g.OrderBy(x => x.PurchasedAt).First().SharePriceAtPurchase,
                    AmountPaid = g.Sum(x => x.AmountPaid),
                    OwnershipPercentage = totalShares > 0
                        ? Math.Round((decimal)sharesPurchased / totalShares * 100m, 6)
                        : 0m,
                    Status = g.Key.Status.ToString(),
                    PurchasedAt = g.Max(x => x.PurchasedAt)
                };
            })
            .OrderByDescending(r => r.PurchasedAt)
            .ToList();

        return rows;
    }

    public async Task<IReadOnlyList<ShareSubscriptionDto>> GetMemberSubscriptionsAsync(
        Guid memberId,
        CancellationToken cancellationToken = default)
    {
        var raw = await _context.ShareSubscriptions
            .AsNoTracking()
            .Where(s => s.MemberId == memberId)
            .Select(s => new
            {
                s.Id,
                s.InvestmentId,
                InvestmentName = s.Investment!.Name,
                TotalShares = s.Investment!.TotalShares,
                s.MemberId,
                MemberName = s.Member!.Name,
                s.SharesPurchased,
                s.SharePriceAtPurchase,
                s.AmountPaid,
                s.Status,
                s.PurchasedAt
            })
            .ToListAsync(cancellationToken);

        // One consolidated entry per project (per status) for this member.
        return raw
            .GroupBy(s => new { s.InvestmentId, s.InvestmentName, s.TotalShares, s.MemberId, s.MemberName, s.Status })
            .Select(g =>
            {
                var sharesPurchased = g.Sum(x => x.SharesPurchased);
                return new ShareSubscriptionDto
                {
                    Id = g.OrderByDescending(x => x.PurchasedAt).First().Id,
                    InvestmentId = g.Key.InvestmentId,
                    InvestmentName = g.Key.InvestmentName,
                    MemberId = g.Key.MemberId,
                    MemberName = g.Key.MemberName,
                    SharesPurchased = sharesPurchased,
                    SharePriceAtPurchase = g.OrderBy(x => x.PurchasedAt).First().SharePriceAtPurchase,
                    AmountPaid = g.Sum(x => x.AmountPaid),
                    OwnershipPercentage = g.Key.TotalShares > 0
                        ? Math.Round((decimal)sharesPurchased / g.Key.TotalShares.Value * 100m, 6)
                        : 0m,
                    Status = g.Key.Status.ToString(),
                    PurchasedAt = g.Max(x => x.PurchasedAt)
                };
            })
            .OrderByDescending(r => r.PurchasedAt)
            .ToList();
    }

    /// <summary>
    /// Applies the per-investment, per-member share limits (spec section 4). Checks the
    /// member's resulting CUMULATIVE holding - already owned plus this purchase - so the
    /// cap cannot be side-stepped by buying in small batches.
    /// </summary>
    private async Task EnforceInvestorLimitsAsync(
        Investment investment,
        Guid memberId,
        int newShares,
        int totalShares,
        CancellationToken cancellationToken)
    {
        var alreadyHeld = await _context.ShareSubscriptions
            .Where(s => s.InvestmentId == investment.Id
                     && s.MemberId == memberId
                     && s.Status == ShareSubscriptionStatus.Active)
            .SumAsync(s => (int?)s.SharesPurchased, cancellationToken) ?? 0;

        var resulting = alreadyHeld + newShares;

        var minShares = investment.MinimumSharesPerMember;
        if (minShares.HasValue && resulting < minShares.Value)
        {
            throw new ValidationException(
                $"This would leave you with {resulting} share(s), below the {minShares.Value}-share minimum per member for this project.");
        }

        var maxShares = investment.MaximumSharesPerMember;
        if (maxShares.HasValue && resulting > maxShares.Value)
        {
            throw new ValidationException(
                $"This purchase would take your holding to {resulting} shares, above the {maxShares.Value}-share maximum per member for this project.");
        }

        // Ownership ceiling is a measure against undesirable concentration; when the
        // project has not configured a per-member cap, fall back to the global default.
        if (!maxShares.HasValue)
        {
            var globalMax = await _settings.GetMaxSharesPerInvestorAsync(cancellationToken);
            if (globalMax.HasValue && resulting > globalMax.Value)
            {
                throw new ValidationException(
                    $"This purchase would take your holding to {resulting} shares, above the {globalMax.Value}-share limit per investor.");
            }
        }

        var maxOwnership = await _settings.GetMaxOwnershipPercentageAsync(cancellationToken);
        if (maxOwnership.HasValue && totalShares > 0)
        {
            var resultingPct = (decimal)resulting / totalShares * 100m;
            if (resultingPct > maxOwnership.Value)
            {
                throw new ValidationException(
                    $"This purchase would take your ownership to {resultingPct:N2}%, above the {maxOwnership.Value:N2}% limit per investor.");
            }
        }
    }

    /// <summary>
    /// Keeps MemberInvestment as the current-holding rollup that the dashboard,
    /// profile and member services already read.
    /// </summary>
    private async Task UpsertHoldingAsync(
        Investment investment,
        Guid memberId,
        int shares,
        decimal amount,
        int totalShares,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var holding = await _context.MemberInvestments
            .FirstOrDefaultAsync(mi => mi.InvestmentId == investment.Id && mi.MemberId == memberId, cancellationToken);

        if (holding == null)
        {
            holding = new MemberInvestment
            {
                Id = Guid.NewGuid(),
                InvestmentId = investment.Id,
                MemberId = memberId,
                CreatedAt = now
            };
            _context.MemberInvestments.Add(holding);
        }

        holding.SharesOwned += shares;
        holding.AmountInvested += amount;
        holding.SharePercentage = Math.Round((decimal)holding.SharesOwned / totalShares * 100m, 6);
        holding.ShareValue = holding.SharesOwned * (investment.SharePrice ?? 0m);
        holding.UpdatedAt = now;
    }
}
