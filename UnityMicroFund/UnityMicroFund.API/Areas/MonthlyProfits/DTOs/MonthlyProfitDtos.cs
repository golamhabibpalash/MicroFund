using System.ComponentModel.DataAnnotations;

namespace UnityMicroFund.API.Areas.MonthlyProfits.DTOs;

/// <summary>
/// Input for both batch types. Every batch belongs to exactly one project.
///   Monthly      - InvestmentId, Year, Month and optionally Rate (defaults to the
///                  project's monthly profit rate).
///   ProjectBased - InvestmentId, ProfitAmount and ProfitDate.
/// </summary>
public class CalculateMonthlyProfitDto
{
    /// <summary>"Monthly" (default) or "ProjectBased".</summary>
    [MaxLength(20)]
    public string? Type { get; set; }

    /// <summary>The project the profit belongs to.</summary>
    public Guid? InvestmentId { get; set; }

    [Range(2000, 2100)]
    public int? Year { get; set; }

    [Range(1, 12)]
    public int? Month { get; set; }

    /// <summary>Monthly only: rate for this month. Null uses the project's default rate.</summary>
    [Range(0.000001, 100)]
    public decimal? Rate { get; set; }

    /// <summary>ProjectBased only: realised profit to distribute (before maintenance).</summary>
    [Range(0.01, 999999999999)]
    public decimal? ProfitAmount { get; set; }

    /// <summary>ProjectBased only: when the profit was realised. Defaults to today.</summary>
    public DateTime? ProfitDate { get; set; }
}

public class CreateMonthlyProfitDistributionDto : CalculateMonthlyProfitDto
{
    [MaxLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>Recalculates a draft. The project and period of a batch cannot change.</summary>
public class UpdateMonthlyProfitDistributionDto
{
    /// <summary>Monthly: new rate for the month.</summary>
    [Range(0.000001, 100)]
    public decimal? Rate { get; set; }

    /// <summary>ProjectBased: new profit amount.</summary>
    [Range(0.01, 999999999999)]
    public decimal? ProfitAmount { get; set; }

    /// <summary>ProjectBased: new profit date.</summary>
    public DateTime? ProfitDate { get; set; }

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

    /// <summary>Project-based: share of the project's total shares, in %.</summary>
    public decimal? OwnershipPercentage { get; set; }

    public decimal Rate { get; set; }
    public decimal? HeldDays { get; set; }
    public int? DaysInPeriod { get; set; }
    public decimal ProfitAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? WalletEntryId { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaidBy { get; set; }
}

public class MonthlyProfitPreviewDto
{
    public string Type { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal? Rate { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public int? DaysInPeriod { get; set; }

    // Project-based breakdown
    public Guid? InvestmentId { get; set; }
    public string? InvestmentName { get; set; }
    public DateTime? ProfitDate { get; set; }
    public decimal? GrossProfitAmount { get; set; }
    public decimal? MaintenancePercentage { get; set; }
    public decimal? MaintenanceAmount { get; set; }
    public decimal? InvestorProfitPool { get; set; }
    public decimal? UndistributedRemainder { get; set; }
    public int? TotalShares { get; set; }
    public int? SoldShares { get; set; }
    public bool MaintenanceAccountConfigured { get; set; }

    public decimal TotalInvestmentAmount { get; set; }
    public decimal TotalProfitAmount { get; set; }
    public int EligibleMemberCount { get; set; }
    public int LineCount { get; set; }
    public List<MonthlyProfitLineDto> Lines { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class MonthlyProfitDistributionSummaryDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal? Rate { get; set; }
    public Guid? InvestmentId { get; set; }

    /// <summary>The batch's project (or, for older multi-project monthly batches, the first one).</summary>
    public string InvestmentName { get; set; } = string.Empty;
    public DateTime? ProfitDate { get; set; }
    public decimal? GrossProfitAmount { get; set; }
    public decimal? MaintenancePercentage { get; set; }
    public decimal? MaintenanceAmount { get; set; }
    public decimal? UndistributedRemainder { get; set; }
    public List<string> ProjectNames { get; set; } = new();
    public int ProjectCount { get; set; }
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

/// <summary>A project configured for periodic profit, for the create dialogs.</summary>
public class ProfitEligibleProjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ProfitPayoutMode { get; set; } = string.Empty;
    public decimal? MonthlyProfitRate { get; set; }
    public int? TotalShares { get; set; }
    public int SoldShares { get; set; }
    public decimal TotalInvested { get; set; }
    public decimal MaintenancePercentage { get; set; }
    public bool MaintenanceAccountConfigured { get; set; }
    public DateTime DateInvested { get; set; }
    public DateTime? MaturityDate { get; set; }

    /// <summary>True when the project can be paid now (it is Active).</summary>
    public bool CanDistribute { get; set; }

    /// <summary>
    /// Monthly projects: the period a new batch should default to - the month after the
    /// latest monthly batch, or the project's start month - never later than this month.
    /// </summary>
    public int? NextYear { get; set; }
    public int? NextMonth { get; set; }

    /// <summary>Latest batch this project appeared in, e.g. "October 2026" or "05 Nov 2026".</summary>
    public string? LastDistributionLabel { get; set; }
    public decimal TotalDistributed { get; set; }
}
