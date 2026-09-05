using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>Whether a ledger entry takes money out of an account or puts money in.</summary>
public enum AccountEntryDirection
{
    /// <summary>A maintenance cost - banking fees, website, domain, hosting, etc. Reduces the account balance.</summary>
    Expense,

    /// <summary>Extra income - bank interest or another source. Increases the account balance.</summary>
    Income
}

/// <summary>
/// A manual expense or income recorded against an account. Unlike a member
/// transaction it has no approval flow; recording one immediately adjusts the
/// account's stored <see cref="Account.Balance"/> (expense subtracts, income adds),
/// and editing or deleting it reverses that adjustment.
/// </summary>
[Table("account_ledger_entries")]
public class AccountLedgerEntry
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid AccountId { get; set; }

    [ForeignKey(nameof(AccountId))]
    public virtual Account? Account { get; set; }

    [Required]
    public AccountEntryDirection Direction { get; set; }

    /// <summary>Free-text category, e.g. "Hosting", "Bank Interest".</summary>
    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    /// <summary>Always positive; the direction decides the sign applied to the balance.</summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public DateTime EntryDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
