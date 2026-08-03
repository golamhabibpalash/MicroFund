using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// One investor's settlement line for one project. Written once when profit is
/// distributed and never recalculated - a later edit to the project must not change
/// what an investor was already told they would receive.
/// </summary>
[Table("investment_profit_distributions")]
public class ProfitDistribution
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    public int SharesOwned { get; set; }

    /// <summary>Ownership at distribution time, for display and statements only.</summary>
    [Column(TypeName = "decimal(9,6)")]
    public decimal OwnershipPercentage { get; set; }

    /// <summary>Original capital returned.</summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal PrincipalAmount { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal ProfitAmount { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalPayable { get; set; }

    public DateTime DistributedAt { get; set; }

    /// <summary>Null until the organisation actually pays the money out.</summary>
    public DateTime? DisbursedAt { get; set; }

    [MaxLength(100)]
    public string? DisbursedBy { get; set; }
}
