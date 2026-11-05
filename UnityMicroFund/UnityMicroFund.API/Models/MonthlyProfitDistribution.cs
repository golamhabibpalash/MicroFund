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

/// <summary>
/// The two periodic profit flows. See <see cref="ProfitPayoutMode"/> for which projects
/// take part in each.
/// </summary>
public enum ProfitDistributionType
{
    /// <summary>Rate-based: every Monthly project, each at its own monthly %, for one calendar month.</summary>
    Monthly,

    /// <summary>Amount-based: one realised profit amount for one ProjectBased project, split by shares.</summary>
    ProjectBased
}

/// <summary>
/// A periodic profit distribution batch (draft -> distributed -> paid). The table keeps
/// its original name; it now holds both monthly and project-based batches.
/// </summary>
[Table("monthly_profit_distributions")]
public class MonthlyProfitDistribution
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public ProfitDistributionType Type { get; set; } = ProfitDistributionType.Monthly;

    /// <summary>Calendar period. For project-based batches this is the month of ProfitDate.</summary>
    [Required]
    public int Year { get; set; }

    [Required]
    public int Month { get; set; }

    /// <summary>
    /// Monthly batches: the rate when every project used the same one, otherwise null
    /// (see each line's Rate). Always null for project-based batches.
    /// </summary>
    [Column(TypeName = "decimal(9,6)")]
    public decimal? Rate { get; set; }

    /// <summary>Project-based batches only: the project the profit belongs to.</summary>
    public Guid? InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    /// <summary>Project-based batches only: when the profit was realised.</summary>
    public DateTime? ProfitDate { get; set; }

    /// <summary>Project-based batches only: the realised profit amount that was entered.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? GrossProfitAmount { get; set; }

    /// <summary>Project-based: the project's maintenance % frozen at calculation time.</summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal? MaintenancePercentage { get; set; }

    /// <summary>Project-based: organisation share (gross × maintenance %), posted on finalize.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? MaintenanceAmount { get; set; }

    /// <summary>
    /// Project-based: what stays with the organisation after allocation - the unsold
    /// shares' portion plus rounding.
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? UndistributedRemainder { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [Required]
    public MonthlyProfitDistributionStatus Status { get; set; } = MonthlyProfitDistributionStatus.Draft;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalInvestmentAmount { get; set; }

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

    /// <summary>Shares held - the allocation basis for project-based batches.</summary>
    public int SharesOwned { get; set; }

    /// <summary>Monthly rate applied (monthly batches); 0 for project-based lines.</summary>
    [Required]
    [Column(TypeName = "decimal(9,6)")]
    public decimal Rate { get; set; }

    /// <summary>
    /// Monthly batches: days the holding was eligible in the month, weighted by amount
    /// when the member bought in more than once. Equal to DaysInPeriod for a full month.
    /// </summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal? HeldDays { get; set; }

    /// <summary>Monthly batches: days in the calendar month.</summary>
    public int? DaysInPeriod { get; set; }

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
