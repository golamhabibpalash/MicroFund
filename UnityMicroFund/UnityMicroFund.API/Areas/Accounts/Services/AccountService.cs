using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Accounts.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Accounts.Services;

public class AccountService : IAccountService
{
    private readonly AppDbContext _context;

    public AccountService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AccountResponseDto>> GetAccountsAsync(
        string? search = null, bool? isActive = null, AccountCategory? category = null)
    {
        var query = _context.Accounts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(a =>
                a.Name.Contains(search) ||
                (a.Code != null && a.Code.Contains(search)) ||
                (a.Description != null && a.Description.Contains(search)));
        }

        if (isActive.HasValue)
        {
            query = query.Where(a => a.IsActive == isActive.Value);
        }

        if (category.HasValue)
        {
            query = query.Where(a => a.Category == category.Value);
        }

        var accounts = await query
            .Include(a => a.Transactions)
            .OrderBy(a => a.Code)
            .ThenBy(a => a.Name)
            .ToListAsync();

        return accounts.Select(MapToDto);
    }

    public async Task<AccountResponseDto?> GetAccountByIdAsync(Guid id)
    {
        var account = await _context.Accounts
            .AsNoTracking()
            .Include(a => a.Transactions)
            .FirstOrDefaultAsync(a => a.Id == id);

        return account == null ? null : MapToDto(account);
    }

    public async Task<AccountResponseDto> CreateAccountAsync(CreateAccountDto dto, string userId)
    {
        if (!Enum.TryParse<AccountType>(dto.AccountType, true, out var accountType)
            || !Enum.IsDefined(accountType))
        {
            throw new ArgumentException("Invalid account type");
        }

        var category = ParseCategory(dto.Category, AccountCategory.Asset);

        if (await _context.Accounts.AnyAsync(a => a.Name == dto.Name))
        {
            throw new ArgumentException("An account with this name already exists");
        }

        var code = string.IsNullOrWhiteSpace(dto.Code)
            ? await GenerateCodeAsync(category)
            : dto.Code.Trim();

        if (await _context.Accounts.AnyAsync(a => a.Code == code))
        {
            throw new ArgumentException("An account with this code already exists");
        }

        var account = new Account
        {
            Name = dto.Name,
            Description = dto.Description,
            AccountType = accountType,
            Category = category,
            Code = code,
            Balance = dto.InitialBalance,
            BankName = dto.BankName,
            AccountHolderName = dto.AccountHolderName,
            AccountNumber = dto.AccountNumber,
            RoutingNumber = dto.RoutingNumber,
            SwiftCode = dto.SwiftCode,
            BranchName = dto.BranchName,
            BranchAddress = dto.BranchAddress,
            Iban = dto.Iban,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        return MapToDto(account);
    }

    public async Task<AccountResponseDto?> UpdateAccountAsync(Guid id, UpdateAccountDto dto)
    {
        var account = await _context.Accounts
            .Include(a => a.Transactions)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (account == null) return null;

        if (!string.IsNullOrWhiteSpace(dto.Name)) account.Name = dto.Name;
        if (dto.Description != null) account.Description = dto.Description;
        if (!string.IsNullOrWhiteSpace(dto.AccountType)
            && Enum.TryParse<AccountType>(dto.AccountType, true, out var accountType)
            && Enum.IsDefined(accountType))
        {
            account.AccountType = accountType;
        }

        if (!string.IsNullOrWhiteSpace(dto.Category))
        {
            account.Category = ParseCategory(dto.Category, account.Category);
        }

        if (!string.IsNullOrWhiteSpace(dto.Code))
        {
            var code = dto.Code.Trim();
            if (await _context.Accounts.AnyAsync(a => a.Id != id && a.Code == code))
            {
                throw new ArgumentException("An account with this code already exists");
            }

            account.Code = code;
        }

        if (dto.IsActive.HasValue) account.IsActive = dto.IsActive.Value;
        if (dto.BankName != null) account.BankName = dto.BankName;
        if (dto.AccountHolderName != null) account.AccountHolderName = dto.AccountHolderName;
        if (dto.AccountNumber != null) account.AccountNumber = dto.AccountNumber;
        if (dto.RoutingNumber != null) account.RoutingNumber = dto.RoutingNumber;
        if (dto.SwiftCode != null) account.SwiftCode = dto.SwiftCode;
        if (dto.BranchName != null) account.BranchName = dto.BranchName;
        if (dto.BranchAddress != null) account.BranchAddress = dto.BranchAddress;
        if (dto.Iban != null) account.Iban = dto.Iban;

        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(account);
    }

    public async Task<bool> DeleteAccountAsync(Guid id)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return false;

        if (await _context.Transactions.AnyAsync(t => t.AccountId == id))
        {
            throw new InvalidOperationException("Cannot delete account with existing transactions");
        }

        if (await _context.AccountLedgerEntries.AnyAsync(e => e.AccountId == id))
        {
            throw new InvalidOperationException("Cannot delete account with recorded expenses or income");
        }

        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateBalanceAsync(Guid accountId, decimal amount, bool isRefund)
    {
        var account = await _context.Accounts.FindAsync(accountId);
        if (account == null) return false;

        if (isRefund)
        {
            account.Balance -= amount;
        }
        else
        {
            account.Balance += amount;
        }

        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    private AccountResponseDto MapToDto(Account a)
    {
        var totalFunded = a.Transactions
            .Where(t => t.Status == TransactionStatus.Fund && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .Sum(t => t.Amount);
        var totalRefunded = a.Transactions
            .Where(t => t.Status == TransactionStatus.Refund && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .Sum(t => t.Amount);

        return new AccountResponseDto
        {
            Id = a.Id,
            Name = a.Name,
            Description = a.Description,
            AccountType = a.AccountType.ToString(),
            Code = a.Code,
            Category = a.Category.ToString(),
            NormalBalance = a.Category is AccountCategory.Asset or AccountCategory.Expense ? "Debit" : "Credit",
            Balance = a.Balance,
            BankName = a.BankName,
            AccountHolderName = a.AccountHolderName,
            AccountNumber = a.AccountNumber,
            RoutingNumber = a.RoutingNumber,
            SwiftCode = a.SwiftCode,
            BranchName = a.BranchName,
            BranchAddress = a.BranchAddress,
            Iban = a.Iban,
            IsActive = a.IsActive,
            CreatedBy = a.CreatedBy,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt,
            TotalFunded = totalFunded,
            TotalRefunded = totalRefunded,
            TransactionCount = a.Transactions.Count
        };
    }

    private static AccountCategory ParseCategory(string? value, AccountCategory fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        if (!Enum.TryParse<AccountCategory>(value, ignoreCase: true, out var category)
            || !Enum.IsDefined(category))
        {
            throw new ArgumentException("Invalid account category. Use Asset, Liability, Equity, Income or Expense.");
        }

        return category;
    }

    private async Task<string> GenerateCodeAsync(AccountCategory category)
    {
        var prefix = category switch
        {
            AccountCategory.Asset => "1",
            AccountCategory.Liability => "2",
            AccountCategory.Equity => "3",
            AccountCategory.Income => "4",
            AccountCategory.Expense => "5",
            _ => "9"
        };

        var codes = await _context.Accounts
            .AsNoTracking()
            .Where(a => a.Code != null && a.Code.StartsWith(prefix))
            .Select(a => a.Code!)
            .ToListAsync();

        var numericCodes = codes
            .Select(c => int.TryParse(c, out var n) ? n : 0)
            .Where(n => n > 0)
            .ToHashSet();

        var baseCode = int.Parse(prefix + "000");
        var next = numericCodes.Count == 0 ? baseCode : numericCodes.Max() + 1;
        while (numericCodes.Contains(next))
        {
            next += 1;
        }

        return next.ToString();
    }
}
