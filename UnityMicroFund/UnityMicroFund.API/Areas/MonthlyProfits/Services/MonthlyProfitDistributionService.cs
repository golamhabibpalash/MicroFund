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
/// Periodic profit distribution for one project at a time, driven by the project's own
/// books rather than a separate calculation:
///
///   net profit   = income − expenses recorded on the project, not yet distributed,
///                  dated on or before the period end
///   maintenance  = net profit × the project's maintenance %  (posted on finalize)
///   per holder   = floor((net profit − maintenance) × shares / total shares)
///
/// Unsold shares' portion and rounding stay with the organisation, exactly like the final
/// settlement. Expenses that exceed income are not distributed; they stay undistributed and
/// carry into the next period. Finalizing links every included income/expense entry to the
/// distribution, so the entry is never counted again (nor by the final settlement) and is
/// locked against edits.
///
/// The project's payout type sets the period: Monthly projects are processed one calendar
/// month at a time, ProjectBased projects up to any chosen date.
/// Lifecycle: processed (Distributed: entries locked, maintenance posted) -> Paid once every
/// investor has been disbursed. A processed distribution with no payments can be cancelled.
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
        var investment = await LoadInvestmentAsync(dto.InvestmentId, cancellationToken);
        var periodEnd = ResolvePeriodEnd(investment, dto.Year, dto.Month, dto.PeriodEnd);
        return await BuildPreviewAsync(investment, periodEnd, cancellationToken);
    }

    public async Task<IReadOnlyList<ProfitEligibleProjectDto>> GetEligibleProjectsAsync(
        CancellationToken cancellationToken = default)
    {
        var investments = await _context.Investments
            .AsNoTracking()
            .Include(i => i.Subscriptions)
            .Include(i => i.InterimProfits)
            .Include(i => i.ProjectCosts)
            .Where(i => i.ProfitPayoutMode != ProfitPayoutMode.OnCompletion)
            .OrderBy(i => i.Name)
            .ToListAsync(cancellationToken);

        var ids = investments.Select(i => i.Id).ToList();
        var distributions = await _context.MonthlyProfitDistributions
            .AsNoTracking()
            .Where(d => d.InvestmentId != null && ids.Contains(d.InvestmentId.Value))
            .Select(d => new { d.Id, d.InvestmentId, d.Type, d.Status, d.Year, d.Month, d.PeriodEnd, d.TotalProfitAmount })
            .ToListAsync(cancellationToken);

        var currentMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        return investments.Select(i =>
        {
            var mine = distributions.Where(d => d.InvestmentId == i.Id).ToList();
            var finalized = mine.Where(d => d.Status != MonthlyProfitDistributionStatus.Draft).ToList();
            var latest = finalized.OrderByDescending(d => d.PeriodEnd).FirstOrDefault();
            var active = i.Subscriptions.Where(s => s.Status == ShareSubscriptionStatus.Active).ToList();

            int? nextYear = null, nextMonth = null;
            if (i.ProfitPayoutMode == ProfitPayoutMode.Monthly)
            {
                // The month after the latest distribution; otherwise the first month anyone
                // held shares (the later of the project start and the first purchase).
                var lastMonthly = mine
                    .Where(d => d.Type == ProfitDistributionType.Monthly)
                    .OrderByDescending(d => d.Year).ThenByDescending(d => d.Month)
                    .FirstOrDefault();
                var firstHeld = active.Count > 0 ? Max(i.DateInvested, active.Min(s => s.PurchasedAt)) : i.DateInvested;
                var next = lastMonthly != null
                    ? new DateTime(lastMonthly.Year, lastMonthly.Month, 1).AddMonths(1)
                    : new DateTime(firstHeld.Year, firstHeld.Month, 1);
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
                TotalShares = i.TotalShares,
                SoldShares = active.Sum(s => s.SharesPurchased),
                TotalInvested = active.Sum(s => s.AmountPaid),
                MaintenancePercentage = i.MaintenancePercentage,
                MaintenanceAccountConfigured = i.MaintenanceAccountId.HasValue,
                DateInvested = i.DateInvested,
                CanDistribute = i.Status == InvestmentStatus.Active,
                PendingIncome = i.InterimProfits.Where(p => p.ProfitDistributionId == null).Sum(p => p.Amount),
                PendingExpense = i.ProjectCosts.Where(c => c.ProfitDistributionId == null).Sum(c => c.Amount),
                NextYear = nextYear,
                NextMonth = nextMonth,
                LastDistributionLabel = latest == null ? null : PeriodLabel(latest.Type, latest.Year, latest.Month, latest.PeriodEnd),
                TotalDistributed = finalized.Sum(d => d.TotalProfitAmount)
            };
        }).ToList();
    }

    public async Task<IReadOnlyList<MonthlyProfitDistributionSummaryDto>> GetAllAsync(
        int? year = null,
        string? status = null,
        string? type = null,
        CancellationToken cancellationToken = default)
    {
        var statusFilter = ParseOptionalEnum<MonthlyProfitDistributionStatus>(status, "distribution status");
        var typeFilter = ParseOptionalEnum<ProfitDistributionType>(type, "distribution type");

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
            .ThenByDescending(d => d.PeriodEnd)
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
            .Include(d => d.IncomeEntries)
            .Include(d => d.ExpenseEntries)
            .Include(d => d.Lines)
                .ThenInclude(l => l.WalletEntry)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (distribution == null) return null;

        var detail = MapDetail(distribution);

        // A legacy draft has not claimed its entries: show the ones it would cover.
        if (distribution.Status == MonthlyProfitDistributionStatus.Draft
            && distribution.InvestmentId.HasValue
            && distribution.PeriodEnd.HasValue)
        {
            var (income, expenses) = await LoadPendingEntriesAsync(
                distribution.InvestmentId.Value, distribution.PeriodEnd.Value, cancellationToken);
            detail.IncomeEntries = income.Select(ToLedgerEntry).ToList();
            detail.ExpenseEntries = expenses.Select(ToLedgerEntry).ToList();
        }

        return detail;
    }

    public async Task<MonthlyProfitDistributionDto> ProcessAsync(
        CreateMonthlyProfitDistributionDto dto,
        string? actionedBy,
        CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var investment = await LoadInvestmentAsync(dto.InvestmentId, cancellationToken);
        var periodEnd = ResolvePeriodEnd(investment, dto.Year, dto.Month, dto.PeriodEnd);
        var preview = await BuildPreviewAsync(investment, periodEnd, cancellationToken);

        if (!preview.CanProcess)
        {
            throw new ValidationException(preview.Message ?? "There is no profit to distribute.");
        }

        var now = DateTime.UtcNow;
        var distribution = new MonthlyProfitDistribution
        {
            Id = Guid.NewGuid(),
            Type = Enum.Parse<ProfitDistributionType>(preview.Type),
            InvestmentId = investment.Id,
            Year = preview.Year,
            Month = preview.Month,
            PeriodEnd = preview.PeriodEnd,
            IncomeAmount = preview.IncomeAmount,
            ExpenseAmount = preview.ExpenseAmount,
            NetProfitAmount = preview.NetProfitAmount,
            MaintenancePercentage = preview.MaintenancePercentage,
            MaintenanceAmount = preview.MaintenanceAmount,
            UndistributedRemainder = preview.UndistributedRemainder,
            TotalInvestmentAmount = preview.TotalInvestmentAmount,
            TotalProfitAmount = preview.TotalProfitAmount,
            Notes = NullIfBlank(dto.Notes),
            Status = MonthlyProfitDistributionStatus.Distributed,
            CalculatedBy = actionedBy,
            CalculatedAt = now,
            DistributedBy = actionedBy,
            DistributedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        distribution.Lines = preview.Lines.Select(l => ToLineEntity(l, distribution.Id, now)).ToList();
        _context.MonthlyProfitDistributions.Add(distribution);

        // Claim the entries: from now on they belong to this distribution only.
        var (income, expenses) = await LoadPendingEntriesAsync(investment.Id, periodEnd, cancellationToken, tracked: true);
        foreach (var entry in income) entry.ProfitDistributionId = distribution.Id;
        foreach (var entry in expenses) entry.ProfitDistributionId = distribution.Id;

        // Post the organisation's maintenance share to the project's maintenance account,
        // exactly as the final settlement does, inside this transaction.
        if (preview.MaintenanceAmount > 0m && investment.MaintenanceAccountId is Guid accountId)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken)
                ?? throw new ValidationException("The project's maintenance account no longer exists.");

            account.Balance += preview.MaintenanceAmount;

            var posting = new InvestmentMaintenanceDistribution
            {
                Id = Guid.NewGuid(),
                InvestmentId = investment.Id,
                AccountId = account.Id,
                Amount = preview.MaintenanceAmount,
                Percentage = preview.MaintenancePercentage,
                DisbursedBy = actionedBy,
                DisbursedAt = now,
                Remarks = $"Maintenance ({preview.MaintenancePercentage}%) on profit for " +
                          $"{PeriodLabel(distribution.Type, distribution.Year, distribution.Month, distribution.PeriodEnd)} - {investment.Name}"
            };
            _context.InvestmentMaintenanceDistributions.Add(posting);
            distribution.MaintenanceDistributionId = posting.Id;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return (await GetByIdAsync(distribution.Id, cancellationToken))!;
    }

    public async Task<bool> CancelAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var distribution = await _context.MonthlyProfitDistributions
            .Include(d => d.Lines)
            .Include(d => d.IncomeEntries)
            .Include(d => d.ExpenseEntries)
            .Include(d => d.MaintenanceDistribution)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (distribution == null) return false;

        if (distribution.Lines.Any(l => l.Status == MonthlyProfitPaymentStatus.Paid))
        {
            throw new ValidationException(
                "Some investors have already been paid from this distribution, so it can no longer be cancelled.");
        }

        // Release the income/expense entries so they can be processed again.
        foreach (var entry in distribution.IncomeEntries) entry.ProfitDistributionId = null;
        foreach (var entry in distribution.ExpenseEntries) entry.ProfitDistributionId = null;

        // Reverse the maintenance posting.
        if (distribution.MaintenanceDistribution is { } posting)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == posting.AccountId, cancellationToken);
            if (account != null) account.Balance -= posting.Amount;

            distribution.MaintenanceDistributionId = null;
            _context.InvestmentMaintenanceDistributions.Remove(posting);
        }

        _context.MonthlyProfitDistributionLines.RemoveRange(distribution.Lines);
        _context.MonthlyProfitDistributions.Remove(distribution);

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
        return true;
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
            ?? throw new NotFoundException("Profit distribution not found.");

        if (lineId.HasValue && distribution.Lines.All(l => l.Id != lineId.Value))
        {
            throw new NotFoundException("Investor line not found.");
        }

        var pending = distribution.Lines
            .Where(l => l.Status == MonthlyProfitPaymentStatus.Pending
                     && (!lineId.HasValue || l.Id == lineId.Value))
            .ToList();

        if (pending.Count == 0)
        {
            throw new ValidationException("Every investor in this distribution has already been paid.");
        }

        var now = DateTime.UtcNow;
        var period = PeriodLabel(distribution.Type, distribution.Year, distribution.Month, distribution.PeriodEnd);
        foreach (var line in pending)
        {
            var entry = _wallet.AddEntry(
                line.MemberId,
                WalletEntryType.ProfitCredit,
                line.ProfitAmount,
                $"Profit - {line.InvestmentName} - {period}",
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

    // ---------------------------------------------------------------- calculation

    private async Task<MonthlyProfitPreviewDto> BuildPreviewAsync(
        Investment investment,
        DateTime periodEnd,
        CancellationToken cancellationToken)
    {
        var type = TypeFor(investment);
        await EnsurePeriodAvailableAsync(investment, type, periodEnd, cancellationToken);

        var (income, expenses) = await LoadPendingEntriesAsync(investment.Id, periodEnd, cancellationToken);
        var incomeAmount = income.Sum(p => p.Amount);
        var expenseAmount = expenses.Sum(c => c.Amount);
        var net = incomeAmount - expenseAmount;

        var holdings = await _context.ShareSubscriptions
            .AsNoTracking()
            .Include(s => s.Member)
            .Where(s => s.InvestmentId == investment.Id
                     && s.Status == ShareSubscriptionStatus.Active
                     && s.PurchasedAt <= periodEnd)
            .GroupBy(s => new { s.MemberId, MemberName = s.Member!.Name })
            .Select(g => new
            {
                g.Key.MemberId,
                g.Key.MemberName,
                Shares = g.Sum(s => s.SharesPurchased),
                Amount = g.Sum(s => s.AmountPaid)
            })
            .Where(h => h.Shares > 0)
            .ToListAsync(cancellationToken);

        var soldShares = holdings.Sum(h => h.Shares);
        // Same basis as the final settlement: unsold shares belong to the organisation,
        // so their portion of the pool is not allocated to any investor.
        var totalShares = Math.Max(investment.TotalShares ?? soldShares, soldShares);

        var preview = new MonthlyProfitPreviewDto
        {
            Type = type.ToString(),
            InvestmentId = investment.Id,
            InvestmentName = investment.Name,
            Year = periodEnd.Year,
            Month = periodEnd.Month,
            PeriodEnd = periodEnd,
            IncomeAmount = incomeAmount,
            ExpenseAmount = expenseAmount,
            NetProfitAmount = net,
            MaintenancePercentage = investment.MaintenancePercentage,
            TotalShares = totalShares,
            SoldShares = soldShares,
            MaintenanceAccountConfigured = investment.MaintenanceAccountId.HasValue,
            IncomeEntries = income.Select(ToLedgerEntry).ToList(),
            ExpenseEntries = expenses.Select(ToLedgerEntry).ToList()
        };

        if (income.Count == 0 && expenses.Count == 0)
        {
            preview.Message = $"No income or expense has been recorded for this project up to {periodEnd:dd MMM yyyy} " +
                              "that is not already distributed. Record them on the project first.";
            return preview;
        }

        if (net <= 0m)
        {
            preview.Message = net == 0m
                ? "Income and expenses cancel out, so there is no profit to distribute."
                : $"Expenses exceed income by {-net:N2}, so there is no profit to distribute. " +
                  "These entries stay undistributed and are carried into the next period.";
            return preview;
        }

        if (soldShares == 0)
        {
            preview.Message = "No investor held shares in this project by the period end.";
            return preview;
        }

        var maintenance = Round2(net * investment.MaintenancePercentage / 100m);
        var pool = net - maintenance;

        var lines = holdings
            .Select(h => new MonthlyProfitLineDto
            {
                Id = Guid.NewGuid(),
                MemberId = h.MemberId,
                MemberName = h.MemberName,
                InvestmentId = investment.Id,
                InvestmentName = investment.Name,
                InvestmentAmount = h.Amount,
                SharesOwned = h.Shares,
                OwnershipPercentage = Math.Round((decimal)h.Shares / totalShares * 100m, 4),
                ProfitAmount = Floor2(pool * h.Shares / totalShares),
                Status = MonthlyProfitPaymentStatus.Pending.ToString()
            })
            .Where(l => l.ProfitAmount > 0m)
            .OrderByDescending(l => l.SharesOwned)
            .ThenBy(l => l.MemberName)
            .ToList();

        var allocated = lines.Sum(l => l.ProfitAmount);

        preview.MaintenanceAmount = maintenance;
        preview.InvestorProfitPool = pool;
        preview.UndistributedRemainder = pool - allocated;
        preview.Lines = lines;
        preview.LineCount = lines.Count;
        preview.EligibleMemberCount = lines.Count;
        preview.TotalInvestmentAmount = lines.Sum(l => l.InvestmentAmount);
        preview.TotalProfitAmount = allocated;
        preview.CanProcess = lines.Count > 0;

        if (maintenance > 0m && !investment.MaintenanceAccountId.HasValue)
        {
            preview.Warnings.Add("This project has no maintenance account, so the maintenance share will be kept but not posted to any account.");
        }
        if (soldShares < totalShares)
        {
            preview.Warnings.Add($"{totalShares - soldShares} of {totalShares} shares are unsold; their portion stays with the organisation.");
        }

        return preview;
    }

    /// <summary>
    /// Income and expenses not yet claimed by a finalized distribution, dated on or before
    /// <paramref name="periodEnd"/>. Earlier undistributed entries are included, so nothing
    /// recorded late is ever skipped.
    /// </summary>
    private async Task<(List<InvestmentInterimProfit> Income, List<InvestmentProjectCost> Expenses)> LoadPendingEntriesAsync(
        Guid investmentId,
        DateTime periodEnd,
        CancellationToken cancellationToken,
        bool tracked = false)
    {
        var dayEnd = periodEnd.Date.AddDays(1).AddTicks(-1);

        var incomeQuery = _context.InvestmentInterimProfits
            .Where(p => p.InvestmentId == investmentId && p.ProfitDistributionId == null && p.ProfitDate <= dayEnd);
        var expenseQuery = _context.InvestmentProjectCosts
            .Where(c => c.InvestmentId == investmentId && c.ProfitDistributionId == null && c.CostDate <= dayEnd);

        if (!tracked)
        {
            incomeQuery = incomeQuery.AsNoTracking();
            expenseQuery = expenseQuery.AsNoTracking();
        }

        var income = await incomeQuery.OrderBy(p => p.ProfitDate).ToListAsync(cancellationToken);
        var expenses = await expenseQuery.OrderBy(c => c.CostDate).ToListAsync(cancellationToken);
        return (income, expenses);
    }

    /// <summary>
    /// A Monthly project is processed once per month, and no project can be processed for a
    /// period earlier than the latest one already processed.
    /// </summary>
    private async Task EnsurePeriodAvailableAsync(
        Investment investment,
        ProfitDistributionType type,
        DateTime periodEnd,
        CancellationToken cancellationToken)
    {
        var processed = await _context.MonthlyProfitDistributions
            .AsNoTracking()
            .Where(d => d.InvestmentId == investment.Id && d.PeriodEnd != null)
            .Select(d => new { d.Type, d.Year, d.Month, d.PeriodEnd })
            .ToListAsync(cancellationToken);

        if (type == ProfitDistributionType.Monthly
            && processed.Any(d => d.Type == ProfitDistributionType.Monthly && d.Year == periodEnd.Year && d.Month == periodEnd.Month))
        {
            throw new ConflictException($"{MonthName(periodEnd.Month)} {periodEnd.Year} has already been processed for this project.");
        }

        var latest = processed.OrderByDescending(d => d.PeriodEnd).FirstOrDefault();
        if (latest != null && periodEnd.Date < latest.PeriodEnd!.Value.Date)
        {
            throw new ValidationException(
                $"Profit has already been processed up to {latest.PeriodEnd:dd MMM yyyy}. Choose a later period.");
        }
    }

    /// <summary>The project's payout type sets the period: a calendar month, or up to a date.</summary>
    private static DateTime ResolvePeriodEnd(Investment investment, int? year, int? month, DateTime? periodEnd)
    {
        var today = DateTime.UtcNow.Date;

        if (TypeFor(investment) == ProfitDistributionType.Monthly)
        {
            if (year is null || month is null)
            {
                throw new ValidationException("Select the month to process.");
            }
            if (year is < 2000 or > 2100 || month is < 1 or > 12)
            {
                throw new ValidationException("Select a valid month.");
            }
            if (year > today.Year || (year == today.Year && month > today.Month))
            {
                throw new ValidationException("A future month cannot be processed.");
            }

            var monthEnd = new DateTime(year.Value, month.Value, DateTime.DaysInMonth(year.Value, month.Value), 0, 0, 0, DateTimeKind.Utc);
            if (monthEnd < investment.DateInvested.Date)
            {
                throw new ValidationException($"The project starts on {investment.DateInvested:dd MMM yyyy}, after {MonthName(month.Value)} {year}.");
            }

            return monthEnd;
        }

        var date = DateTime.SpecifyKind((periodEnd ?? today).Date, DateTimeKind.Utc);

        // One day of tolerance: the client sends its local date, which can be ahead of UTC.
        if (date > today.AddDays(1))
        {
            throw new ValidationException("The date cannot be in the future.");
        }

        return date;
    }

    private async Task<Investment> LoadInvestmentAsync(Guid? investmentId, CancellationToken cancellationToken)
    {
        if (!investmentId.HasValue)
        {
            throw new ValidationException("Select a project.");
        }

        var investment = await _context.Investments
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == investmentId.Value, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.ProfitPayoutMode == ProfitPayoutMode.OnCompletion)
        {
            throw new ValidationException(
                $"\"{investment.Name}\" is paid at completion only. To distribute its profit periodically, set its profit payout to Monthly or Project-based in the investment form.");
        }

        if (investment.Status != InvestmentStatus.Active)
        {
            throw new ValidationException(
                $"Profit can only be processed while the project is Active (current status: {investment.Status}).");
        }

        return investment;
    }

    // ---------------------------------------------------------------- mapping

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
        ProfitAmount = l.ProfitAmount,
        Status = MonthlyProfitPaymentStatus.Pending,
        CreatedAt = now
    };

    private static ProfitLedgerEntryDto ToLedgerEntry(InvestmentInterimProfit p) => new()
    {
        Id = p.Id,
        Date = p.ProfitDate,
        Description = string.IsNullOrWhiteSpace(p.Remarks) ? "Income" : p.Remarks,
        Amount = p.Amount
    };

    private static ProfitLedgerEntryDto ToLedgerEntry(InvestmentProjectCost c) => new()
    {
        Id = c.Id,
        Date = c.CostDate,
        Description = string.IsNullOrWhiteSpace(c.Remarks) ? c.Title : $"{c.Title} - {c.Remarks}",
        Amount = c.Amount
    };

    private static MonthlyProfitDistributionDto MapSummary(MonthlyProfitDistribution d)
    {
        var paidLines = d.Lines.Count(l => l.Status == MonthlyProfitPaymentStatus.Paid);
        var projectNames = d.Lines.Select(l => l.InvestmentName).Distinct().OrderBy(n => n).ToList();

        return new MonthlyProfitDistributionDto
        {
            Id = d.Id,
            Type = d.Type.ToString(),
            InvestmentId = d.InvestmentId,
            InvestmentName = d.Investment?.Name ?? projectNames.FirstOrDefault() ?? string.Empty,
            ProjectNames = projectNames,
            ProjectCount = projectNames.Count,
            Year = d.Year,
            Month = d.Month,
            PeriodEnd = d.PeriodEnd,
            IncomeAmount = d.IncomeAmount,
            ExpenseAmount = d.ExpenseAmount,
            NetProfitAmount = d.NetProfitAmount,
            MaintenancePercentage = d.MaintenancePercentage,
            MaintenanceAmount = d.MaintenanceAmount,
            UndistributedRemainder = d.UndistributedRemainder,
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
            .OrderByDescending(l => l.SharesOwned)
            .ThenBy(l => l.MemberName)
            .Select(l => new MonthlyProfitLineDto
            {
                Id = l.Id,
                MemberId = l.MemberId,
                MemberName = l.MemberName,
                InvestmentId = l.InvestmentId,
                InvestmentName = l.InvestmentName,
                InvestmentAmount = l.InvestmentAmount,
                SharesOwned = l.SharesOwned,
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

        detail.IncomeEntries = d.IncomeEntries.OrderBy(p => p.ProfitDate).Select(ToLedgerEntry).ToList();
        detail.ExpenseEntries = d.ExpenseEntries.OrderBy(c => c.CostDate).Select(ToLedgerEntry).ToList();

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

    // ---------------------------------------------------------------- helpers

    private static ProfitDistributionType TypeFor(Investment investment) =>
        investment.ProfitPayoutMode == ProfitPayoutMode.Monthly
            ? ProfitDistributionType.Monthly
            : ProfitDistributionType.ProjectBased;

    private static string PeriodLabel(ProfitDistributionType type, int year, int month, DateTime? periodEnd) =>
        type == ProfitDistributionType.Monthly || !periodEnd.HasValue
            ? $"{MonthName(month)} {year}"
            : $"up to {periodEnd:dd MMM yyyy}";

    private static TEnum? ParseOptionalEnum<TEnum>(string? value, string label) where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        if (Enum.TryParse<TEnum>(value, true, out var parsed) && Enum.IsDefined(parsed))
        {
            return parsed;
        }

        throw new ValidationException($"'{value}' is not a valid {label}.");
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTime Max(DateTime a, DateTime b) => a > b ? a : b;

    private static string MonthName(int month)
        => CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month);

    private static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    /// <summary>Always rounds down, so allocated lines can never exceed the pool.</summary>
    private static decimal Floor2(decimal value)
        => Math.Floor(value * 100m) / 100m;
}
