using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// A single operating/business cost recorded against an investment project (feed,
/// transportation, labour, medicine, etc.). Costs are held as separate records rather
/// than one manually maintained total, and the running total is always the sum. They
/// are deducted from the project's gross value when the financial result is computed.
/// </summary>
[Table("investment_project_costs")]
public class InvestmentProjectCost
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    /// <summary>Short heading/category for the cost, e.g. "Feed".</summary>
    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    /// <summary>The date the cost was incurred.</summary>
    public DateTime CostDate { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
