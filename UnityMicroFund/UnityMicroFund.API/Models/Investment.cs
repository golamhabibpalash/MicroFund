using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum InvestmentType
{
    Stocks,
    RealEstate,
    Business,
    Savings,
    Other
}

/// <summary>
/// Project lifecycle. Transitions marked AUTO are applied by the service, not the admin.
///
///   Draft -> OpenForSubscription -> FullySubscribed (AUTO, last share sold)
///         -> Active (admin; blocked until every share is sold)
///         -> Completed (admin records actual gross profit)
///         -> ProfitDistributed (AUTO, on distribution) -> Closed
///
///   Cancelled is reachable from Draft / OpenForSubscription / FullySubscribed only,
///   and refunds every subscriber.
/// </summary>
public enum InvestmentStatus
{
    Draft,
    OpenForSubscription,
    FullySubscribed,
    Active,
    Completed,
    ProfitDistributed,
    Closed,
    Cancelled
}

[Table("investments")]
public class Investment
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public InvestmentType Type { get; set; }

    /// <summary>
    /// Free-form category. Allowed values come from the ParamBusConfig row named
    /// "InvestmentCategories" so they can be changed without a schema migration.
    /// </summary>
    [MaxLength(100)]
    public string? Category { get; set; }

    /// <summary>
    /// The spec's "Investment Value". Kept on the original column name so existing
    /// dashboard and reporting queries continue to work.
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal PrincipalAmount { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal CurrentValue { get; set; }

    public int? TotalShares { get; set; }

    /// <summary>
    /// Derived server-side as PrincipalAmount / TotalShares - never supplied by the
    /// client, so the displayed price can never disagree with the project value.
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? SharePrice { get; set; }

    /// <summary>
    /// Minimum total shares a member may hold in this investment (cumulative across
    /// all purchases). Null means no minimum beyond 1.
    /// </summary>
    public int? MinimumSharesPerMember { get; set; }

    /// <summary>
    /// Maximum total shares a member may hold in this investment (cumulative across
    /// all purchases). Null means no limit.
    /// </summary>
    public int? MaximumSharesPerMember { get; set; }

    /// <summary>Estimated profit, captured when the project is created.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? TargetGrossProfit { get; set; }

    /// <summary>Recorded by the admin at completion; drives the whole distribution.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ActualGrossProfit { get; set; }

    /// <summary>
    /// Frozen onto the project at creation from the global default, so changing the
    /// global rate later cannot retroactively alter a settled project's arithmetic.
    /// </summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal OperationalExpensePercentage { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? OperationalExpenseAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? NetProfit { get; set; }

    /// <summary>
    /// Rounding remainder that could not be allocated to investors; belongs to the
    /// organisation alongside the operational fee.
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? UndistributedRemainder { get; set; }

    public DateTime? CompletionDate { get; set; }

    [MaxLength(1000)]
    public string? ClosingNotes { get; set; }

    /// <summary>
    /// The spec's "Investment Start Date".
    /// </summary>
    [Required]
    public DateTime DateInvested { get; set; }

    public DateTime? MaturityDate { get; set; }

    /// <summary>
    /// Derived from DateInvested -> MaturityDate when both are present, otherwise
    /// whatever the caller supplied.
    /// </summary>
    public int? DurationMonths { get; set; }

    [Required]
    public InvestmentStatus Status { get; set; } = InvestmentStatus.Draft;

    [MaxLength(100)]
    public string? CertificateNumber { get; set; }

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    [MaxLength(100)]
    public string? LastModifiedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime LastModifiedAt { get; set; }

    public virtual ICollection<MemberInvestment> MemberInvestments { get; set; } = new List<MemberInvestment>();

    public virtual ICollection<InvestmentPartner> Partners { get; set; } = new List<InvestmentPartner>();

    public virtual ICollection<InvestmentDocument> Documents { get; set; } = new List<InvestmentDocument>();

    public virtual ICollection<ShareSubscription> Subscriptions { get; set; } = new List<ShareSubscription>();

    public virtual ICollection<ProfitDistribution> ProfitDistributions { get; set; } = new List<ProfitDistribution>();

    public virtual ICollection<InvestmentInterimProfit> InterimProfits { get; set; } = new List<InvestmentInterimProfit>();
}
