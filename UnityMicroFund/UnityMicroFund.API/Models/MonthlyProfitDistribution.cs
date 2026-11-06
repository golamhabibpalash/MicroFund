using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum MonthlyProfitDistributionStatus
{
    Draft,
    Distributed,
    Paid
}

public enum MonthlyProfitPaymentStatus
{
    Pending,
    Paid
}

/// <summary>The two periodic payout cadences (see <see cref="ProfitPayoutMode"/>).</summary>
public enum ProfitDistributionType
{
    /// <summary>One calendar month of a Monthly project.</summary>
    Monthly,

    /// <summary>A ProjectBased project, up to a chosen date.</summary>
    ProjectBased
}

/// <summary>
/// A periodic profit distribution for one project (draft -> finalized -> disbursed).
/// It distributes the project's recorded income minus its recorded expenses that have not
/// been distributed yet, up to <see cref="PeriodEnd"/>; maintenance is taken from that net
/// profit and the rest is split by shares. Finalizing links the income/expense entries to
/// this distribution so they are never counted again. The table keeps its original name.
/// </summary>
[Table("monthly_profit_distributions")]
public class MonthlyProfitDistribution
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public ProfitDistributionType Type { get; set; } = ProfitDistributionType.Monthly;

    /// <summary>The project. Null only on legacy multi-project monthly batches.</summary>
    public Guid? InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    /// <summary>Calendar period of <see cref="PeriodEnd"/>, kept for filtering and reporting.</summary>
    [Required]
    public int Year { get; set; }

    [Required]
    public int Month { get; set; }

    /// <summary>Income and expenses dated on or before this day are included.</summary>
    public DateTime? PeriodEnd { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal IncomeAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ExpenseAmount { get; set; }

    /// <summary>Income − expenses: the profit before maintenance.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? NetProfitAmount { get; set; }

    /// <summary>The project's maintenance % frozen at calculation time.</summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal? MaintenancePercentage { get; set; }

    /// <summary>Organisation share (net profit × maintenance %), posted on finalize.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? MaintenanceAmount { get; set; }

    /// <summary>The maintenance posting made when processed, so a cancellation can reverse it.</summary>
    public Guid? MaintenanceDistributionId { get; set; }

    [ForeignKey(nameof(MaintenanceDistributionId))]
    public virtual InvestmentMaintenanceDistribution? MaintenanceDistribution { get; set; }

    /// <summary>What stays with the organisation: the unsold shares' portion plus rounding.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? UndistributedRemainder { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [Required]
    public MonthlyProfitDistributionStatus Status { get; set; } = MonthlyProfitDistributionStatus.Draft;

    /// <summary>Capital held by the shareholders who receive a share.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalInvestmentAmount { get; set; }

    /// <summary>Allocated to shareholders.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalProfitAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalPaidAmount { get; set; }

    [MaxLength(100)]
    public string? CalculatedBy { get; set; }

    public DateTime CalculatedAt { get; set; }

    [MaxLength(100)]
    public string? DistributedBy { get; set; }

    public DateTime? DistributedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<MonthlyProfitDistributionLine> Lines { get; set; } = new List<MonthlyProfitDistributionLine>();

    public virtual ICollection<InvestmentInterimProfit> IncomeEntries { get; set; } = new List<InvestmentInterimProfit>();

    public virtual ICollection<InvestmentProjectCost> ExpenseEntries { get; set; } = new List<InvestmentProjectCost>();
}

[Table("monthly_profit_distribution_lines")]
public class MonthlyProfitDistributionLine
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MonthlyProfitDistributionId { get; set; }

    [ForeignKey(nameof(MonthlyProfitDistributionId))]
    public virtual MonthlyProfitDistribution? Distribution { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    [MaxLength(200)]
    public string MemberName { get; set; } = string.Empty;

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    [Required]
    [MaxLength(200)]
    public string InvestmentName { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal InvestmentAmount { get; set; }

    /// <summary>Shares held at the period end - the allocation basis.</summary>
    public int SharesOwned { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal ProfitAmount { get; set; }

    [Required]
    public MonthlyProfitPaymentStatus Status { get; set; } = MonthlyProfitPaymentStatus.Pending;

    public Guid? WalletEntryId { get; set; }

    [ForeignKey(nameof(WalletEntryId))]
    public virtual WalletEntry? WalletEntry { get; set; }

    public DateTime? PaidAt { get; set; }

    [MaxLength(100)]
    public string? PaidBy { get; set; }

    public DateTime CreatedAt { get; set; }
}
