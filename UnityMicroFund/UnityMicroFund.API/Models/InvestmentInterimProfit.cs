using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// Income recorded against a project (interim/occasional profit). Multiple entries may
/// exist per investment. For projects on a periodic payout the entry is paid out by the
/// next profit distribution; otherwise it is accrued and included in the final settlement.
/// </summary>
[Table("investment_interim_profits")]
public class InvestmentInterimProfit
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    public DateTime ProfitDate { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// The periodic profit distribution that paid this entry out, once that distribution
    /// is finalized. Linked entries are excluded from later distributions and from the
    /// final settlement, and can no longer be edited or removed.
    /// </summary>
    public Guid? ProfitDistributionId { get; set; }

    [ForeignKey(nameof(ProfitDistributionId))]
    public virtual MonthlyProfitDistribution? ProfitDistribution { get; set; }
}
