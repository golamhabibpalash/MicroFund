using System.Data;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.Services;
using UnityMicroFund.API.Areas.MonthlyProfits.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.MonthlyProfits.Services;

/// <summary>
/// Periodic profit distribution for a single project, in two flavours
/// (see <see cref="ProfitDistributionType"/>):
///
///   Monthly      - for a project whose ProfitPayoutMode is Monthly. Each holding earns
///                  amountPaid × rate% × daysHeld / daysInMonth. The rate defaults to the
///                  project's monthly rate and can be adjusted for one month; daysHeld is
///                  pro-rated for shares bought mid-month or a project starting/maturing
///                  inside the month. A project is paid at most once per calendar month.
///
///   ProjectBased - for a project whose ProfitPayoutMode is ProjectBased (no fixed
///                  timeline). The admin enters a realised profit amount; the project's
///                  maintenance % is taken first (posted to its maintenance account on
///                  finalize), and the rest is split by shares exactly like the final
///                  settlement: floor(pool × shares / totalShares). Unsold shares' portion
///                  and rounding stay with the organisation.
///
/// Every batch goes Draft (recalculable) -> Distributed (locked) -> Paid (wallets credited).
/// </summary>
public class MonthlyProfitDistributionService : IMonthlyProfitDistributionService
{
    private readonly AppDbContext _context;
    private readonly IWalletService _wallet;

    public MonthlyProfitDistributionService(AppDbContext context, IWalletService wallet)
    {
        _context = context;
        _wallet = wallet;
    }

    public async Task<MonthlyProfitPreviewDto> PreviewAsync(
        CalculateMonthlyProfitDto dto,
        CancellationToken cancellationToken = default)
    {
        var investmentId = dto.InvestmentId
            ?? throw new ValidationException("Select the project the profit belongs to.");

        return ParseType(dto.Type) == ProfitDistributionType.Monthly
            ? await BuildMonthlyPreviewAsync(
                investmentId, RequireYear(dto.Year), RequireMonth(dto.Month), dto.Rate, null, cancellationToken)
            : await BuildProjectPreviewAsync(
                investmentId, RequireAmount(dto.ProfitAmount), ResolveProfitDate(dto.ProfitDate), null, cancellationToken);
    }

    public async Task<IReadOnlyList<ProfitEligibleProjectDto>> GetEligibleProjectsAsync(
        CancellationToken cancellationToken = default)
    {
        var investments = await _context.Investments
            .AsNoTracking()
            .Include(i => i.Subscriptions)
            .Where(i => i.ProfitPayoutMode != ProfitPayoutMode.OnCompletion)
            .OrderBy(i => i.Name)
            .ToListAsync(cancellationToken);

        var ids = investments.Select(i => i.Id).ToList();
        var history = await _context.MonthlyProfitDistributionLines
            .AsNoTracking()
            .Where(l => ids.Contains(l.InvestmentId))
            .Select(l => new
            {
                l.InvestmentId,
                l.ProfitAmount,
                l.Distribution!.Type,
                l.Distribution.Status,
                l.Distribution.Year,
                l.Distribution.Month,
                l.Distribution.ProfitDate,
                l.Distribution.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var today = DateTime.UtcNow;

        return investments.Select(i =>
        {
            var active = i.Subscriptions.Where(s => s.Status == ShareSubscriptionStatus.Active).ToList();
            var mine = history.Where(h => h.InvestmentId == i.Id).ToList();
            var latest = mine
                .OrderByDescending(h => h.Year).ThenByDescending(h => h.Month)
                .ThenByDescending(h => h.ProfitDate).ThenByDescending(h => h.CreatedAt)
                .FirstOrDefault();

            int? nextYear = null, nextMonth = null;
            if (i.ProfitPayoutMode == ProfitPayoutMode.Monthly)
            {
                var latestMonthly = mine
                    .Where(h => h.Type == ProfitDistributionType.Monthly)
                    .OrderByDescending(h => h.Year).ThenByDescending(h => h.Month)
                    .FirstOrDefault();
                // First month anyone actually held shares: the later of the project start
                // and the first purchase, so the suggestion never lands on an empty month.
                var firstHeld = active.Count > 0
                    ? Max(i.DateInvested, active.Min(s => s.PurchasedAt))
                    : i.DateInvested;
                var next = latestMonthly != null
                    ? new DateTime(latestMonthly.Year, latestMonthly.Month, 1).AddMonths(1)
                    : new DateTime(firstHeld.Year, firstHeld.Month, 1);
                var currentMonth = new DateTime(today.Year, today.Month, 1);
                if (next > currentMonth) next = currentMonth;
                nextYear = next.Year;
                nextMonth = next.Month;
            }

            return new ProfitEligibleProjectDto
            {
                Id = i.Id,
                Name = i.Name,
                Status = i.Status.ToString(),
                ProfitPayoutMode = i.ProfitPayoutMode.ToString(),
                MonthlyProfitRate = i.MonthlyProfitRate,
                TotalShares = i.TotalShares,
                SoldShares = active.Sum(s => s.SharesPurchased),
                TotalInvested = active.Sum(s => s.AmountPaid),
                MaintenancePercentage = i.MaintenancePercentage,
                MaintenanceAccountConfigured = i.MaintenanceAccountId.HasValue,
                DateInvested = i.DateInvested,
                MaturityDate = i.MaturityDate,
                CanDistribute = i.Status == InvestmentStatus.Active,
                NextYear = nextYear,
                NextMonth = nextMonth,
                LastDistributionLabel = latest == null
                    ? null
                    : latest.Type == ProfitDistributionType.Monthly
                        ? $"{MonthName(latest.Month)} {latest.Year}"
                        : latest.ProfitDate?.ToString("dd MMM yyyy", CultureInfo.InvariantCulture),
                TotalDistributed = mine
                    .Where(h => h.Status != MonthlyProfitDistributionStatus.Draft)
                    .Sum(h => h.ProfitAmount)
            };
        }).ToList();
    }

    public async Task<IReadOnlyList<MonthlyProfitDistributionSummaryDto>> GetAllAsync(
        int? year = null,
        string? status = null,
        string? type = null,
        CancellationToken cancellationToken = default)
    {
        MonthlyProfitDistributionStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<MonthlyProfitDistributionStatus>(status, true, out var parsed)
                || !Enum.IsDefined(parsed))
            {
                throw new ValidationException($"'{status}' is not a valid distribution status.");
            }

            statusFilter = parsed;
        }

        ProfitDistributionType? typeFilter = string.IsNullOrWhiteSpace(type) ? null : ParseType(type);

        var query = _context.MonthlyProfitDistributions
            .AsNoTracking()
            .Include(d => d.Lines)
            .Include(d => d.Investment)
            .AsQueryable();

        if (year.HasValue) query = query.Where(d => d.Year == year.Value);
        if (statusFilter.HasValue) query = query.Where(d => d.Status == statusFilter.Value);
        if (typeFilter.HasValue) query = query.Where(d => d.Type == typeFilter.Value);

        var distributions = await query
            .OrderByDescending(d => d.Year)
            .ThenByDescending(d => d.Month)
            .ThenByDescending(d => d.ProfitDate)
            .ThenByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);

        return distributions.Select(d => (MonthlyProfitDistributionSummaryDto)MapSummary(d)).ToList();
    }

    public async Task<MonthlyProfitDistributionDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var distribution = await _context.MonthlyProfitDistributions
            .AsNoTracking()
            .Include(d => d.Investment)
            .Include(d => d.Lines)
                .ThenInclude(l => l.WalletEntry)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        return distribution == null ? null : MapDetail(distribution);
    }

    public async Task<MonthlyProfitDistributionDto> CreateAsync(
        CreateMonthlyProfitDistributionDto dto,
        string? actionedBy,
        CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var preview = await PreviewAsync(dto, cancellationToken);
        if (preview.Lines.Count == 0)
        {
            throw new ValidationException(preview.Type == nameof(ProfitDistributionType.Monthly)
                ? "No shareholder held this project during the selected month."
                : "This project has no shareholders to distribute to.");
        }

        var now = DateTime.UtcNow;
        var distribution = new MonthlyProfitDistribution
        {
            Id = Guid.NewGuid(),
            Status = MonthlyProfitDistributionStatus.Draft,
            Notes = NullIfBlank(dto.Notes),
            CalculatedBy = actionedBy,
            CalculatedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        ApplyPreview(distribution, preview);
        distribution.Lines = preview.Lines.Select(l => ToLineEntity(l, distribution.Id, now)).ToList();

        _context.MonthlyProfitDistributions.Add(distribution);
        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return (await GetByIdAsync(distribution.Id, cancellationToken))!;
    }

    public async Task<MonthlyProfitDistributionDto?> UpdateAsync(
        Guid id,
        UpdateMonthlyProfitDistributionDto dto,
        string? actionedBy,
        CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var distribution = await _context.MonthlyProfitDistributions
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (distribution == null) return null;

        if (distribution.Status != MonthlyProfitDistributionStatus.Draft)
        {
            throw new ValidationException("Only a draft distribution can be recalculated.");
        }

        if (!distribution.InvestmentId.HasValue)
        {
            throw new ValidationException(
                "This draft covers several projects and was created before per-project batches. Delete it and create one batch per project.");
        }

        var preview = distribution.Type == ProfitDistributionType.Monthly
            ? await BuildMonthlyPreviewAsync(
                distribution.InvestmentId.Value,
                distribution.Year,
                distribution.Month,
                dto.Rate ?? distribution.Rate,
                distribution.Id,
                cancellationToken)
            : await BuildProjectPreviewAsync(
                distribution.InvestmentId.Value,
                dto.ProfitAmount ?? distribution.GrossProfitAmount ?? 0m,
                dto.ProfitDate.HasValue ? ResolveProfitDate(dto.ProfitDate) : distribution.ProfitDate!.Value,
                distribution.Id,
                cancellationToken);

        if (preview.Lines.Count == 0)
        {
            throw new ValidationException("The recalculation produced no profit lines.");
        }

        // Set-based delete so the new lines cannot collide with the old ones on the
        // (distribution, member, project) unique index.
        await _context.MonthlyProfitDistributionLines
            .Where(l => l.MonthlyProfitDistributionId == distribution.Id)
            .ExecuteDeleteAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var line in preview.Lines)
        {
            _context.MonthlyProfitDistributionLines.Add(ToLineEntity(line, distribution.Id, now));
        }

        ApplyPreview(distribution, preview);
        distribution.Notes = NullIfBlank(dto.Notes);
        distribution.TotalPaidAmount = 0m;
        distribution.CalculatedBy = actionedBy;
        distribution.CalculatedAt = now;
        distribution.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return await GetByIdAsync(distribution.Id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var distribution = await _context.MonthlyProfitDistributions
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (distribution == null) return false;

        if (distribution.Status != MonthlyProfitDistributionStatus.Draft)
        {
            throw new ValidationException("Only a draft distribution can be deleted.");
        }

        _context.MonthlyProfitDistributions.Remove(distribution);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<MonthlyProfitDistributionDto> DistributeAsync(
        Guid id,
        string? actionedBy,
        CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var distribution = await _context.MonthlyProfitDistributions
            .Include(d => d.Lines)
            .Include(d => d.Investment)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new NotFoundException("Monthly profit distribution not found.");

        if (distribution.Status != MonthlyProfitDistributionStatus.Draft)
        {
            throw new ValidationException("This distribution has already been finalized.");
        }

        if (distribution.Lines.Count == 0)
        {
            throw new ValidationException("There are no profit lines to distribute.");
        }

        if (distribution.Type == ProfitDistributionType.Monthly)
        {
            // Another batch may have been finalized for the same project and month since
            // this draft was calculated - never let a project be paid twice for one month.
            var investmentIds = distribution.Lines.Select(l => l.InvestmentId).Distinct().ToList();
            var clash = await _context.MonthlyProfitDistributionLines
                .AsNoTracking()
                .Where(l => investmentIds.Contains(l.InvestmentId)
                         && l.MonthlyProfitDistributionId != distribution.Id
                         && l.Distribution!.Type == ProfitDistributionType.Monthly
                         && l.Distribution.Status != MonthlyProfitDistributionStatus.Draft
                         && l.Distribution.Year == distribution.Year
                         && l.Distribution.Month == distribution.Month)
                .Select(l => l.InvestmentName)
                .FirstOrDefaultAsync(cancellationToken);

            if (clash != null)
            {
                throw new ConflictException(
                    $"\"{clash}\" has already been paid for {MonthName(distribution.Month)} {distribution.Year}.");
            }
        }

        var now = DateTime.UtcNow;

        // Project-based: post the organisation's maintenance share to the project's
        // maintenance account, exactly as the final settlement does, inside this transaction.
        if (distribution.Type == ProfitDistributionType.ProjectBased
            && distribution.MaintenanceAmount is > 0m
            && distribution.Investment?.MaintenanceAccountId is Guid accountId)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken)
                ?? throw new ValidationException("The project's maintenance account no longer exists.");

            account.Balance += distribution.MaintenanceAmount.Value;

            _context.InvestmentMaintenanceDistributions.Add(new InvestmentMaintenanceDistribution
            {
                Id = Guid.NewGuid(),
                InvestmentId = distribution.Investment.Id,
                AccountId = account.Id,
                Amount = distribution.MaintenanceAmount.Value,
                Percentage = distribution.MaintenancePercentage ?? 0m,
                DisbursedBy = actionedBy,
                DisbursedAt = now,
                Remarks = $"Maintenance ({distribution.MaintenancePercentage}%) on project profit of " +
                          $"{distribution.ProfitDate:dd MMM yyyy} for {distribution.Investment.Name}"
            });
        }

        distribution.Status = MonthlyProfitDistributionStatus.Distributed;
        distribution.DistributedBy = actionedBy;
        distribution.DistributedAt = now;
        distribution.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return (await GetByIdAsync(distribution.Id, cancellationToken))!;
    }

    public async Task<MonthlyProfitDistributionDto> PayAsync(
        Guid id,
        Guid? lineId,
        string? actionedBy,
        CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var distribution = await _context.MonthlyProfitDistributions
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new NotFoundException("Monthly profit distribution not found.");

        if (distribution.Status == MonthlyProfitDistributionStatus.Draft)
        {
            throw new ValidationException("Finalize the distribution before paying members.");
        }

        if (lineId.HasValue && distribution.Lines.All(l => l.Id != lineId.Value))
        {
            throw new NotFoundException("Monthly profit line not found.");
        }

        var pending = distribution.Lines
            .Where(l => l.Status == MonthlyProfitPaymentStatus.Pending
                     && (!lineId.HasValue || l.Id == lineId.Value))
            .ToList();

        if (pending.Count == 0)
        {
            throw new ValidationException("There is nothing left to pay for this distribution.");
        }

        var now = DateTime.UtcNow;
        foreach (var line in pending)
        {
            var description = distribution.Type == ProfitDistributionType.Monthly
                ? $"Monthly profit - {MonthName(distribution.Month)} {distribution.Year} - {line.InvestmentName}"
                : $"Project profit - {line.InvestmentName} - {distribution.ProfitDate:dd MMM yyyy}";

            var entry = _wallet.AddEntry(
                line.MemberId,
                WalletEntryType.ProfitCredit,
                line.ProfitAmount,
                description,
                actionedBy,
                investmentId: line.InvestmentId);

            line.WalletEntryId = entry.Id;
            line.Status = MonthlyProfitPaymentStatus.Paid;
            line.PaidAt = now;
            line.PaidBy = actionedBy;
        }

        distribution.TotalPaidAmount = distribution.Lines
            .Where(l => l.Status == MonthlyProfitPaymentStatus.Paid)
            .Sum(l => l.ProfitAmount);

        distribution.Status = distribution.Lines.All(l => l.Status == MonthlyProfitPaymentStatus.Paid)
            ? MonthlyProfitDistributionStatus.Paid
            : MonthlyProfitDistributionStatus.Distributed;
        distribution.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return (await GetByIdAsync(distribution.Id, cancellationToken))!;
    }

    // ---------------------------------------------------------------- monthly

    private async Task<MonthlyProfitPreviewDto> BuildMonthlyPreviewAsync(
        Guid investmentId,
        int year,
        int month,
        decimal? rateOverride,
        Guid? excludeDistributionId,
        CancellationToken cancellationToken)
    {
        ValidatePeriod(year, month);

        var today = DateTime.UtcNow;
        if (year > today.Year || (year == today.Year && month > today.Month))
        {
            throw new ValidationException("Monthly profit cannot be calculated for a future month.");
        }

        var investment = await _context.Investments
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.ProfitPayoutMode != ProfitPayoutMode.Monthly)
        {
            throw new ValidationException(
                $"\"{investment.Name}\" is not set up for monthly profit. Change its profit payout in the investment form first.");
        }

        if (investment.Status != InvestmentStatus.Active)
        {
            throw new ValidationException(
                $"Monthly profit can only be calculated while the project is Active (current status: {investment.Status}).");
        }

        var rate = rateOverride ?? investment.MonthlyProfitRate;
        if (rate is null or <= 0m || rate > 100m)
        {
            throw new ValidationException("Enter a monthly rate greater than 0 and at most 100%.");
        }

        var existing = await _context.MonthlyProfitDistributions
            .AsNoTracking()
            .Where(d => d.Type == ProfitDistributionType.Monthly
                     && d.Year == year
                     && d.Month == month
                     && (!excludeDistributionId.HasValue || d.Id != excludeDistributionId.Value)
                     && (d.InvestmentId == investmentId || d.Lines.Any(l => l.InvestmentId == investmentId)))
            .Select(d => new { d.Status })
            .FirstOrDefaultAsync(cancellationToken);

        if (existing != null)
        {
            throw new ConflictException(existing.Status == MonthlyProfitDistributionStatus.Draft
                ? $"A draft for {MonthName(month)} {year} already exists for this project. Open it from the history to review or recalculate."
                : $"{MonthName(month)} {year} has already been distributed for this project.");
        }

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var periodStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodEnd = new DateTime(year, month, daysInMonth, 23, 59, 59, DateTimeKind.Utc);

        // The project only earns while it is running: from its start date to its maturity.
        var runFrom = Max(periodStart, investment.DateInvested.Date);
        var runTo = investment.MaturityDate.HasValue
            ? Min(periodEnd.Date, investment.MaturityDate.Value.Date)
            : periodEnd.Date;

        if (runFrom.Date > runTo)
        {
            throw new ValidationException(investment.DateInvested.Date > periodEnd
                ? $"The project starts on {investment.DateInvested:dd MMM yyyy}, after {MonthName(month)} {year}."
                : $"The project matured on {investment.MaturityDate:dd MMM yyyy}, before {MonthName(month)} {year}.");
        }

        var subscriptions = await _context.ShareSubscriptions
            .AsNoTracking()
            .Include(s => s.Member)
            .Where(s => s.InvestmentId == investmentId
                     && s.Status == ShareSubscriptionStatus.Active
                     && s.PurchasedAt <= periodEnd)
            .ToListAsync(cancellationToken);

        var lines = subscriptions
            .Select(s => new { Sub = s, Days = Math.Max(0, (runTo - Max(runFrom, s.PurchasedAt.Date).Date).Days + 1) })
            .Where(x => x.Days > 0)
            .GroupBy(x => x.Sub.MemberId)
            .Select(g =>
            {
                var amount = g.Sum(x => x.Sub.AmountPaid);
                var rawProfit = g.Sum(x => x.Sub.AmountPaid * rate.Value / 100m * x.Days / daysInMonth);
                var weightedDays = amount > 0m
                    ? g.Sum(x => x.Sub.AmountPaid * x.Days) / amount
                    : g.Max(x => x.Days);

                return new MonthlyProfitLineDto
                {
                    Id = Guid.NewGuid(),
                    MemberId = g.Key,
                    MemberName = g.First().Sub.Member?.Name ?? "Unknown",
                    InvestmentId = investment.Id,
                    InvestmentName = investment.Name,
                    InvestmentAmount = amount,
                    SharesOwned = g.Sum(x => x.Sub.SharesPurchased),
                    Rate = rate.Value,
                    HeldDays = Math.Round(weightedDays, 2, MidpointRounding.AwayFromZero),
                    DaysInPeriod = daysInMonth,
                    ProfitAmount = Round2(rawProfit),
                    Status = MonthlyProfitPaymentStatus.Pending.ToString()
                };
            })
            .Where(l => l.ProfitAmount > 0m)
            .OrderBy(l => l.MemberName)
            .ToList();

        var warnings = new List<string>();
        if (lines.Any(l => l.HeldDays < l.DaysInPeriod))
        {
            warnings.Add("Holdings that were not held for the whole month are pro-rated by days held.");
        }

        return new MonthlyProfitPreviewDto
        {
            Type = nameof(ProfitDistributionType.Monthly),
            Year = year,
            Month = month,
            Rate = rate,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            DaysInPeriod = daysInMonth,
            InvestmentId = investment.Id,
            InvestmentName = investment.Name,
            TotalInvestmentAmount = lines.Sum(l => l.InvestmentAmount),
            TotalProfitAmount = lines.Sum(l => l.ProfitAmount),
            EligibleMemberCount = lines.Count,
            LineCount = lines.Count,
            Lines = lines,
            Warnings = warnings
        };
    }

    // ---------------------------------------------------------------- project-based

    private async Task<MonthlyProfitPreviewDto> BuildProjectPreviewAsync(
        Guid investmentId,
        decimal grossProfit,
        DateTime profitDate,
        Guid? excludeDistributionId,
        CancellationToken cancellationToken)
    {
        if (grossProfit <= 0m)
        {
            throw new ValidationException("Profit amount must be greater than zero.");
        }

        var investment = await _context.Investments
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.ProfitPayoutMode != ProfitPayoutMode.ProjectBased)
        {
            throw new ValidationException(
                $"\"{investment.Name}\" is not set up for project-based profit. Change its profit payout in the investment form first.");
        }

        if (investment.Status != InvestmentStatus.Active)
        {
            throw new ValidationException(
                $"Profit can only be distributed while the project is Active (current status: {investment.Status}).");
        }

        var dayEnd = profitDate.Date.AddDays(1).AddTicks(-1);
        var subscriptions = await _context.ShareSubscriptions
            .AsNoTracking()
            .Include(s => s.Member)
            .Where(s => s.InvestmentId == investmentId
                     && s.Status == ShareSubscriptionStatus.Active
                     && s.PurchasedAt <= dayEnd)
            .ToListAsync(cancellationToken);

        var holdings = subscriptions
            .GroupBy(s => s.MemberId)
            .Select(g => new
            {
                MemberId = g.Key,
                MemberName = g.First().Member?.Name ?? "Unknown",
                Shares = g.Sum(s => s.SharesPurchased),
                Amount = g.Sum(s => s.AmountPaid)
            })
            .Where(h => h.Shares > 0)
            .ToList();

        var soldShares = holdings.Sum(h => h.Shares);
        // Same basis as the final settlement: unsold shares belong to the organisation,
        // so their portion of the pool is not allocated to anyone.
        var totalShares = Math.Max(investment.TotalShares ?? soldShares, soldShares);

        var maintenancePercentage = investment.MaintenancePercentage;
        var maintenance = Round2(grossProfit * maintenancePercentage / 100m);
        var pool = grossProfit - maintenance;

        var lines = totalShares == 0
            ? new List<MonthlyProfitLineDto>()
            : holdings.Select(h => new MonthlyProfitLineDto
                {
                    Id = Guid.NewGuid(),
                    MemberId = h.MemberId,
                    MemberName = h.MemberName,
                    InvestmentId = investment.Id,
                    InvestmentName = investment.Name,
                    InvestmentAmount = h.Amount,
                    SharesOwned = h.Shares,
                    OwnershipPercentage = Math.Round((decimal)h.Shares / totalShares * 100m, 4),
                    Rate = 0m,
                    ProfitAmount = Floor2(pool * h.Shares / totalShares),
                    Status = MonthlyProfitPaymentStatus.Pending.ToString()
                })
                .Where(l => l.ProfitAmount > 0m)
                .OrderBy(l => l.MemberName)
                .ToList();

        var allocated = lines.Sum(l => l.ProfitAmount);

        var warnings = new List<string>();
        if (maintenance > 0m && !investment.MaintenanceAccountId.HasValue)
        {
            warnings.Add("This project has no maintenance account, so the maintenance share will be kept but not posted to any account.");
        }
        if (soldShares < totalShares)
        {
            warnings.Add($"{totalShares - soldShares} of {totalShares} shares are unsold; their portion stays with the organisation.");
        }

        var duplicate = await _context.MonthlyProfitDistributions
            .AsNoTracking()
            .AnyAsync(d => d.Type == ProfitDistributionType.ProjectBased
                        && d.InvestmentId == investmentId
                        && d.ProfitDate == profitDate.Date
                        && (!excludeDistributionId.HasValue || d.Id != excludeDistributionId.Value),
                cancellationToken);
        if (duplicate)
        {
            warnings.Add($"Another profit entry for this project is already dated {profitDate:dd MMM yyyy}. Make sure this is not a duplicate.");
        }

        return new MonthlyProfitPreviewDto
        {
            Type = nameof(ProfitDistributionType.ProjectBased),
            Year = profitDate.Year,
            Month = profitDate.Month,
            PeriodStart = profitDate.Date,
            PeriodEnd = dayEnd,
            InvestmentId = investment.Id,
            InvestmentName = investment.Name,
            ProfitDate = profitDate.Date,
            GrossProfitAmount = grossProfit,
            MaintenancePercentage = maintenancePercentage,
            MaintenanceAmount = maintenance,
            InvestorProfitPool = pool,
            UndistributedRemainder = pool - allocated,
            TotalShares = totalShares,
            SoldShares = soldShares,
            MaintenanceAccountConfigured = investment.MaintenanceAccountId.HasValue,
            TotalInvestmentAmount = lines.Sum(l => l.InvestmentAmount),
            TotalProfitAmount = allocated,
            EligibleMemberCount = lines.Count,
            LineCount = lines.Count,
            Lines = lines,
            Warnings = warnings
        };
    }

    // ---------------------------------------------------------------- mapping

    private static void ApplyPreview(MonthlyProfitDistribution distribution, MonthlyProfitPreviewDto preview)
    {
        distribution.Type = ParseType(preview.Type);
        distribution.Year = preview.Year;
        distribution.Month = preview.Month;
        distribution.Rate = preview.Rate;
        distribution.InvestmentId = preview.InvestmentId;
        distribution.ProfitDate = preview.ProfitDate;
        distribution.GrossProfitAmount = preview.GrossProfitAmount;
        distribution.MaintenancePercentage = preview.MaintenancePercentage;
        distribution.MaintenanceAmount = preview.MaintenanceAmount;
        distribution.UndistributedRemainder = preview.UndistributedRemainder;
        distribution.TotalInvestmentAmount = preview.TotalInvestmentAmount;
        distribution.TotalProfitAmount = preview.TotalProfitAmount;
    }

    private static MonthlyProfitDistributionLine ToLineEntity(MonthlyProfitLineDto l, Guid distributionId, DateTime now) => new()
    {
        Id = Guid.NewGuid(),
        MonthlyProfitDistributionId = distributionId,
        MemberId = l.MemberId,
        MemberName = l.MemberName,
        InvestmentId = l.InvestmentId,
        InvestmentName = l.InvestmentName,
        InvestmentAmount = l.InvestmentAmount,
        SharesOwned = l.SharesOwned,
        Rate = l.Rate,
        HeldDays = l.HeldDays,
        DaysInPeriod = l.DaysInPeriod,
        ProfitAmount = l.ProfitAmount,
        Status = MonthlyProfitPaymentStatus.Pending,
        CreatedAt = now
    };

    private static MonthlyProfitDistributionDto MapSummary(MonthlyProfitDistribution d)
    {
        var paidLines = d.Lines.Count(l => l.Status == MonthlyProfitPaymentStatus.Paid);
        var projectNames = d.Lines.Select(l => l.InvestmentName).Distinct().OrderBy(n => n).ToList();

        return new MonthlyProfitDistributionDto
        {
            Id = d.Id,
            Type = d.Type.ToString(),
            Year = d.Year,
            Month = d.Month,
            Rate = d.Rate,
            InvestmentId = d.InvestmentId,
            InvestmentName = d.Investment?.Name ?? projectNames.FirstOrDefault() ?? string.Empty,
            ProfitDate = d.ProfitDate,
            GrossProfitAmount = d.GrossProfitAmount,
            MaintenancePercentage = d.MaintenancePercentage,
            MaintenanceAmount = d.MaintenanceAmount,
            UndistributedRemainder = d.UndistributedRemainder,
            ProjectNames = projectNames,
            ProjectCount = projectNames.Count,
            Notes = d.Notes,
            Status = d.Status.ToString(),
            PaymentStatus = PaymentStatus(d),
            TotalInvestmentAmount = d.TotalInvestmentAmount,
            TotalProfitAmount = d.TotalProfitAmount,
            TotalPaidAmount = d.TotalPaidAmount,
            PendingAmount = d.TotalProfitAmount - d.TotalPaidAmount,
            EligibleMemberCount = d.Lines.Select(l => l.MemberId).Distinct().Count(),
            LineCount = d.Lines.Count,
            PaidLineCount = paidLines,
            PendingLineCount = d.Lines.Count - paidLines,
            CalculatedBy = d.CalculatedBy,
            CalculatedAt = d.CalculatedAt,
            DistributedBy = d.DistributedBy,
            DistributedAt = d.DistributedAt,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };
    }

    private static MonthlyProfitDistributionDto MapDetail(MonthlyProfitDistribution d)
    {
        var detail = MapSummary(d);

        detail.Lines = d.Lines
            .OrderBy(l => l.MemberName)
            .ThenBy(l => l.InvestmentName)
            .Select(l => new MonthlyProfitLineDto
            {
                Id = l.Id,
                MemberId = l.MemberId,
                MemberName = l.MemberName,
                InvestmentId = l.InvestmentId,
                InvestmentName = l.InvestmentName,
                InvestmentAmount = l.InvestmentAmount,
                SharesOwned = l.SharesOwned,
                Rate = l.Rate,
                HeldDays = l.HeldDays,
                DaysInPeriod = l.DaysInPeriod,
                ProfitAmount = l.ProfitAmount,
                Status = l.Status.ToString(),
                WalletEntryId = l.WalletEntryId,
                PaidAt = l.PaidAt,
                PaidBy = l.PaidBy
            })
            .ToList();

        detail.Transactions = d.Lines
            .Where(l => l.WalletEntry != null)
            .OrderByDescending(l => l.PaidAt)
            .Select(l => new MonthlyProfitTransactionDto
            {
                LineId = l.Id,
                WalletEntryId = l.WalletEntry!.Id,
                MemberId = l.MemberId,
                MemberName = l.MemberName,
                InvestmentName = l.InvestmentName,
                Amount = l.WalletEntry.Amount,
                Description = l.WalletEntry.Description,
                PaidAt = l.PaidAt ?? l.WalletEntry.CreatedAt,
                PaidBy = l.PaidBy
            })
            .ToList();

        return detail;
    }

    private static string PaymentStatus(MonthlyProfitDistribution distribution)
    {
        if (distribution.Status == MonthlyProfitDistributionStatus.Draft) return "NotDistributed";
        if (distribution.Lines.Count == 0) return "Pending";
        if (distribution.Lines.All(l => l.Status == MonthlyProfitPaymentStatus.Paid)) return "Paid";
        if (distribution.Lines.Any(l => l.Status == MonthlyProfitPaymentStatus.Paid)) return "PartiallyPaid";
        return "Pending";
    }

    // ---------------------------------------------------------------- validation & helpers

    private static ProfitDistributionType ParseType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type)) return ProfitDistributionType.Monthly;

        if (Enum.TryParse<ProfitDistributionType>(type, true, out var parsed) && Enum.IsDefined(parsed))
        {
            return parsed;
        }

        throw new ValidationException($"'{type}' is not a valid distribution type. Use Monthly or ProjectBased.");
    }

    private static int RequireYear(int? year) =>
        year ?? throw new ValidationException("Select the year.");

    private static int RequireMonth(int? month) =>
        month ?? throw new ValidationException("Select the month.");

    private static decimal RequireAmount(decimal? amount) =>
        amount is > 0m ? amount.Value : throw new ValidationException("Profit amount must be greater than zero.");

    private static DateTime ResolveProfitDate(DateTime? profitDate)
    {
        var date = DateTime.SpecifyKind((profitDate ?? DateTime.UtcNow).Date, DateTimeKind.Utc);

        // One day of tolerance: the client sends its local date, which can be ahead of UTC.
        if (date > DateTime.UtcNow.Date.AddDays(1))
        {
            throw new ValidationException("Profit date cannot be in the future.");
        }

        return date;
    }

    private static void ValidatePeriod(int year, int month)
    {
        if (year is < 2000 or > 2100)
        {
            throw new ValidationException("Year must be between 2000 and 2100.");
        }

        if (month is < 1 or > 12)
        {
            throw new ValidationException("Month must be between 1 and 12.");
        }
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTime Max(DateTime a, DateTime b) => a > b ? a : b;

    private static DateTime Min(DateTime a, DateTime b) => a < b ? a : b;

    private static string MonthName(int month)
        => CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month);

    private static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    /// <summary>Always rounds down, so allocated lines can never exceed the pool.</summary>
    private static decimal Floor2(decimal value)
        => Math.Floor(value * 100m) / 100m;
}
