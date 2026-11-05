using UnityMicroFund.API.Areas.Accounts.DTOs;

namespace UnityMicroFund.API.Areas.Accounts.Services;

public interface IFinancialStatementService
{
    Task<BalanceSheetDto> GetBalanceSheetAsync(CancellationToken cancellationToken = default);
    Task<IncomeStatementDto> GetIncomeStatementAsync(
        DateTime? from = null, DateTime? to = null, CancellationToken cancellationToken = default);
}
