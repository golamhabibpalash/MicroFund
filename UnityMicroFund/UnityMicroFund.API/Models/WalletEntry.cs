using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum WalletEntryType
{
    /// <summary>Money paid in. Always linked to an approved Fund transaction.</summary>
    Deposit,

    /// <summary>Debit when shares are bought.</summary>
    SharePurchase,

    /// <summary>Credit when a subscription is reversed (project cancelled).</summary>
    PurchaseRefund,

    /// <summary>Original capital returned at settlement.</summary>
    PrincipalReturn,

    /// <summary>Investor's share of net profit at settlement.</summary>
    ProfitCredit,

    /// <summary>Debit when the organisation pays money out to the investor.</summary>
    Disbursement,

    /// <summary>
    /// Debit when fund money is returned/withdrawn to the member (a Refund transaction
    /// or an approved cash-out request).
    /// </summary>
    Withdrawal
}

/// <summary>
/// Append-only wallet ledger. A member's balance is SUM(Amount) over their entries -
/// there is no stored balance column, so the balance can never drift from its history.
///
/// Credits are positive, debits negative.
/// </summary>
[Table("investment_wallet_entries")]
public class WalletEntry
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    public WalletEntryType EntryType { get; set; }

    /// <summary>Signed: credits positive, debits negative.</summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    /// <summary>
    /// Set on Deposit entries only. Uniquely indexed so the same funding transaction
    /// can never be credited twice - this is what makes the backfill safe to re-run.
    /// </summary>
    public Guid? TransactionId { get; set; }

    [ForeignKey(nameof(TransactionId))]
    public virtual Transaction? Transaction { get; set; }

    public Guid? InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    public Guid? ShareSubscriptionId { get; set; }

    [MaxLength(300)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }
}
