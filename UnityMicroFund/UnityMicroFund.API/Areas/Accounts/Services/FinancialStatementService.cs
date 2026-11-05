using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Accounts.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.Finance;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Accounts.Services;

/// <summary>
/// Management financial statements derived from the existing data model. The system
/// records cash movements on accounts plus settled investment results, but it is not a
/// full double-entry ledger, so the balance sheet uses the accounting equation to present
/// a balanced position and exposes any difference as an explicit reconciliation line.
/// </summary>
public class FinancialStatementService : IFinancialStatementService
{
    private readonly AppDbContext _context;

    public FinancialStatementService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BalanceSheetDto> GetBalanceSheetAsync(CancellationToken cancellationToken = default)
    {
        var accounts = await _context.Accounts
            .AsNoTracking()
            .OrderBy(a => a.Category)
            .ThenBy(a => a.Code)
            .ThenBy(a => a.Name)
            .Select(a => new { a.Name, a.Code, a.Category, a.Balance })
            .ToListAsync(cancellationToken);

        var assets = accounts
            .Where(a => a.Category == AccountCategory.Asset)
            .Select(a => Line(a.Name, a.Code, a.Balance, "Account balance"))
            .ToList();

        // Investments are shown as a memo only. The cash ledger does not reduce a funding
        // account when shares are purchased, so adding investment value to cash assets
        // would double count the same money.
        var investments = await _context.Investments
            .AsNoTracking()
            .Where(i => i.Status != InvestmentStatus.Draft && i.Status != InvestmentStatus.Cancelled)
            .Include(i => i.InterimProfits)
            .Include(i => i.ProjectCosts)
            .ToListAsync(cancellationToken);
        var investmentValue = investments.Sum(InvestmentValuation.GetEffectiveCurrentValue);

        var totalAssets = assets.Sum(a => a.Amount);

        var liabilities = accounts
            .Where(a => a.Category == AccountCategory.Liability)
            .Select(a => Line(a.Name, a.Code, a.Balance, "Account balance"))
            .ToList();
        var totalLiabilities = liabilities.Sum(a => a.Amount);

        var equity = accounts
            .Where(a => a.Category == AccountCategory.Equity)
            .Select(a => Line(a.Name, a.Code, a.Balance, "Account balance"))
            .ToList();

        var totalFunded = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.Status == TransactionStatus.Fund
                        && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .SumAsync(t => (decimal?)t.Amount, cancellationToken) ?? 0m;

        var totalRefunded = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.Status == TransactionStatus.Refund
                        && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .SumAsync(t => (decimal?)t.Amount, cancellationToken) ?? 0m;

        var totalWithdrawn = await _context.CashOutRequests
            .AsNoTracking()
            .Where(c => c.Status == CashOutStatus.Approved)
            .SumAsync(c => (decimal?)c.Amount, cancellationToken) ?? 0m;

        var memberCapital = totalFunded - totalRefunded - totalWithdrawn;

        var investmentProfit = await _context.Investments
            .AsNoTracking()
            .Where(i => i.NetProfit != null)
            .SumAsync(i => i.NetProfit, cancellationToken) ?? 0m;

        var maintenanceIncome = await _context.InvestmentMaintenanceDistributions
            .AsNoTracking()
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        var ledgerIncome = await _context.AccountLedgerEntries
            .AsNoTracking()
            .Where(e => e.Direction == AccountEntryDirection.Income)
            .SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;

        var ledgerExpense = await _context.AccountLedgerEntries
            .AsNoTracking()
            .Where(e => e.Direction == AccountEntryDirection.Expense)
            .SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;

        var retainedEarnings = investmentProfit + maintenanceIncome + ledgerIncome - ledgerExpense;

        equity.Add(Line("Member capital", null, memberCapital,
            "Approved funding less refunds and approved cash-outs"));
        equity.Add(Line("Retained earnings", null, retainedEarnings,
            "Settled investment profit + maintenance + other income − expenses"));

        // The accounting equation guarantees a balanced statement. Any difference between
        // the derived equity total and the explicitly listed components is shown rather
        // than hidden, so the statements remain honest about the source data.
        var totalEquity = totalAssets - totalLiabilities;
        var listedEquity = equity.Sum(e => e.Amount);
        var unreconciled = totalEquity - listedEquity;

        if (Math.Abs(unreconciled) >= 0.01m)
        {
            equity.Add(Line("Unreconciled difference", null, unreconciled,
                "Balancing line for movements outside the chart of accounts"));
        }

        var totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        return new BalanceSheetDto
        {
            AsOf = DateTime.UtcNow,
            Assets = assets,
            TotalAssets = totalAssets,
            Liabilities = liabilities,
            TotalLiabilities = totalLiabilities,
            Equity = equity,
            TotalEquity = totalEquity,
            TotalLiabilitiesAndEquity = totalLiabilitiesAndEquity,
            IsBalanced = Math.Abs(totalAssets - totalLiabilitiesAndEquity) < 0.01m,
            InvestmentsUnderManagement = investmentValue,
            Note = "Derived management report. Assets are the balances of Asset-category accounts; liabilities "
                 + "are Liability-category balances. Equity is the balancing figure, split into member capital, "
                 + "retained earnings, equity accounts and any unreconciled difference. Investments under management "
                 + "are shown as a memo only because the cash ledger does not reduce a funding account when shares "
                 + "are purchased — including them in assets would double count the same money."
        };
    }

    public async Task<IncomeStatementDto> GetIncomeStatementAsync(
        DateTime? from = null, DateTime? to = null, CancellationToken cancellationToken = default)
    {
        var fromDate = from?.Date ?? DateTime.MinValue;
        var toDate = (to?.Date ?? DateTime.UtcNow.Date).AddDays(1).AddTicks(-1);

        var ledgerQuery = _context.AccountLedgerEntries.AsNoTracking();
        if (from.HasValue) ledgerQuery = ledgerQuery.Where(e => e.EntryDate >= fromDate);
        if (to.HasValue) ledgerQuery = ledgerQuery.Where(e => e.EntryDate <= toDate);

        var otherIncome = await ledgerQuery
            .Where(e => e.Direction == AccountEntryDirection.Income)
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Amount = g.Sum(e => e.Amount) })
            .OrderByDescending(x => x.Amount)
            .ToListAsync(cancellationToken);

        var expenses = await ledgerQuery
            .Where(e => e.Direction == AccountEntryDirection.Expense)
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Amount = g.Sum(e => e.Amount) })
            .OrderByDescending(x => x.Amount)
            .ToListAsync(cancellationToken);

        var profitQuery = _context.ProfitDistributions.AsNoTracking();
        if (from.HasValue) profitQuery = profitQuery.Where(p => p.DistributedAt >= fromDate);
        if (to.HasValue) profitQuery = profitQuery.Where(p => p.DistributedAt <= toDate);
        var investorProfit = await profitQuery
            .SumAsync(p => (decimal?)p.ProfitAmount, cancellationToken) ?? 0m;

        var maintenanceQuery = _context.InvestmentMaintenanceDistributions.AsNoTracking();
        if (from.HasValue) maintenanceQuery = maintenanceQuery.Where(m => m.DisbursedAt >= fromDate);
        if (to.HasValue) maintenanceQuery = maintenanceQuery.Where(m => m.DisbursedAt <= toDate);
        var maintenanceIncome = await maintenanceQuery
            .SumAsync(m => (decimal?)m.Amount, cancellationToken) ?? 0m;

        var incomeLines = new List<StatementLineDto>();
        if (investorProfit != 0)
        {
            incomeLines.Add(Line("Settled investment profit", null, investorProfit,
                "Investor share of realised project results"));
        }
        if (maintenanceIncome != 0)
        {
            incomeLines.Add(Line("Maintenance income", null, maintenanceIncome,
                "Maintenance fees retained from project profit"));
        }
        incomeLines.AddRange(otherIncome.Select(x =>
            Line(x.Category, null, x.Amount, "Income ledger")));

        var expenseLines = expenses
            .Select(x => Line(x.Category, null, x.Amount, "Expense ledger"))
            .ToList();

        var totalIncome = incomeLines.Sum(x => x.Amount);
        var totalExpenses = expenseLines.Sum(x => x.Amount);

        return new IncomeStatementDto
        {
            From = fromDate,
            To = toDate,
            Income = incomeLines,
            TotalIncome = totalIncome,
            Expenses = expenseLines,
            TotalExpenses = totalExpenses,
            NetIncome = totalIncome - totalExpenses,
            Note = "Income combines settled investment profit, maintenance income and the manual income "
                 + "ledger. Expenses come from the manual expense ledger. Income and Expense category "
                 + "account balances are not added again, to avoid double counting."
        };
    }

    private static StatementLineDto Line(string label, string? code, decimal amount, string? detail) => new()
    {
        Label = label,
        Code = code,
        Amount = amount,
        Detail = detail
    };
}
