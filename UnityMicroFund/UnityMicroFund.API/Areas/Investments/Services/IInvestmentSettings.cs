using UnityMicroFund.API.Data;
using Microsoft.EntityFrameworkCore;

namespace UnityMicroFund.API.Areas.Investments.Services;

/// <summary>
/// Business limits for the investment module. Values live in ParamBusConfig so an
/// admin can change them through the existing business-config screen; the constants
/// here are the fallbacks used when a row has not been created yet.
/// </summary>
public interface IInvestmentSettings
{
    Task<decimal> GetMinimumDepositAsync(CancellationToken cancellationToken = default);
    Task<decimal> GetOperationalExpensePercentageAsync(CancellationToken cancellationToken = default);

    /// <summary>Null means unlimited.</summary>
    Task<int?> GetMaxSharesPerInvestorAsync(CancellationToken cancellationToken = default);

    /// <summary>Null means unlimited. Percentage of a project one investor may hold.</summary>
    Task<decimal?> GetMaxOwnershipPercentageAsync(CancellationToken cancellationToken = default);
}

public class InvestmentSettings : IInvestmentSettings
{
    public const string MinimumDepositKey = "MinimumDepositAmount";
    public const string OperationalExpenseKey = "OperationalExpensePercentage";
    public const string MaxSharesPerInvestorKey = "MaxSharesPerInvestor";
    public const string MaxOwnershipPercentageKey = "MaxOwnershipPercentage";

    private const decimal DefaultMinimumDeposit = 5000m;
    private const decimal DefaultOperationalExpense = 10m;

    private readonly AppDbContext _context;

    public InvestmentSettings(AppDbContext context)
    {
        _context = context;
    }

    public async Task<decimal> GetMinimumDepositAsync(CancellationToken cancellationToken = default)
        => await ReadDecimalAsync(MinimumDepositKey, cancellationToken) ?? DefaultMinimumDeposit;

    public async Task<decimal> GetOperationalExpensePercentageAsync(CancellationToken cancellationToken = default)
    {
        var value = await ReadDecimalAsync(OperationalExpenseKey, cancellationToken) ?? DefaultOperationalExpense;
        return Math.Clamp(value, 0m, 100m);
    }

    public async Task<int?> GetMaxSharesPerInvestorAsync(CancellationToken cancellationToken = default)
    {
        var value = await ReadDecimalAsync(MaxSharesPerInvestorKey, cancellationToken);
        return value is > 0 ? (int)value.Value : null;
    }

    public async Task<decimal?> GetMaxOwnershipPercentageAsync(CancellationToken cancellationToken = default)
    {
        var value = await ReadDecimalAsync(MaxOwnershipPercentageKey, cancellationToken);
        return value is > 0 and <= 100 ? value : null;
    }

    private async Task<decimal?> ReadDecimalAsync(string name, CancellationToken cancellationToken)
    {
        var raw = await _context.ParamBusConfigs
            .AsNoTracking()
            .Where(c => c.Name == name && c.Status)
            .Select(c => c.Value)
            .FirstOrDefaultAsync(cancellationToken);

        return decimal.TryParse(raw, out var parsed) ? parsed : null;
    }
}
