using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public class ProjectCostService : IProjectCostService
{
    private readonly AppDbContext _context;

    public ProjectCostService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Costs are editable while the project is still OpenForSubscription or Active. Once
    /// the project is Completed (let alone distributed/closed) the gross result has been
    /// committed to, so the cost set must be frozen to keep the settlement stable.
    /// </summary>
    private async Task GuardEditableAsync(Guid investmentId, CancellationToken cancellationToken)
    {
        var status = await _context.Investments
            .AsNoTracking()
            .Where(i => i.Id == investmentId)
            .Select(i => (InvestmentStatus?)i.Status)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Investment not found.");

        if (status is not (InvestmentStatus.OpenForSubscription or InvestmentStatus.Active))
        {
            throw new ValidationException(
                $"Project costs can only be edited while the project is OpenForSubscription or Active " +
                $"(current status: {status}).");
        }
    }

    public async Task<InvestmentProjectCostDto> CreateAsync(
        Guid investmentId, CreateProjectCostDto dto, string? createdBy, CancellationToken cancellationToken = default)
    {
        await GuardEditableAsync(investmentId, cancellationToken);

        var entry = new InvestmentProjectCost
        {
            Id = Guid.NewGuid(),
            InvestmentId = investmentId,
            Title = dto.Title,
            Amount = dto.Amount,
            Remarks = dto.Remarks,
            CostDate = dto.CostDate ?? DateTime.UtcNow,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.InvestmentProjectCosts.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);

        return ToDto(entry);
    }

    public async Task<IReadOnlyList<InvestmentProjectCostDto>> GetForInvestmentAsync(
        Guid investmentId, CancellationToken cancellationToken = default)
    {
        return await _context.InvestmentProjectCosts
            .AsNoTracking()
            .Where(pc => pc.InvestmentId == investmentId)
            .OrderByDescending(pc => pc.CostDate)
            .ThenByDescending(pc => pc.CreatedAt)
            .Select(pc => new InvestmentProjectCostDto
            {
                Id = pc.Id,
                InvestmentId = pc.InvestmentId,
                Title = pc.Title,
                Amount = pc.Amount,
                Remarks = pc.Remarks,
                CostDate = pc.CostDate,
                CreatedBy = pc.CreatedBy,
                CreatedAt = pc.CreatedAt,
                UpdatedAt = pc.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<InvestmentProjectCostDto?> UpdateAsync(
        Guid investmentId, Guid id, UpdateProjectCostDto dto, string? updatedBy, CancellationToken cancellationToken = default)
    {
        await GuardEditableAsync(investmentId, cancellationToken);

        var entry = await _context.InvestmentProjectCosts
            .FirstOrDefaultAsync(pc => pc.Id == id && pc.InvestmentId == investmentId, cancellationToken);

        if (entry == null)
        {
            return null;
        }

        entry.Title = dto.Title;
        entry.Amount = dto.Amount;
        entry.Remarks = dto.Remarks;
        if (dto.CostDate.HasValue)
            entry.CostDate = dto.CostDate.Value;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return ToDto(entry);
    }

    public async Task<bool> DeleteAsync(
        Guid investmentId, Guid id, CancellationToken cancellationToken = default)
    {
        var entry = await _context.InvestmentProjectCosts
            .FirstOrDefaultAsync(pc => pc.Id == id && pc.InvestmentId == investmentId, cancellationToken);

        if (entry == null)
        {
            return false;
        }

        await GuardEditableAsync(investmentId, cancellationToken);

        _context.InvestmentProjectCosts.Remove(entry);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static InvestmentProjectCostDto ToDto(InvestmentProjectCost pc) => new()
    {
        Id = pc.Id,
        InvestmentId = pc.InvestmentId,
        Title = pc.Title,
        Amount = pc.Amount,
        Remarks = pc.Remarks,
        CostDate = pc.CostDate,
        CreatedBy = pc.CreatedBy,
        CreatedAt = pc.CreatedAt,
        UpdatedAt = pc.UpdatedAt
    };
}
