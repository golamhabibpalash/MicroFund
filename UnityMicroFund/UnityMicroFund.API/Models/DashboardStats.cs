namespace UnityMicroFund.API.Models;

public class DashboardStats
{
    public decimal TotalPoolAmount { get; set; }
    public int TotalMembersCount { get; set; }
    public decimal MonthlyContributionTotal { get; set; }
    public int ActiveInvestmentsCount { get; set; }
    public decimal TotalReturns { get; set; }
    public decimal ReturnPercentage { get; set; }
    public int PendingContributions { get; set; }
}
