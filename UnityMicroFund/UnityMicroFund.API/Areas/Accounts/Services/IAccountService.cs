using UnityMicroFund.API.Areas.Accounts.DTOs;

namespace UnityMicroFund.API.Areas.Accounts.Services;

public interface IAccountService
{
    Task<IEnumerable<AccountResponseDto>> GetAccountsAsync(string? search = null, bool? isActive = null);
    Task<AccountResponseDto?> GetAccountByIdAsync(Guid id);
    Task<AccountResponseDto> CreateAccountAsync(CreateAccountDto dto, string userId);
    Task<AccountResponseDto?> UpdateAccountAsync(Guid id, UpdateAccountDto dto);
    Task<bool> DeleteAccountAsync(Guid id);
    Task<bool> UpdateBalanceAsync(Guid accountId, decimal amount, bool isRefund);
}
