using UnityMicroFund.API.Areas.Investments.DTOs;

namespace UnityMicroFund.API.Areas.Investments.Services;

public interface IProjectCostService
{
    Task<InvestmentProjectCostDto> CreateAsync(Guid investmentId, CreateProjectCostDto dto, string? createdBy, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InvestmentProjectCostDto>> GetForInvestmentAsync(Guid investmentId, CancellationToken cancellationToken = default);
    Task<InvestmentProjectCostDto?> UpdateAsync(Guid investmentId, Guid id, UpdateProjectCostDto dto, string? updatedBy, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid investmentId, Guid id, CancellationToken cancellationToken = default);
}
