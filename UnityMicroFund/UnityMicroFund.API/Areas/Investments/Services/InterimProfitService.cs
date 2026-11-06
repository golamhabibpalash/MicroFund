using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public class InterimProfitService : IInterimProfitService
{
    private readonly AppDbContext _context;

    public InterimProfitService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<InterimProfitDto> CreateAsync(
        Guid investmentId, CreateInterimProfitDto dto, string? createdBy, CancellationToken cancellationToken = default)
    {
        var investment = await _context.Investments
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (investment.Status is not (InvestmentStatus.Active or InvestmentStatus.OpenForSubscription))
        {
            throw new ValidationException(
                $"Interim profit can only be recorded for a project that is OpenForSubscription or Active " +
                $"(current status: {investment.Status}).");
        }

        var entry = new InvestmentInterimProfit
        {
            Id = Guid.NewGuid(),
            InvestmentId = investmentId,
            Amount = dto.Amount,
            ProfitDate = dto.ProfitDate,
            Remarks = dto.Remarks,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.InvestmentInterimProfits.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);

        return ToDto(entry);
    }

    public async Task<IReadOnlyList<InterimProfitDto>> GetForInvestmentAsync(
        Guid investmentId, CancellationToken cancellationToken = default)
    {
        return await _context.InvestmentInterimProfits
            .AsNoTracking()
            .Where(p => p.InvestmentId == investmentId)
            .OrderByDescending(p => p.ProfitDate)
            .ThenByDescending(p => p.CreatedAt)
            .Select(p => new InterimProfitDto
            {
                Id = p.Id,
                InvestmentId = p.InvestmentId,
                Amount = p.Amount,
                ProfitDate = p.ProfitDate,
                Remarks = p.Remarks,
                CreatedBy = p.CreatedBy,
                CreatedAt = p.CreatedAt,
                ProfitDistributionId = p.ProfitDistributionId
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(
        Guid investmentId, Guid id, CancellationToken cancellationToken = default)
    {
        var entry = await _context.InvestmentInterimProfits
            .FirstOrDefaultAsync(p => p.Id == id && p.InvestmentId == investmentId, cancellationToken);

        if (entry == null)
        {
            return false;
        }

        if (entry.ProfitDistributionId.HasValue)
        {
            throw new ValidationException(
                "This income has already been distributed to shareholders and can no longer be removed.");
        }

        var investment = await _context.Investments
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == investmentId, cancellationToken);

        if (investment != null && investment.Status is not (InvestmentStatus.Active or InvestmentStatus.OpenForSubscription))
        {
            throw new ValidationException(
                $"Income can no longer be changed: the project is {InvestmentRecordLock.Describe(investment.Status)}.");
        }

        _context.InvestmentInterimProfits.Remove(entry);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static InterimProfitDto ToDto(InvestmentInterimProfit p) => new()
    {
        Id = p.Id,
        InvestmentId = p.InvestmentId,
        Amount = p.Amount,
        ProfitDate = p.ProfitDate,
        Remarks = p.Remarks,
        CreatedBy = p.CreatedBy,
        CreatedAt = p.CreatedAt,
        ProfitDistributionId = p.ProfitDistributionId
    };
}
