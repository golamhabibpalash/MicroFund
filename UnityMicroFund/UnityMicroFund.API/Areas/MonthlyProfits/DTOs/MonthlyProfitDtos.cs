using System.ComponentModel.DataAnnotations;

namespace UnityMicroFund.API.Areas.MonthlyProfits.DTOs;

/// <summary>
/// Selects what to process for one project. The project's payout type decides the period:
///   Monthly      - Year and Month (the whole calendar month).
///   ProjectBased - PeriodEnd (everything recorded up to that day). Defaults to today.
/// </summary>
public class CalculateMonthlyProfitDto
{
    [Required]
    public Guid? InvestmentId { get; set; }

    [Range(2000, 2100)]
    public int? Year { get; set; }

    [Range(1, 12)]
    public int? Month { get; set; }

    public DateTime? PeriodEnd { get; set; }
}

public class CreateMonthlyProfitDistributionDto : CalculateMonthlyProfitDto
{
    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class MonthlyProfitLineDto
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public Guid InvestmentId { get; set; }
    public string InvestmentName { get; set; } = string.Empty;
    public decimal InvestmentAmount { get; set; }
    public int SharesOwned { get; set; }

    /// <summary>Share of the project's total shares, in %.</summary>
    public decimal? OwnershipPercentage { get; set; }

    public decimal ProfitAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? WalletEntryId { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaidBy { get; set; }
}

/// <summary>An income or expense entry that feeds a distribution.</summary>
public class ProfitLedgerEntryDto
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class MonthlyProfitPreviewDto
{
    public string Type { get; set; } = string.Empty;
    public Guid InvestmentId { get; set; }
    public string InvestmentName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public DateTime PeriodEnd { get; set; }

    public decimal IncomeAmount { get; set; }
    public decimal ExpenseAmount { get; set; }
    public decimal NetProfitAmount { get; set; }
    public decimal MaintenancePercentage { get; set; }
    public decimal MaintenanceAmount { get; set; }
    public decimal InvestorProfitPool { get; set; }
    public decimal UndistributedRemainder { get; set; }
    public int TotalShares { get; set; }
    public int SoldShares { get; set; }
    public bool MaintenanceAccountConfigured { get; set; }

    public decimal TotalInvestmentAmount { get; set; }
    public decimal TotalProfitAmount { get; set; }
    public int EligibleMemberCount { get; set; }
    public int LineCount { get; set; }

    /// <summary>False when there is nothing to distribute (see <see cref="Message"/>).</summary>
    public bool CanProcess { get; set; }

    /// <summary>Why nothing can be distributed, when <see cref="CanProcess"/> is false.</summary>
    public string? Message { get; set; }

    public List<ProfitLedgerEntryDto> IncomeEntries { get; set; } = new();
    public List<ProfitLedgerEntryDto> ExpenseEntries { get; set; } = new();
    public List<MonthlyProfitLineDto> Lines { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class MonthlyProfitDistributionSummaryDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public Guid? InvestmentId { get; set; }

    /// <summary>The distribution's project (or, for legacy multi-project batches, the first one).</summary>
    public string InvestmentName { get; set; } = string.Empty;
    public List<string> ProjectNames { get; set; } = new();
    public int ProjectCount { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public decimal IncomeAmount { get; set; }
    public decimal ExpenseAmount { get; set; }
    public decimal? NetProfitAmount { get; set; }
    public decimal? MaintenancePercentage { get; set; }
    public decimal? MaintenanceAmount { get; set; }
    public decimal? UndistributedRemainder { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal TotalInvestmentAmount { get; set; }
    public decimal TotalProfitAmount { get; set; }
    public decimal TotalPaidAmount { get; set; }
    public decimal PendingAmount { get; set; }
    public int EligibleMemberCount { get; set; }
    public int LineCount { get; set; }
    public int PaidLineCount { get; set; }
    public int PendingLineCount { get; set; }
    public string? CalculatedBy { get; set; }
    public DateTime CalculatedAt { get; set; }
    public string? DistributedBy { get; set; }
    public DateTime? DistributedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MonthlyProfitDistributionDto : MonthlyProfitDistributionSummaryDto
{
    public List<MonthlyProfitLineDto> Lines { get; set; } = new();
    public List<MonthlyProfitTransactionDto> Transactions { get; set; } = new();

    /// <summary>The income and expense entries this distribution paid out.</summary>
    public List<ProfitLedgerEntryDto> IncomeEntries { get; set; } = new();
    public List<ProfitLedgerEntryDto> ExpenseEntries { get; set; } = new();
}

public class MonthlyProfitTransactionDto
{
    public Guid LineId { get; set; }
    public Guid WalletEntryId { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string InvestmentName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateTime PaidAt { get; set; }
    public string? PaidBy { get; set; }
}

public class PayMonthlyProfitDto
{
    public Guid? LineId { get; set; }
}

/// <summary>A project on a periodic payout, for the overview and the process dialog.</summary>
public class ProfitEligibleProjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ProfitPayoutMode { get; set; } = string.Empty;
    public int? TotalShares { get; set; }
    public int SoldShares { get; set; }
    public decimal TotalInvested { get; set; }
    public decimal MaintenancePercentage { get; set; }
    public bool MaintenanceAccountConfigured { get; set; }
    public DateTime DateInvested { get; set; }

    /// <summary>True when the project can be processed now (it is Active).</summary>
    public bool CanDistribute { get; set; }

    /// <summary>Income and expenses recorded but not yet distributed (all dates).</summary>
    public decimal PendingIncome { get; set; }
    public decimal PendingExpense { get; set; }

    /// <summary>
    /// Monthly projects: the month a new distribution should default to - the month after
    /// the latest one, or the first month with holdings - never later than this month.
    /// </summary>
    public int? NextYear { get; set; }
    public int? NextMonth { get; set; }

    /// <summary>Latest distribution, e.g. "October 2026" or "up to 05 Nov 2026".</summary>
    public string? LastDistributionLabel { get; set; }
    public decimal TotalDistributed { get; set; }
}
