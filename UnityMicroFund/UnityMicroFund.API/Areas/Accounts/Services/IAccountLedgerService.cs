using UnityMicroFund.API.Areas.Accounts.DTOs;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Accounts.Services;

public interface IAccountLedgerService
{
    Task<AccountLedgerEntryDto> CreateAsync(CreateAccountLedgerEntryDto dto, string? createdBy, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AccountLedgerEntryDto>> GetAsync(
        AccountEntryDirection? direction = null,
        Guid? accountId = null,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);

    Task<AccountLedgerEntryDto?> UpdateAsync(Guid id, UpdateAccountLedgerEntryDto dto, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    Task<AccountsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
}
