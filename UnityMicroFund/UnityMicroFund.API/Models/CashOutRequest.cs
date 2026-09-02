using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum CashOutStatus
{
    Pending,
    Approved,
    Rejected,
    Cancelled
}

/// <summary>
/// A member's request to withdraw available wallet balance. Created Pending, then an
/// admin approves or rejects it (or the member cancels it). The wallet is only debited
/// on approval, atomically with the status change.
/// </summary>
[Table("cash_out_requests")]
public class CashOutRequest
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    /// <summary>Wallet balance at the time the request was created.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal WalletBalanceAtRequest { get; set; }

    [Required]
    public CashOutStatus Status { get; set; } = CashOutStatus.Pending;

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [MaxLength(500)]
    public string? AdminRemarks { get; set; }

    [Required]
    public DateTime RequestedAt { get; set; }

    [MaxLength(100)]
    public string? RequestedBy { get; set; }

    public DateTime? ActionedAt { get; set; }

    [MaxLength(100)]
    public string? ActionedBy { get; set; }

    /// <summary>
    /// Summary of the entry type written back to the wallet ledger (kept negative).
    /// </summary>
    [MaxLength(20)]
    public string? WalletEntryType { get; set; }

    public Guid? WalletEntryId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
