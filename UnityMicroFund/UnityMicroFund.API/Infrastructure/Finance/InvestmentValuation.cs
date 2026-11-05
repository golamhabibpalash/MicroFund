using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Infrastructure.Finance;

public static class InvestmentValuation
{
    public static decimal GetTotalProfit(Investment investment)
    {
        var receivedProfit = Math.Max(0m, (investment.ActualGrossProfit ?? 0m) - investment.PrincipalAmount);
        return receivedProfit + investment.InterimProfits.Sum(p => p.Amount) - investment.TotalProjectCost;
    }

    public static decimal GetEffectiveCurrentValue(Investment investment)
        => investment.PrincipalAmount + Math.Max(0m, GetTotalProfit(investment));

    public static decimal GetReturnAmount(Investment investment)
        => GetEffectiveCurrentValue(investment) - investment.PrincipalAmount;

    public static decimal GetReturnPercentage(Investment investment)
        => investment.PrincipalAmount > 0
            ? GetReturnAmount(investment) / investment.PrincipalAmount * 100m
            : 0m;
}
