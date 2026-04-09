using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public class InvestmentService : IInvestmentService
{
    private readonly AppDbContext _context;

    public InvestmentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<InvestmentResponseDto>> GetInvestmentsAsync(InvestmentType? type = null)
    {
        var query = _context.Investments.AsQueryable();

        if (type.HasValue)
        {
            query = query.Where(i => i.Type == type.Value);
        }

        var investments = await query
            .Include(i => i.MemberInvestments)
                .ThenInclude(mi => mi.Member)
            .OrderByDescending(i => i.DateInvested)
            .ToListAsync();

        return investments.Select(MapToDto);
    }

    public async Task<InvestmentResponseDto?> GetInvestmentByIdAsync(Guid id)
    {
        var investment = await _context.Investments
            .Include(i => i.MemberInvestments)
                .ThenInclude(mi => mi.Member)
            .FirstOrDefaultAsync(i => i.Id == id);

        return investment == null ? null : MapToDto(investment);
    }

    public async Task<InvestmentResponseDto> CreateInvestmentAsync(CreateInvestmentDto dto)
    {
        var investment = new Investment
        {
            Name = dto.Name,
            Description = dto.Description,
            Type = dto.Type,
            PrincipalAmount = dto.PrincipalAmount,
            CurrentValue = dto.CurrentValue,
            DateInvested = dto.DateInvested
        };

        _context.Investments.Add(investment);
        await _context.SaveChangesAsync();

        if (dto.MemberIds != null && dto.MemberIds.Any())
        {
            var sharePercentage = 100m / dto.MemberIds.Count;
            foreach (var memberId in dto.MemberIds)
            {
                var memberInvestment = new MemberInvestment
                {
                    MemberId = memberId,
                    InvestmentId = investment.Id,
                    SharePercentage = sharePercentage,
                    ShareValue = (dto.CurrentValue * sharePercentage) / 100
                };
                _context.MemberInvestments.Add(memberInvestment);
            }
            await _context.SaveChangesAsync();
        }

        return (await GetInvestmentByIdAsync(investment.Id))!;
    }

    public async Task<InvestmentResponseDto?> UpdateInvestmentAsync(Guid id, UpdateInvestmentDto dto)
    {
        var investment = await _context.Investments.FindAsync(id);
        if (investment == null) return null;

        if (!string.IsNullOrWhiteSpace(dto.Name))
            investment.Name = dto.Name;
        if (!string.IsNullOrWhiteSpace(dto.Description))
            investment.Description = dto.Description;
        if (dto.Type.HasValue)
            investment.Type = dto.Type.Value;
        if (dto.PrincipalAmount.HasValue)
            investment.PrincipalAmount = dto.PrincipalAmount.Value;
        if (dto.CurrentValue.HasValue)
            investment.CurrentValue = dto.CurrentValue.Value;
        if (dto.DateInvested.HasValue)
            investment.DateInvested = dto.DateInvested.Value;

        investment.UpdatedAt = DateTime.UtcNow;

        var memberInvestments = await _context.MemberInvestments
            .Where(mi => mi.InvestmentId == id)
            .ToListAsync();

        foreach (var mi in memberInvestments)
        {
            mi.ShareValue = (investment.CurrentValue * mi.SharePercentage) / 100;
        }

        await _context.SaveChangesAsync();

        return await GetInvestmentByIdAsync(id);
    }

    public async Task<bool> DeleteInvestmentAsync(Guid id)
    {
        var investment = await _context.Investments.FindAsync(id);
        if (investment == null) return false;

        var memberInvestments = await _context.MemberInvestments
            .Where(mi => mi.InvestmentId == id)
            .ToListAsync();
        _context.MemberInvestments.RemoveRange(memberInvestments);

        _context.Investments.Remove(investment);
        await _context.SaveChangesAsync();
        return true;
    }

    private static InvestmentResponseDto MapToDto(Investment investment)
    {
        var returnAmount = investment.CurrentValue - investment.PrincipalAmount;
        var returnPercentage = investment.PrincipalAmount > 0
            ? (returnAmount / investment.PrincipalAmount) * 100
            : 0;

        return new InvestmentResponseDto
        {
            Id = investment.Id,
            Name = investment.Name,
            Description = investment.Description,
            Type = investment.Type.ToString(),
            PrincipalAmount = investment.PrincipalAmount,
            CurrentValue = investment.CurrentValue,
            ReturnAmount = returnAmount,
            ReturnPercentage = returnPercentage,
            DateInvested = investment.DateInvested,
            CreatedAt = investment.CreatedAt,
            Members = investment.MemberInvestments.Select(mi => new MemberInvestmentDto
            {
                MemberId = mi.MemberId,
                MemberName = mi.Member?.Name ?? "Unknown",
                SharePercentage = mi.SharePercentage,
                ShareValue = mi.ShareValue
            }).ToList()
        };
    }
}
