using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

[Table("accounts")]
public class Account
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public AccountType AccountType { get; set; }

    /// <summary>Chart-of-accounts code, unique across all accounts. Generated when omitted.</summary>
    [MaxLength(20)]
    public string? Code { get; set; }

    /// <summary>Accounting category used by the balance sheet and income statement.</summary>
    [Required]
    public AccountCategory Category { get; set; } = AccountCategory.Asset;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Balance { get; set; }

    [MaxLength(100)]
    public string? BankName { get; set; }

    [MaxLength(100)]
    public string? AccountHolderName { get; set; }

    [MaxLength(50)]
    public string? AccountNumber { get; set; }

    [MaxLength(50)]
    public string? RoutingNumber { get; set; }

    [MaxLength(20)]
    public string? SwiftCode { get; set; }

    [MaxLength(100)]
    public string? BranchName { get; set; }

    [MaxLength(500)]
    public string? BranchAddress { get; set; }

    [MaxLength(50)]
    public string? Iban { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
