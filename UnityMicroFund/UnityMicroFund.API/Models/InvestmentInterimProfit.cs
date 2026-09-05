using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// Append-only record of an interim/occasional profit entry for a project. Multiple
/// entries may exist per investment. Interim profits are accrued (not immediately
/// distributed) and included in the final distribution calculation.
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
}
