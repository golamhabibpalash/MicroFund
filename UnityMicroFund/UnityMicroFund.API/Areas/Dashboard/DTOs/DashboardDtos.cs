namespace UnityMicroFund.API.Areas.Dashboard.DTOs;

public class DashboardStatsDto
{
    public decimal TotalPoolAmount { get; set; }
    public int TotalMembersCount { get; set; }
    public decimal MonthlyContributionTotal { get; set; }
    public int ActiveInvestmentsCount { get; set; }
    public decimal TotalReturns { get; set; }
    public decimal ReturnPercentage { get; set; }
    public int PendingContributions { get; set; }
    public decimal AverageContribution { get; set; }
    public decimal TotalInvested { get; set; }
    public int ContributionsThisMonth { get; set; }
    public List<RecentActivityDto> RecentActivities { get; set; } = new();
    public List<TopInvestorDto> TopInvestors { get; set; } = new();
    public List<TopFundingDto> TopFunding { get; set; } = new();
    public MonthlyTrendDto MonthlyTrend { get; set; } = new();
}

public class RecentActivityDto
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string MemberName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? AvatarUrl { get; set; }
    public Guid? UserId { get; set; }
}

/// <summary>
/// Ranking by a member's <b>investing</b> activity only — the capital they committed
/// to purchase investment shares (<see cref="Models.MemberInvestment.AmountInvested"/>).
/// Funding (money paid into the pool) is deliberately excluded; see <see cref="TopFundingDto"/>.
/// </summary>
public class TopInvestorDto
{
    public string MemberName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public decimal InvestmentAmount { get; set; }
    public decimal SharePercentage { get; set; }
    public int TransactionCount { get; set; }
    public DateTime LatestDate { get; set; }
    public int Rank { get; set; }
}

/// <summary>
/// Ranking by a member's <b>funding</b> activity only — money funded into the pool via
/// approved <see cref="Models.TransactionStatus.Fund"/> transactions. Investing
/// (share purchases) is deliberately excluded; see <see cref="TopInvestorDto"/>.
/// </summary>
public class TopFundingDto
{
    public string MemberName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public decimal FundingAmount { get; set; }
    public decimal SharePercentage { get; set; }
    public int TransactionCount { get; set; }
    public DateTime LatestDate { get; set; }
    public int Rank { get; set; }
}

public class MonthlyTrendDto
{
    public List<string> Labels { get; set; } = new();
    public List<decimal> Contributions { get; set; } = new();
    public List<decimal> Investments { get; set; } = new();
    public List<decimal> Returns { get; set; } = new();
}
