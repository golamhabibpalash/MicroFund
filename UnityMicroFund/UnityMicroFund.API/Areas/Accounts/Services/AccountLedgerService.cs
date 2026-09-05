using System.Data;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Accounts.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Accounts.Services;

/// <summary>
/// Manual expense / income entries against an account. Each write mutates the
/// account's stored balance (expense subtracts, income adds) inside a serializable
/// transaction, and edits/deletes reverse the previous effect first.
/// </summary>
public class AccountLedgerService : IAccountLedgerService
{
    private readonly AppDbContext _context;

    public AccountLedgerService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AccountLedgerEntryDto> CreateAsync(
        CreateAccountLedgerEntryDto dto, string? createdBy, CancellationToken cancellationToken = default)
    {
        var direction = ParseDirection(dto.Direction);

        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == dto.AccountId, cancellationToken)
            ?? throw new NotFoundException("Account not found.");

        if (!account.IsActive)
        {
            throw new ValidationException("Cannot record an entry against an inactive account.");
        }

        var entry = new AccountLedgerEntry
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            Direction = direction,
            Category = dto.Category.Trim(),
            Amount = dto.Amount,
            EntryDate = dto.EntryDate ?? DateTime.UtcNow,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        ApplyToBalance(account, direction, dto.Amount);
        _context.AccountLedgerEntries.Add(entry);

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return ToDto(entry, account.Name);
    }

    public async Task<IReadOnlyList<AccountLedgerEntryDto>> GetAsync(
        AccountEntryDirection? direction = null,
        Guid? accountId = null,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AccountLedgerEntries.AsNoTracking();

        if (direction.HasValue) query = query.Where(e => e.Direction == direction.Value);
        if (accountId.HasValue) query = query.Where(e => e.AccountId == accountId.Value);
        if (from.HasValue) query = query.Where(e => e.EntryDate >= from.Value);
        if (to.HasValue) query = query.Where(e => e.EntryDate <= to.Value);

        return await query
            .OrderByDescending(e => e.EntryDate)
            .ThenByDescending(e => e.CreatedAt)
            .Select(e => new AccountLedgerEntryDto
            {
                Id = e.Id,
                AccountId = e.AccountId,
                AccountName = e.Account!.Name,
                Direction = e.Direction.ToString(),
                Category = e.Category,
                Amount = e.Amount,
                EntryDate = e.EntryDate,
                Notes = e.Notes,
                CreatedBy = e.CreatedBy,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<AccountLedgerEntryDto?> UpdateAsync(
        Guid id, UpdateAccountLedgerEntryDto dto, CancellationToken cancellationToken = default)
    {
        var newDirection = ParseDirection(dto.Direction);

        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var entry = await _context.AccountLedgerEntries
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (entry == null) return null;

        var oldAccount = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == entry.AccountId, cancellationToken)
            ?? throw new NotFoundException("Account not found.");

        var newAccount = entry.AccountId == dto.AccountId
            ? oldAccount
            : await _context.Accounts.FirstOrDefaultAsync(a => a.Id == dto.AccountId, cancellationToken)
              ?? throw new NotFoundException("Account not found.");

        if (!newAccount.IsActive)
        {
            throw new ValidationException("Cannot record an entry against an inactive account.");
        }

        // Reverse the old effect, then apply the new one (guard runs against the
        // account state after the reversal).
        ReverseFromBalance(oldAccount, entry.Direction, entry.Amount);
        ApplyToBalance(newAccount, newDirection, dto.Amount);

        entry.AccountId = newAccount.Id;
        entry.Direction = newDirection;
        entry.Category = dto.Category.Trim();
        entry.Amount = dto.Amount;
        if (dto.EntryDate.HasValue) entry.EntryDate = dto.EntryDate.Value;
        entry.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return ToDto(entry, newAccount.Name);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var entry = await _context.AccountLedgerEntries
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (entry == null) return false;

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == entry.AccountId, cancellationToken);
        if (account != null)
        {
            ReverseFromBalance(account, entry.Direction, entry.Amount);
        }

        _context.AccountLedgerEntries.Remove(entry);
        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<AccountsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var totalAccounts = await _context.Accounts.CountAsync(cancellationToken);
        var activeAccounts = await _context.Accounts.CountAsync(a => a.IsActive, cancellationToken);

        var totalBalance = await _context.Accounts
            .SumAsync(a => (decimal?)a.Balance, cancellationToken) ?? 0m;

        // "Total Pool Amount" = funding by all members = sum of approved Fund transactions.
        var totalPoolAmount = await _context.Transactions
            .Where(t => t.Status == TransactionStatus.Fund
                        && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .SumAsync(t => (decimal?)t.Amount, cancellationToken) ?? 0m;

        // NetProfit is only stamped when a project's profit is distributed, so this is
        // "net profit of settled projects".
        var totalInvestmentNetProfit = await _context.Investments
            .Where(i => i.NetProfit != null)
            .SumAsync(i => i.NetProfit, cancellationToken) ?? 0m;

        var totalExpenses = await _context.AccountLedgerEntries
            .Where(e => e.Direction == AccountEntryDirection.Expense)
            .SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;

        var totalOtherIncome = await _context.AccountLedgerEntries
            .Where(e => e.Direction == AccountEntryDirection.Income)
            .SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;

        // AvailableBalance = funding + profits - cost (expenses).
        var availableBalance = totalPoolAmount + totalInvestmentNetProfit - totalExpenses;

        return new AccountsSummaryDto
        {
            TotalAccounts = totalAccounts,
            ActiveAccounts = activeAccounts,
            TotalBalance = totalBalance,
            TotalPoolAmount = totalPoolAmount,
            TotalInvestmentNetProfit = totalInvestmentNetProfit,
            TotalExpenses = totalExpenses,
            TotalOtherIncome = totalOtherIncome,
            AvailableBalance = availableBalance
        };
    }

    // ---- helpers ---------------------------------------------------------

    private static void ApplyToBalance(Account account, AccountEntryDirection direction, decimal amount)
    {
        if (direction == AccountEntryDirection.Expense)
        {
            if (amount > account.Balance)
            {
                throw new ValidationException(
                    $"This expense of {amount:N2} is more than the {account.Balance:N2} available in " +
                    $"\"{account.Name}\".");
            }
            account.Balance -= amount;
        }
        else
        {
            account.Balance += amount;
        }
        account.UpdatedAt = DateTime.UtcNow;
    }

    private static void ReverseFromBalance(Account account, AccountEntryDirection direction, decimal amount)
    {
        if (direction == AccountEntryDirection.Expense)
        {
            account.Balance += amount;
        }
        else
        {
            account.Balance -= amount;
        }
        account.UpdatedAt = DateTime.UtcNow;
    }

    private static AccountEntryDirection ParseDirection(string? value)
    {
        if (Enum.TryParse<AccountEntryDirection>(value, ignoreCase: true, out var parsed) && Enum.IsDefined(parsed))
        {
            return parsed;
        }

        throw new ValidationException("Entry type must be 'Expense' or 'Income'.");
    }

    private static AccountLedgerEntryDto ToDto(AccountLedgerEntry e, string accountName) => new()
    {
        Id = e.Id,
        AccountId = e.AccountId,
        AccountName = accountName,
        Direction = e.Direction.ToString(),
        Category = e.Category,
        Amount = e.Amount,
        EntryDate = e.EntryDate,
        Notes = e.Notes,
        CreatedBy = e.CreatedBy,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };
}
