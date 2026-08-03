using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum ShareSubscriptionStatus
{
    Active,

    /// <summary>Reversed because the project was cancelled; the buyer was refunded.</summary>
    Cancelled,

    /// <summary>Principal and profit have been settled back to the wallet.</summary>
    Settled
}

/// <summary>
/// Immutable record of one share purchase. The rolled-up current holding per member
/// lives on <see cref="MemberInvestment"/>; this is the history behind it.
/// </summary>
[Table("investment_share_subscriptions")]
public class ShareSubscription
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
    public int SharesPurchased { get; set; }

    /// <summary>
    /// Captured at purchase time. If a project's value or share count is ever amended,
    /// what this buyer actually paid stays intact.
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal SharePriceAtPurchase { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountPaid { get; set; }

    [Required]
    public ShareSubscriptionStatus Status { get; set; } = ShareSubscriptionStatus.Active;

    public DateTime PurchasedAt { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }
}
