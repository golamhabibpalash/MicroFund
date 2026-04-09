using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Contributions.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Contributions.Services;

public class ContributionService : IContributionService
{
    private readonly AppDbContext _context;

    public ContributionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ContributionSummaryDto> GetContributionsAsync(Guid? memberId = null, int? year = null, string? month = null, ContributionStatus? status = null)
    {
        var query = _context.Contributions
            .Include(c => c.Member)
            .AsQueryable();

        if (memberId.HasValue)
            query = query.Where(c => c.MemberId == memberId.Value);
        if (year.HasValue)
            query = query.Where(c => c.Year == year.Value);
        if (!string.IsNullOrWhiteSpace(month))
            query = query.Where(c => c.Month == month);
        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        var contributions = await query
            .OrderByDescending(c => c.Year)
            .ThenByDescending(c => c.Month)
            .ThenByDescending(c => c.CreatedAt)
            .ToListAsync();

        return new ContributionSummaryDto
        {
            TotalContributions = contributions.Count,
            TotalAmount = contributions.Sum(c => c.Amount),
            PaidCount = contributions.Count(c => c.Status == ContributionStatus.Paid),
            PendingCount = contributions.Count(c => c.Status == ContributionStatus.Pending),
            OverdueCount = contributions.Count(c => c.Status == ContributionStatus.Overdue),
            RecentContributions = contributions.Select(c => new ContributionResponseDto
            {
                Id = c.Id,
                MemberId = c.MemberId,
                MemberName = c.Member?.Name ?? "Unknown",
                Amount = c.Amount,
                Month = c.Month,
                Year = c.Year,
                Status = c.Status.ToString(),
                PaidDate = c.PaidDate,
                CreatedAt = c.CreatedAt
            }).ToList()
        };
    }

    public async Task<ContributionResponseDto?> GetContributionByIdAsync(Guid id)
    {
        var contribution = await _context.Contributions
            .Include(c => c.Member)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (contribution == null) return null;

        return new ContributionResponseDto
        {
            Id = contribution.Id,
            MemberId = contribution.MemberId,
            MemberName = contribution.Member?.Name ?? "Unknown",
            Amount = contribution.Amount,
            Month = contribution.Month,
            Year = contribution.Year,
            Status = contribution.Status.ToString(),
            PaidDate = contribution.PaidDate,
            CreatedAt = contribution.CreatedAt
        };
    }

    public async Task<ContributionResponseDto> CreateContributionAsync(CreateContributionDto dto)
    {
        var memberExists = await _context.Members.AnyAsync(m => m.Id == dto.MemberId);
        if (!memberExists)
        {
            throw new ArgumentException("Member not found");
        }

        var existingContribution = await _context.Contributions
            .FirstOrDefaultAsync(c => c.MemberId == dto.MemberId && c.Month == dto.Month && c.Year == dto.Year);

        if (existingContribution != null)
        {
            throw new ArgumentException("Contribution for this month already exists for this member");
        }

        var contribution = new Contribution
        {
            MemberId = dto.MemberId,
            Amount = dto.Amount,
            Month = dto.Month,
            Year = dto.Year,
            Status = dto.Status
        };

        if (dto.Status == ContributionStatus.Paid)
        {
            contribution.PaidDate = DateTime.UtcNow;
        }

        _context.Contributions.Add(contribution);
        await _context.SaveChangesAsync();

        var member = await _context.Members.FindAsync(dto.MemberId);

        return new ContributionResponseDto
        {
            Id = contribution.Id,
            MemberId = contribution.MemberId,
            MemberName = member?.Name ?? "Unknown",
            Amount = contribution.Amount,
            Month = contribution.Month,
            Year = contribution.Year,
            Status = contribution.Status.ToString(),
            PaidDate = contribution.PaidDate,
            CreatedAt = contribution.CreatedAt
        };
    }

    public async Task<ContributionResponseDto?> UpdateContributionStatusAsync(Guid id, UpdateContributionStatusDto dto)
    {
        var contribution = await _context.Contributions
            .Include(c => c.Member)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (contribution == null) return null;

        contribution.Status = dto.Status;

        if (dto.Status == ContributionStatus.Paid && contribution.PaidDate == null)
        {
            contribution.PaidDate = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new ContributionResponseDto
        {
            Id = contribution.Id,
            MemberId = contribution.MemberId,
            MemberName = contribution.Member?.Name ?? "Unknown",
            Amount = contribution.Amount,
            Month = contribution.Month,
            Year = contribution.Year,
            Status = contribution.Status.ToString(),
            PaidDate = contribution.PaidDate,
            CreatedAt = contribution.CreatedAt
        };
    }

    public async Task<bool> DeleteContributionAsync(Guid id)
    {
        var contribution = await _context.Contributions.FindAsync(id);
        if (contribution == null) return false;

        _context.Contributions.Remove(contribution);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ContributionSummaryDto> GenerateMonthlyContributionsAsync(int? year = null, string? month = null)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var targetMonth = month ?? DateTime.UtcNow.ToString("MMMM");

        var existingContributions = await _context.Contributions
            .Where(c => c.Year == targetYear && c.Month == targetMonth)
            .ToListAsync();

        if (existingContributions.Any())
        {
            throw new InvalidOperationException($"Contributions for {targetMonth} {targetYear} already generated");
        }

        var activeMembers = await _context.Members
            .Where(m => m.IsActive)
            .ToListAsync();

        var contributions = new List<Contribution>();

        foreach (var member in activeMembers)
        {
            var contribution = new Contribution
            {
                MemberId = member.Id,
                Amount = member.MonthlyAmount,
                Month = targetMonth,
                Year = targetYear,
                Status = ContributionStatus.Pending
            };
            contributions.Add(contribution);
        }

        _context.Contributions.AddRange(contributions);
        await _context.SaveChangesAsync();

        return await GetContributionsAsync(year: targetYear, month: targetMonth);
    }
}
