using UnityMicroFund.API.Areas.Investments.DTOs;

namespace UnityMicroFund.API.Areas.Investments.Services;

public interface IInterimProfitService
{
    Task<InterimProfitDto> CreateAsync(Guid investmentId, CreateInterimProfitDto dto, string? createdBy, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InterimProfitDto>> GetForInvestmentAsync(Guid investmentId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid investmentId, Guid id, CancellationToken cancellationToken = default);
}
