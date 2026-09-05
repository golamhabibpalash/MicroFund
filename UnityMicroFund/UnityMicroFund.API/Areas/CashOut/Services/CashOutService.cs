using System.Data;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.CashOut.DTOs;
using UnityMicroFund.API.Areas.Investments.Services;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.CashOut.Services;

public class CashOutService : ICashOutService
{
    private readonly AppDbContext _context;
    private readonly IWalletService _wallet;

    public CashOutService(AppDbContext context, IWalletService wallet)
    {
        _context = context;
        _wallet = wallet;
    }

    public async Task<CashOutBalanceDto> GetAvailableBalanceAsync(Guid memberId, CancellationToken cancellationToken = default)
    {
        var balance = await _wallet.GetBalanceAsync(memberId, cancellationToken);
        var pending = await _context.CashOutRequests
            .Where(c => c.MemberId == memberId && c.Status == CashOutStatus.Pending)
            .SumAsync(c => (decimal?)c.Amount, cancellationToken) ?? 0m;

        return new CashOutBalanceDto
        {
            Balance = balance,
            Pending = pending,
            Available = balance - pending
        };
    }

    public async Task<IEnumerable<CashOutRequestDto>> GetMemberRequestsAsync(Guid memberId, CancellationToken cancellationToken = default)
    {
        return await BuildQuery()
            .Where(c => c.MemberId == memberId)
            .OrderByDescending(c => c.RequestedAt)
            .Select(c => ToDto(c))
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<CashOutRequestDto>> GetAllRequestsAsync(string? status = null, string? search = null, CancellationToken cancellationToken = default)
    {
        var query = BuildQuery().AsQueryable();

        if (Enum.TryParse<CashOutStatus>(status, true, out var statusValue))
        {
            query = query.Where(c => c.Status == statusValue);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(c =>
                c.Member!.Name.Contains(term) ||
                (c.Member.MemberId != null && c.Member.MemberId.Contains(term)) ||
                (c.Member.Email != null && c.Member.Email.Contains(term)));
        }

        return await query
            .OrderByDescending(c => c.RequestedAt)
            .Select(c => ToDto(c))
            .ToListAsync(cancellationToken);
    }

    public async Task<CashOutRequestDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await BuildQuery()
            .Where(c => c.Id == id)
            .Select(c => ToDto(c))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<CashOutRequestDto> CreateAsync(Guid memberId, CreateCashOutRequestDto dto, string requestedBy, CancellationToken cancellationToken = default)
    {
        if (dto.Amount <= 0)
        {
            throw new ValidationException("Cash-out amount must be greater than zero.");
        }

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.Id == memberId, cancellationToken)
            ?? throw new NotFoundException("Member not found.");

        if (!member.IsActive)
        {
            throw new ValidationException("Inactive members cannot request a cash-out.");
        }

        var available = await GetAvailableBalanceAsync(memberId, cancellationToken);
        if (available.Available < dto.Amount)
        {
            throw new ValidationException(
                $"Insufficient available wallet balance. Required {dto.Amount:N2}, available {available.Available:N2}.");
        }

        var now = DateTime.UtcNow;
        var request = new CashOutRequest
        {
            Id = Guid.NewGuid(),
            MemberId = memberId,
            Amount = dto.Amount,
            WalletBalanceAtRequest = available.Balance,
            Status = CashOutStatus.Pending,
            Remarks = dto.Remarks,
            RequestedAt = now,
            RequestedBy = requestedBy,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.CashOutRequests.Add(request);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(request.Id, cancellationToken))!;
    }

    public async Task<CashOutRequestDto> ApproveAsync(Guid id, string actionedBy, CancellationToken cancellationToken = default)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        var request = await _context.CashOutRequests
            .Include(c => c.Member)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("Cash-out request not found.");

        if (request.Status != CashOutStatus.Pending)
        {
            throw new ValidationException($"Only pending requests can be approved (current status: {request.Status}).");
        }

        // Re-check the current balance in case the member spent it while the request
        // was pending. Never let the wallet go negative.
        var balance = await _wallet.GetBalanceAsync(request.MemberId, cancellationToken);
        if (balance < request.Amount)
        {
            throw new ValidationException(
                $"Wallet balance {balance:N2} is less than the {request.Amount:N2} requested. It may already have been invested.");
        }

        var entry = _wallet.AddEntry(
            request.MemberId, WalletEntryType.Withdrawal, -request.Amount,
            $"Cash-out approved", actionedBy, transactionId: null);

        request.Status = CashOutStatus.Approved;
        request.ActionedAt = DateTime.UtcNow;
        request.ActionedBy = actionedBy;
        request.WalletEntryId = entry.Id;
        request.WalletEntryType = WalletEntryType.Withdrawal.ToString();
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return (await GetByIdAsync(request.Id, cancellationToken))!;
    }

    public async Task<CashOutRequestDto> RejectAsync(Guid id, string? adminRemarks, string actionedBy, CancellationToken cancellationToken = default)
    {
        var request = await _context.CashOutRequests
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("Cash-out request not found.");

        if (request.Status != CashOutStatus.Pending)
        {
            throw new ValidationException($"Only pending requests can be rejected (current status: {request.Status}).");
        }

        request.Status = CashOutStatus.Rejected;
        request.AdminRemarks = adminRemarks;
        request.ActionedAt = DateTime.UtcNow;
        request.ActionedBy = actionedBy;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(request.Id, cancellationToken))!;
    }

    public async Task<bool> CancelAsync(Guid id, Guid memberId, CancellationToken cancellationToken = default)
    {
        var request = await _context.CashOutRequests
            .FirstOrDefaultAsync(c => c.Id == id && c.MemberId == memberId, cancellationToken);
        if (request == null) return false;

        if (request.Status != CashOutStatus.Pending)
        {
            throw new ValidationException("Only pending requests can be cancelled.");
        }

        request.Status = CashOutStatus.Cancelled;
        request.ActionedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<CashOutRequest> BuildQuery()
        => _context.CashOutRequests
            .AsNoTracking()
            .Include(c => c.Member);

    private static CashOutRequestDto ToDto(CashOutRequest c)
        => new()
        {
            Id = c.Id,
            MemberId = c.MemberId,
            MemberName = c.Member!.Name,
            MemberCode = c.Member.MemberId,
            MemberEmail = c.Member.Email,
            Amount = c.Amount,
            Status = c.Status.ToString(),
            WalletBalanceAtRequest = c.WalletBalanceAtRequest,
            Remarks = c.Remarks,
            AdminRemarks = c.AdminRemarks,
            RequestedAt = c.RequestedAt,
            RequestedBy = c.RequestedBy,
            ActionedAt = c.ActionedAt,
            ActionedBy = c.ActionedBy,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        };
}
