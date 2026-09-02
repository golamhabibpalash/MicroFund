using UnityMicroFund.API.Areas.CashOut.DTOs;

namespace UnityMicroFund.API.Areas.CashOut.Services;

public interface ICashOutService
{
    Task<CashOutBalanceDto> GetAvailableBalanceAsync(Guid memberId, CancellationToken cancellationToken = default);
    Task<IEnumerable<CashOutRequestDto>> GetMemberRequestsAsync(Guid memberId, CancellationToken cancellationToken = default);
    Task<IEnumerable<CashOutRequestDto>> GetAllRequestsAsync(string? status = null, string? search = null, CancellationToken cancellationToken = default);
    Task<CashOutRequestDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CashOutRequestDto> CreateAsync(Guid memberId, CreateCashOutRequestDto dto, string requestedBy, CancellationToken cancellationToken = default);
    Task<CashOutRequestDto> ApproveAsync(Guid id, string actionedBy, CancellationToken cancellationToken = default);
    Task<CashOutRequestDto> RejectAsync(Guid id, string? adminRemarks, string actionedBy, CancellationToken cancellationToken = default);
    Task<bool> CancelAsync(Guid id, Guid memberId, CancellationToken cancellationToken = default);
}
