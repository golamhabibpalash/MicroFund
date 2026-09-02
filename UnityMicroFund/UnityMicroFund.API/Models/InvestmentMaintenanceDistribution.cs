using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// Immutable ledger record of one maintenance disbursement to an organisation account.
/// Written exactly once when a project's profit is distributed (inside the same atomic
/// settlement transaction as the investor distribution), so the same maintenance amount
/// can never be disbursed twice. The associated Account.Balance is credited together
/// with this row.
/// </summary>
[Table("investment_maintenance_distributions")]
public class InvestmentMaintenanceDistribution
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    /// <summary>The organisation account the maintenance amount was disbursed to.</summary>
    [Required]
    public Guid AccountId { get; set; }

    [ForeignKey(nameof(AccountId))]
    public virtual Account? Account { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    /// <summary>Maintenance (%) applied to profit at settlement, for the audit trail.</summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal Percentage { get; set; }

    [MaxLength(100)]
    public string? DisbursedBy { get; set; }

    public DateTime DisbursedAt { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
