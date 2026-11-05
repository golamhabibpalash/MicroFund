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

    /// <summary>Asset, Liability, Equity, Income or Expense. Defaults to Asset.</summary>
    public string? Category { get; set; }

    /// <summary>Optional chart-of-accounts code. Generated automatically when omitted.</summary>
    [MaxLength(20)]
    public string? Code { get; set; }

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

    /// <summary>Asset, Liability, Equity, Income or Expense.</summary>
    public string? Category { get; set; }

    /// <summary>Optional chart-of-accounts code. Omit to keep the current code.</summary>
    [MaxLength(20)]
    public string? Code { get; set; }

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

    [MaxLength(50)]
    public string? Iban { get; set; }
}

public class CreateAccountLedgerEntryDto
{
    [Required(ErrorMessage = "An account is required.")]
    public Guid AccountId { get; set; }

    /// <summary>"Expense" or "Income".</summary>
    [Required(ErrorMessage = "Entry type is required.")]
    public string Direction { get; set; } = string.Empty;

    [Required(ErrorMessage = "A category is required.")]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }

    public DateTime? EntryDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class UpdateAccountLedgerEntryDto
{
    [Required(ErrorMessage = "An account is required.")]
    public Guid AccountId { get; set; }

    [Required(ErrorMessage = "Entry type is required.")]
    public string Direction { get; set; } = string.Empty;

    [Required(ErrorMessage = "A category is required.")]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }

    public DateTime? EntryDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class AccountLedgerEntryDto
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime EntryDate { get; set; }
    public string? Notes { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// Roll-up for the accounts page stat cards. totalPoolAmount = funding by all members
/// (sum of approved Fund transactions). availableBalance = totalPoolAmount +
/// totalInvestmentNetProfit - totalExpenses. totalBalance = sum of all account balances.
/// </summary>
public class AccountsSummaryDto
{
    public int TotalAccounts { get; set; }
    public int ActiveAccounts { get; set; }
    public decimal TotalBalance { get; set; }
    public decimal TotalPoolAmount { get; set; }
    public decimal TotalInvestmentNetProfit { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalOtherIncome { get; set; }
    public decimal AvailableBalance { get; set; }

    /// <summary>Sum of balances of accounts whose category is Asset.</summary>
    public decimal TotalAssetBalance { get; set; }

    /// <summary>Sum of balances of accounts whose category is Liability.</summary>
    public decimal TotalLiabilityBalance { get; set; }

    /// <summary>Sum of balances of accounts whose category is Equity.</summary>
    public decimal TotalEquityBalance { get; set; }

    /// <summary>Sum of balances of accounts whose category is Income.</summary>
    public decimal TotalIncomeBalance { get; set; }

    /// <summary>Sum of balances of accounts whose category is Expense.</summary>
    public decimal TotalExpenseBalance { get; set; }
}

public class AccountResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string AccountType { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string Category { get; set; } = string.Empty;
    public string NormalBalance { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public string? BankName { get; set; }
    public string? AccountHolderName { get; set; }
    public string? AccountNumber { get; set; }
    public string? RoutingNumber { get; set; }
    public string? SwiftCode { get; set; }
    public string? BranchName { get; set; }
    public string? BranchAddress { get; set; }
    public string? Iban { get; set; }
    public bool IsActive { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public decimal TotalFunded { get; set; }
    public decimal TotalRefunded { get; set; }
    public int TransactionCount { get; set; }
}

/// <summary>One line in a financial statement section.</summary>
public class StatementLineDto
{
    public string Label { get; set; } = string.Empty;
    public string? Code { get; set; }
    public decimal Amount { get; set; }
    public string? Detail { get; set; }
}

/// <summary>
/// Derived statement of financial position. Account balances are current (the system
/// does not store historical balance snapshots), so the report is as of "now".
/// </summary>
public class BalanceSheetDto
{
    public DateTime AsOf { get; set; }
    public List<StatementLineDto> Assets { get; set; } = new();
    public decimal TotalAssets { get; set; }
    public List<StatementLineDto> Liabilities { get; set; } = new();
    public decimal TotalLiabilities { get; set; }
    public List<StatementLineDto> Equity { get; set; } = new();
    public decimal TotalEquity { get; set; }
    public decimal TotalLiabilitiesAndEquity { get; set; }
    public bool IsBalanced { get; set; }

    /// <summary>
    /// Current value of non-cancelled investments, shown for information only. It is not
    /// added to assets because the existing cash ledger does not reduce a funding account
    /// when investment shares are purchased; adding both would double count.
    /// </summary>
    public decimal InvestmentsUnderManagement { get; set; }

    public string Note { get; set; } = string.Empty;
}

/// <summary>
/// Derived income statement for a period. Income comes from settled investment profit,
/// maintenance income and the manual income ledger; expenses come from the manual expense
/// ledger. Income/Expense category account balances are not added again to avoid double
/// counting.
/// </summary>
public class IncomeStatementDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public List<StatementLineDto> Income { get; set; } = new();
    public decimal TotalIncome { get; set; }
    public List<StatementLineDto> Expenses { get; set; } = new();
    public decimal TotalExpenses { get; set; }
    public decimal NetIncome { get; set; }
    public string Note { get; set; } = string.Empty;
}
