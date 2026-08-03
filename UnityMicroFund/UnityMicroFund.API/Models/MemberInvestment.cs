using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

[Table("member_investments")]
public class MemberInvestment
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    /// <summary>Current holding, rolled up from this member's ShareSubscription rows.</summary>
    public int SharesOwned { get; set; }

    /// <summary>Total capital this member has put into the project.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountInvested { get; set; }

    /// <summary>
    /// Display only, derived from SharesOwned / Investment.TotalShares. Profit
    /// distribution uses the integer share counts directly, never this value, so
    /// its rounding cannot leak into the money.
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(9,6)")]
    public decimal SharePercentage { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ShareValue { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
