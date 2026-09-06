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
        // "Total Pool Amount" = funding by all members = sum of approved Fund transactions.
        var totalPool = await _context.Transactions
            .Where(t => t.Status == TransactionStatus.Fund
                        && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .SumAsync(t => t.Amount);

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

        // === Recent Activities (from multiple business sources) ===
        const int recentActivityCount = 10;

        // 1. New member registrations
        var newMemberActivities = await _context.Members
            .Where(m => m.IsActive)
            .OrderByDescending(m => m.JoinDate)
            .Take(3)
            .Select(m => new RecentActivityDto
            {
                Type = "New Registration",
                Description = m.Name + " registered as a new member",
                MemberName = m.Name,
                AvatarUrl = m.ProfileImageUrl,
                UserId = m.UserId,
                Date = m.JoinDate
            })
            .ToListAsync();

        // 2. Recent paid contributions
        var contributionActivities = await _context.Contributions
            .Include(c => c.Member)
            .Where(c => c.Status == ContributionStatus.Paid && c.Member != null)
            .OrderByDescending(c => c.PaidDate)
            .Take(4)
            .Select(c => new RecentActivityDto
            {
                Type = "Contribution",
                Description = "Monthly contribution for " + c.Month + " " + c.Year,
                MemberName = c.Member!.Name,
                AvatarUrl = c.Member.ProfileImageUrl,
                UserId = c.Member.UserId,
                Amount = c.Amount,
                Date = c.PaidDate ?? DateTime.UtcNow
            })
            .ToListAsync();

        // 3. Recent approved/rejected transactions
        var transactionActivities = await _context.Transactions
            .Include(t => t.MemberTransactionMaps)
                .ThenInclude(mtm => mtm.Member)
            .Where(t => t.ApprovalStatus != TransactionApprovalStatus.Pending
                        && t.MemberTransactionMaps.Any(mtm => mtm.Member != null))
            .OrderByDescending(t => t.CreatedAt)
            .Take(4)
            .Select(t => new RecentActivityDto
            {
                Type = t.ApprovalStatus == TransactionApprovalStatus.Approved
                    ? "Transaction Approved" : "Transaction Rejected",
                Description = "Transaction " + t.TransactionId + " was "
                    + (t.ApprovalStatus == TransactionApprovalStatus.Approved ? "approved" : "rejected"),
                MemberName = t.MemberTransactionMaps
                    .Select(mtm => mtm.Member!.Name).FirstOrDefault() ?? "Unknown",
                AvatarUrl = t.MemberTransactionMaps
                    .Select(mtm => mtm.Member!.ProfileImageUrl).FirstOrDefault(),
                UserId = t.MemberTransactionMaps
                    .Select(mtm => mtm.Member!.UserId).FirstOrDefault(),
                Amount = t.Amount,
                Date = t.CreatedAt
            })
            .ToListAsync();

        // 4. Recent member investments
        var investmentActivities = await _context.MemberInvestments
            .Include(mi => mi.Member)
            .Include(mi => mi.Investment)
            .Where(mi => mi.Member != null && mi.Investment != null)
            .OrderByDescending(mi => mi.CreatedAt)
            .Take(3)
            .Select(mi => new RecentActivityDto
            {
                Type = "Investment",
                Description = "Invested in " + mi.Investment!.Name,
                MemberName = mi.Member!.Name,
                AvatarUrl = mi.Member.ProfileImageUrl,
                UserId = mi.Member.UserId,
                Amount = mi.ShareValue,
                Date = mi.CreatedAt
            })
            .ToListAsync();

        var recentActivities = newMemberActivities
            .Concat(contributionActivities)
            .Concat(transactionActivities)
            .Concat(investmentActivities)
            .OrderByDescending(a => a.Date)
            .Take(recentActivityCount)
            .ToList();

        // === Top Investors and Top Funding ===
        //
        // Funding and Investing are two SEPARATE financial activities and must never be
        // combined here:
        //   * Funding  = money a member pays into the pool. Source of truth: approved
        //                Fund transactions linked to the member via MemberTransactionMaps.
        //   * Investing = capital a member commits to purchase investment shares. Source
        //                of truth: MemberInvestment.AmountInvested (the per-member holding
        //                rollup kept in step with the immutable ShareSubscription history).
        //                NOT ShareValue, which tracks current/appreciated value.
        const int topRankCount = 10;

        // --- Top Investors: investing amount only ---
        var investorRows = await _context.Members
            .Where(m => m.IsActive)
            .Select(m => new
            {
                m.Name,
                m.ProfileImageUrl,
                InvestmentAmount = m.MemberInvestments.Sum(mi => (decimal?)mi.AmountInvested) ?? 0,
                InvestmentCount = m.MemberInvestments.Count(),
                LatestDate = m.MemberInvestments.Max(mi => (DateTime?)mi.CreatedAt)
            })
            .Where(x => x.InvestmentAmount > 0)
            .OrderByDescending(x => x.InvestmentAmount)
            .ThenByDescending(x => x.InvestmentCount)
            .ThenBy(x => x.Name)
            .Take(topRankCount)
            .ToListAsync();

        var totalInvestedAllMembers = await _context.MemberInvestments
            .SumAsync(mi => (decimal?)mi.AmountInvested) ?? 0;

        var topInvestorDtos = investorRows
            .Select((x, index) => new TopInvestorDto
            {
                MemberName = x.Name,
                AvatarUrl = x.ProfileImageUrl,
                InvestmentAmount = x.InvestmentAmount,
                SharePercentage = totalInvestedAllMembers > 0
                    ? x.InvestmentAmount / totalInvestedAllMembers * 100 : 0,
                TransactionCount = x.InvestmentCount,
                LatestDate = x.LatestDate ?? DateTime.MinValue,
                Rank = index + 1
            })
            .ToList();

        // --- Top Funding: funding amount only ---
        var fundingRows = await _context.Members
            .Where(m => m.IsActive)
            .Select(m => new
            {
                m.Name,
                m.ProfileImageUrl,
                FundingAmount = m.MemberTransactionMaps
                    .Where(mtm => mtm.Transaction != null
                                  && mtm.Transaction.Status == TransactionStatus.Fund
                                  && mtm.Transaction.ApprovalStatus == TransactionApprovalStatus.Approved)
                    .Sum(mtm => (decimal?)mtm.Transaction!.Amount) ?? 0,
                FundingCount = m.MemberTransactionMaps
                    .Count(mtm => mtm.Transaction != null
                                  && mtm.Transaction.Status == TransactionStatus.Fund
                                  && mtm.Transaction.ApprovalStatus == TransactionApprovalStatus.Approved),
                LatestDate = m.MemberTransactionMaps
                    .Where(mtm => mtm.Transaction != null
                                  && mtm.Transaction.Status == TransactionStatus.Fund
                                  && mtm.Transaction.ApprovalStatus == TransactionApprovalStatus.Approved)
                    .Max(mtm => (DateTime?)(mtm.Transaction!.TransactionDate ?? mtm.Transaction.CreatedAt))
            })
            .Where(x => x.FundingAmount > 0)
            .OrderByDescending(x => x.FundingAmount)
            .ThenByDescending(x => x.FundingCount)
            .ThenBy(x => x.Name)
            .Take(topRankCount)
            .ToListAsync();

        var topFundingDtos = fundingRows
            .Select((x, index) => new TopFundingDto
            {
                MemberName = x.Name,
                AvatarUrl = x.ProfileImageUrl,
                FundingAmount = x.FundingAmount,
                SharePercentage = totalPool > 0 ? x.FundingAmount / totalPool * 100 : 0,
                TransactionCount = x.FundingCount,
                LatestDate = x.LatestDate ?? DateTime.MinValue,
                Rank = index + 1
            })
            .ToList();

        // === Monthly Trend ===
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
            TopFunding = topFundingDtos,
            MonthlyTrend = monthlyTrend
        };
    }
}
