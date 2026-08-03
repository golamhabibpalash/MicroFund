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
        string? createdBy,
        CancellationToken cancellationToken = default)
    {
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

        await EnforceInvestorLimitsAsync(investmentId, memberId, shares, soldShares: 0, totalShares, cancellationToken);

        var now = DateTime.UtcNow;

        var subscription = new ShareSubscription
        {
            Id = Guid.NewGuid(),
            InvestmentId = investmentId,
            MemberId = memberId,
            SharesPurchased = shares,
            SharePriceAtPurchase = sharePrice,
            AmountPaid = amount,
            Status = ShareSubscriptionStatus.Active,
            PurchasedAt = now,
            CreatedBy = createdBy
        };
        _context.ShareSubscriptions.Add(subscription);

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
            SharesPurchased = shares,
            SharePriceAtPurchase = sharePrice,
            AmountPaid = amount,
            OwnershipPercentage = Math.Round((decimal)shares / totalShares * 100m, 6),
            Status = subscription.Status.ToString(),
            PurchasedAt = subscription.PurchasedAt
        };
    }

    public async Task<IReadOnlyList<ShareSubscriptionDto>> GetSubscriptionsAsync(
        Guid investmentId,
        CancellationToken cancellationToken = default)
    {
        var totalShares = await _context.Investments
            .Where(i => i.Id == investmentId)
            .Select(i => i.TotalShares)
            .FirstOrDefaultAsync(cancellationToken) ?? 0;

        var rows = await _context.ShareSubscriptions
            .AsNoTracking()
            .Where(s => s.InvestmentId == investmentId)
            .OrderByDescending(s => s.PurchasedAt)
            .Select(s => new ShareSubscriptionDto
            {
                Id = s.Id,
                InvestmentId = s.InvestmentId,
                InvestmentName = s.Investment!.Name,
                MemberId = s.MemberId,
                MemberName = s.Member!.Name,
                SharesPurchased = s.SharesPurchased,
                SharePriceAtPurchase = s.SharePriceAtPurchase,
                AmountPaid = s.AmountPaid,
                Status = s.Status.ToString(),
                PurchasedAt = s.PurchasedAt
            })
            .ToListAsync(cancellationToken);

        if (totalShares > 0)
        {
            foreach (var r in rows)
            {
                r.OwnershipPercentage = Math.Round((decimal)r.SharesPurchased / totalShares * 100m, 6);
            }
        }

        return rows;
    }

    public async Task<IReadOnlyList<ShareSubscriptionDto>> GetMemberSubscriptionsAsync(
        Guid memberId,
        CancellationToken cancellationToken = default)
    {
        return await _context.ShareSubscriptions
            .AsNoTracking()
            .Where(s => s.MemberId == memberId)
            .OrderByDescending(s => s.PurchasedAt)
            .Select(s => new ShareSubscriptionDto
            {
                Id = s.Id,
                InvestmentId = s.InvestmentId,
                InvestmentName = s.Investment!.Name,
                MemberId = s.MemberId,
                MemberName = s.Member!.Name,
                SharesPurchased = s.SharesPurchased,
                SharePriceAtPurchase = s.SharePriceAtPurchase,
                AmountPaid = s.AmountPaid,
                OwnershipPercentage = s.Investment!.TotalShares > 0
                    ? (decimal)s.SharesPurchased / s.Investment.TotalShares.Value * 100m
                    : 0m,
                Status = s.Status.ToString(),
                PurchasedAt = s.PurchasedAt
            })
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Applies the configurable per-investor caps from section 5. Checks the member's
    /// resulting total holding, not just this one purchase, so the limit cannot be
    /// side-stepped by buying in small batches.
    /// </summary>
    private async Task EnforceInvestorLimitsAsync(
        Guid investmentId,
        Guid memberId,
        int newShares,
        int soldShares,
        int totalShares,
        CancellationToken cancellationToken)
    {
        var alreadyHeld = await _context.ShareSubscriptions
            .Where(s => s.InvestmentId == investmentId
                     && s.MemberId == memberId
                     && s.Status == ShareSubscriptionStatus.Active)
            .SumAsync(s => (int?)s.SharesPurchased, cancellationToken) ?? 0;

        var resulting = alreadyHeld + newShares;

        var maxShares = await _settings.GetMaxSharesPerInvestorAsync(cancellationToken);
        if (maxShares.HasValue && resulting > maxShares.Value)
        {
            throw new ValidationException(
                $"This purchase would take your holding to {resulting} shares, above the {maxShares.Value}-share limit per investor.");
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
