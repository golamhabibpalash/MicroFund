using System.ComponentModel.DataAnnotations;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Accounts.DTOs;

public class CreateAccountDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public string AccountType { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal InitialBalance { get; set; }

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

    [MaxLength(100)]
    public string? BankPhone { get; set; }

    [MaxLength(100)]
    public string? BankEmail { get; set; }

    [MaxLength(50)]
    public string? Iban { get; set; }
}

public class UpdateAccountDto
{
    [MaxLength(100)]
    public string? Name { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public string? AccountType { get; set; }

    public bool? IsActive { get; set; }

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

    [MaxLength(100)]
    public string? BankPhone { get; set; }

    [MaxLength(100)]
    public string? BankEmail { get; set; }

    [MaxLength(50)]
    public string? Iban { get; set; }
}

public class AccountResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string AccountType { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public string? BankName { get; set; }
    public string? AccountHolderName { get; set; }
    public string? AccountNumber { get; set; }
    public string? RoutingNumber { get; set; }
    public string? SwiftCode { get; set; }
    public string? BranchName { get; set; }
    public string? BranchAddress { get; set; }
    public string? BankPhone { get; set; }
    public string? BankEmail { get; set; }
    public string? Iban { get; set; }
    public bool IsActive { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public decimal TotalFunded { get; set; }
    public decimal TotalRefunded { get; set; }
    public int TransactionCount { get; set; }
}
