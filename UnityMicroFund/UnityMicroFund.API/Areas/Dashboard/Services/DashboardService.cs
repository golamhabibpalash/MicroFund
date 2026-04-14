using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Dashboard.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Dashboard.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;

    public DashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var totalPool = await _context.Contributions
            .Where(c => c.Status == ContributionStatus.Paid)
            .SumAsync(c => c.Amount);

        var totalAccountsBalance = await _context.Accounts
            .Where(a => a.IsActive)
            .SumAsync(a => a.Balance);

        totalPool += totalAccountsBalance;

        var totalMembers = await _context.Members.CountAsync(m => m.IsActive);

        var currentMonth = DateTime.UtcNow.ToString("MMMM");
        var currentYear = DateTime.UtcNow.Year;

        var monthlyTotal = await _context.Contributions
            .Where(c => c.Month == currentMonth && c.Year == currentYear)
            .SumAsync(c => c.Amount);

        var contributionsThisMonth = await _context.Contributions
            .Where(c => c.Month == currentMonth && c.Year == currentYear)
            .CountAsync();

        var activeInvestments = await _context.Investments.CountAsync();

        var totalPrincipal = await _context.Investments.SumAsync(i => i.PrincipalAmount);
        var totalCurrentValue = await _context.Investments.SumAsync(i => i.CurrentValue);
        var totalReturns = totalCurrentValue - totalPrincipal;
        var returnPercentage = totalPrincipal > 0 ? (totalReturns / totalPrincipal) * 100 : 0;

        var pendingContributions = await _context.Contributions
            .CountAsync(c => c.Status == ContributionStatus.Pending || c.Status == ContributionStatus.Overdue);

        var averageContribution = totalMembers > 0 ? monthlyTotal / totalMembers : 0;

        var recentContributions = await _context.Contributions
            .Include(c => c.Member)
            .Where(c => c.Status == ContributionStatus.Paid)
            .OrderByDescending(c => c.PaidDate)
            .Take(5)
            .Select(c => new RecentActivityDto
            {
                Type = "Contribution",
                Description = $"Monthly contribution for {c.Month}",
                MemberName = c.Member != null ? c.Member.Name : "Unknown",
                Amount = c.Amount,
                Date = c.PaidDate ?? DateTime.UtcNow
            })
            .ToListAsync();

        var recentInvestments = await _context.Investments
            .OrderByDescending(i => i.DateInvested)
            .Take(3)
            .Select(i => new RecentActivityDto
            {
                Type = "Investment",
                Description = i.Name,
                MemberName = i.Type.ToString(),
                Amount = i.PrincipalAmount,
                Date = i.DateInvested
            })
            .ToListAsync();

        var recentActivities = recentContributions
            .Concat(recentInvestments)
            .OrderByDescending(a => a.Date)
            .Take(8)
            .ToList();

        var topInvestors = await _context.Members
            .Where(m => m.IsActive)
            .ToListAsync();

        var topInvestorDtos = topInvestors
            .Select(m =>
            {
                var totalContrib = _context.Contributions
                    .Where(c => c.MemberId == m.Id && c.Status == ContributionStatus.Paid)
                    .Sum(c => c.Amount);
                return new TopInvestorDto
                {
                    MemberName = m.Name,
                    TotalContributions = totalContrib,
                    SharePercentage = totalPool > 0 ? totalContrib / totalPool * 100 : 0
                };
            })
            .OrderByDescending(t => t.TotalContributions)
            .Take(5)
            .ToList();

        var monthlyTrend = new MonthlyTrendDto();
        for (int i = 5; i >= 0; i--)
        {
            var date = DateTime.UtcNow.AddMonths(-i);
            var monthName = date.ToString("MMM");
            var year = date.Year;

            monthlyTrend.Labels.Add(monthName);
            monthlyTrend.Contributions.Add(await _context.Contributions
                .Where(c => c.Month == date.ToString("MMMM") && c.Year == year && c.Status == ContributionStatus.Paid)
                .SumAsync(c => c.Amount));
        }

        return new DashboardStatsDto
        {
            TotalPoolAmount = totalPool,
            TotalMembersCount = totalMembers,
            MonthlyContributionTotal = monthlyTotal,
            ActiveInvestmentsCount = activeInvestments,
            TotalReturns = totalReturns,
            ReturnPercentage = returnPercentage,
            PendingContributions = pendingContributions,
            AverageContribution = averageContribution,
            TotalInvested = totalPrincipal,
            ContributionsThisMonth = contributionsThisMonth,
            RecentActivities = recentActivities,
            TopInvestors = topInvestorDtos,
            MonthlyTrend = monthlyTrend
        };
    }
}
