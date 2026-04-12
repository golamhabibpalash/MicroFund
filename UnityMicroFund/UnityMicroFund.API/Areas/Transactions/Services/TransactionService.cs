using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Transactions.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Transactions.Services;

public class TransactionService : ITransactionService
{
    private readonly AppDbContext _context;

    public TransactionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TransactionResponseDto>> GetTransactionsAsync(TransactionFilterDto filter)
    {
        var query = _context.Transactions
            .Include(t => t.TransferBy)
            .Include(t => t.CreatedBy)
            .Include(t => t.ApprovedByUser)
            .Include(t => t.Account)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            query = query.Where(t =>
                t.RefNo.Contains(filter.Search) ||
                t.TransferFor.Contains(filter.Search) ||
                (t.Remarks != null && t.Remarks.Contains(filter.Search)));
        }

        if (filter.AccountId.HasValue)
        {
            query = query.Where(t => t.AccountId == filter.AccountId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<TransactionStatus>(filter.Status, true, out var status))
        {
            query = query.Where(t => t.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.ApprovalStatus) && Enum.TryParse<TransactionApprovalStatus>(filter.ApprovalStatus, true, out var approvalStatus))
        {
            query = query.Where(t => t.ApprovalStatus == approvalStatus);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt <= filter.ToDate.Value);
        }

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return transactions.Select(MapToDto);
    }

    public async Task<TransactionResponseDto?> GetTransactionByIdAsync(Guid id)
    {
        var transaction = await _context.Transactions
            .Include(t => t.TransferBy)
            .Include(t => t.CreatedBy)
            .Include(t => t.ApprovedByUser)
            .Include(t => t.Account)
            .FirstOrDefaultAsync(t => t.Id == id);

        return transaction == null ? null : MapToDto(transaction);
    }

    public async Task<TransactionResponseDto> CreateTransactionAsync(CreateTransactionDto dto, Guid userId)
    {
        if (!Enum.TryParse<TransactionStatus>(dto.Status, true, out var status))
        {
            throw new ArgumentException("Invalid transaction status. Must be 'Fund' or 'Refund'");
        }

        var accountExists = await _context.Accounts.AnyAsync(a => a.Id == dto.AccountId && a.IsActive);
        if (!accountExists)
        {
            throw new ArgumentException("Invalid or inactive account");
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new ArgumentException("User not found");
        }

        var member = await _context.Members.FirstOrDefaultAsync(m => m.UserId == userId);
        if (member == null || !member.IsActive)
        {
            throw new InvalidOperationException("Only approved/active members can create transactions");
        }

        var transaction = new Transaction
        {
            RefNo = await GenerateRefNoAsync(),
            TransferFor = dto.TransferFor,
            Amount = dto.Amount,
            Status = status,
            Remarks = dto.Remarks,
            TransferById = userId,
            CreatedById = userId,
            AccountId = dto.AccountId,
            ApprovalStatus = TransactionApprovalStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        return (await GetTransactionByIdAsync(transaction.Id))!;
    }

    public async Task<TransactionResponseDto?> UpdateTransactionAsync(Guid id, UpdateTransactionDto dto)
    {
        var transaction = await _context.Transactions.FindAsync(id);
        if (transaction == null) return null;

        if (transaction.ApprovalStatus != TransactionApprovalStatus.Pending)
        {
            throw new InvalidOperationException("Cannot update a transaction that has already been processed");
        }

        if (!string.IsNullOrWhiteSpace(dto.TransferFor)) transaction.TransferFor = dto.TransferFor;
        if (dto.Amount.HasValue) transaction.Amount = dto.Amount.Value;
        if (!string.IsNullOrWhiteSpace(dto.Status) && Enum.TryParse<TransactionStatus>(dto.Status, true, out var status))
        {
            transaction.Status = status;
        }
        if (dto.Remarks != null) transaction.Remarks = dto.Remarks;
        if (dto.AccountId.HasValue) transaction.AccountId = dto.AccountId.Value;

        transaction.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetTransactionByIdAsync(id);
    }

    public async Task<TransactionResponseDto?> ApproveTransactionAsync(Guid id, ApproveTransactionDto dto, Guid approvedByUserId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Account)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transaction == null) return null;

        if (transaction.ApprovalStatus != TransactionApprovalStatus.Pending)
        {
            throw new InvalidOperationException("Transaction has already been processed");
        }

        transaction.ApprovalStatus = dto.IsApproved ? TransactionApprovalStatus.Approved : TransactionApprovalStatus.Rejected;
        transaction.ApprovedBy = approvedByUserId;
        transaction.ApprovedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Remarks))
        {
            transaction.Remarks = string.IsNullOrWhiteSpace(transaction.Remarks)
                ? dto.Remarks
                : $"{transaction.Remarks}\n{dto.Remarks}";
        }

        if (dto.IsApproved && transaction.Account != null)
        {
            if (transaction.Status == TransactionStatus.Fund)
            {
                transaction.Account.Balance += transaction.Amount;
            }
            else
            {
                transaction.Account.Balance -= transaction.Amount;
            }
            transaction.Account.UpdatedAt = DateTime.UtcNow;
        }

        transaction.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetTransactionByIdAsync(id);
    }

    public async Task<bool> DeleteTransactionAsync(Guid id)
    {
        var transaction = await _context.Transactions.FindAsync(id);
        if (transaction == null) return false;

        if (transaction.ApprovalStatus == TransactionApprovalStatus.Approved)
        {
            throw new InvalidOperationException("Cannot delete an approved transaction");
        }

        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<string> GenerateRefNoAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"TXN-{year}-";

        var lastTransaction = await _context.Transactions
            .Where(t => t.RefNo.StartsWith(prefix))
            .OrderByDescending(t => t.RefNo)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastTransaction != null)
        {
            var lastNumberStr = lastTransaction.RefNo.Replace(prefix, "");
            if (int.TryParse(lastNumberStr, out var lastNumber))
            {
                nextNumber = lastNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D6}";
    }

    private TransactionResponseDto MapToDto(Transaction t)
    {
        return new TransactionResponseDto
        {
            Id = t.Id,
            RefNo = t.RefNo,
            TransferFor = t.TransferFor,
            Amount = t.Amount,
            Status = t.Status.ToString(),
            ApprovalStatus = t.ApprovalStatus.ToString(),
            Remarks = t.Remarks,
            ApprovedBy = t.ApprovedBy,
            ApprovedByName = t.ApprovedByUser?.Name,
            ApprovedAt = t.ApprovedAt,
            TransferById = t.TransferById,
            TransferByName = t.TransferBy?.Name ?? "Unknown",
            CreatedById = t.CreatedById,
            CreatedByName = t.CreatedBy?.Name ?? "Unknown",
            AccountId = t.AccountId,
            AccountName = t.Account?.Name ?? "Unknown",
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        };
    }
}
