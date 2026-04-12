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

    public async Task<IEnumerable<AccountResponseDto>> GetAccountsAsync(string? search = null, bool? isActive = null)
    {
        var query = _context.Accounts.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(a => a.Name.Contains(search) || (a.Description != null && a.Description.Contains(search)));
        }

        if (isActive.HasValue)
        {
            query = query.Where(a => a.IsActive == isActive.Value);
        }

        var accounts = await query
            .Include(a => a.Transactions)
            .OrderBy(a => a.Name)
            .ToListAsync();

        return accounts.Select(MapToDto);
    }

    public async Task<AccountResponseDto?> GetAccountByIdAsync(Guid id)
    {
        var account = await _context.Accounts
            .Include(a => a.Transactions)
            .FirstOrDefaultAsync(a => a.Id == id);

        return account == null ? null : MapToDto(account);
    }

    public async Task<AccountResponseDto> CreateAccountAsync(CreateAccountDto dto, string userId)
    {
        if (!Enum.TryParse<AccountType>(dto.AccountType, true, out var accountType))
        {
            throw new ArgumentException("Invalid account type");
        }

        if (await _context.Accounts.AnyAsync(a => a.Name == dto.Name))
        {
            throw new ArgumentException("An account with this name already exists");
        }

        var account = new Account
        {
            Name = dto.Name,
            Description = dto.Description,
            AccountType = accountType,
            Balance = dto.InitialBalance,
            BankName = dto.BankName,
            AccountHolderName = dto.AccountHolderName,
            AccountNumber = dto.AccountNumber,
            RoutingNumber = dto.RoutingNumber,
            SwiftCode = dto.SwiftCode,
            BranchName = dto.BranchName,
            BranchAddress = dto.BranchAddress,
            BankPhone = dto.BankPhone,
            BankEmail = dto.BankEmail,
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
        if (!string.IsNullOrWhiteSpace(dto.AccountType) && Enum.TryParse<AccountType>(dto.AccountType, true, out var accountType))
        {
            account.AccountType = accountType;
        }
        if (dto.IsActive.HasValue) account.IsActive = dto.IsActive.Value;
        if (dto.BankName != null) account.BankName = dto.BankName;
        if (dto.AccountHolderName != null) account.AccountHolderName = dto.AccountHolderName;
        if (dto.AccountNumber != null) account.AccountNumber = dto.AccountNumber;
        if (dto.RoutingNumber != null) account.RoutingNumber = dto.RoutingNumber;
        if (dto.SwiftCode != null) account.SwiftCode = dto.SwiftCode;
        if (dto.BranchName != null) account.BranchName = dto.BranchName;
        if (dto.BranchAddress != null) account.BranchAddress = dto.BranchAddress;
        if (dto.BankPhone != null) account.BankPhone = dto.BankPhone;
        if (dto.BankEmail != null) account.BankEmail = dto.BankEmail;
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
            Balance = a.Balance,
            BankName = a.BankName,
            AccountHolderName = a.AccountHolderName,
            AccountNumber = a.AccountNumber,
            RoutingNumber = a.RoutingNumber,
            SwiftCode = a.SwiftCode,
            BranchName = a.BranchName,
            BranchAddress = a.BranchAddress,
            BankPhone = a.BankPhone,
            BankEmail = a.BankEmail,
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
}
