using UnityMicroFund.API.Areas.MonthlyProfits.DTOs;

namespace UnityMicroFund.API.Areas.MonthlyProfits.Services;

public interface IMonthlyProfitDistributionService
{
    Task<MonthlyProfitPreviewDto> PreviewAsync(
        CalculateMonthlyProfitDto dto,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MonthlyProfitDistributionSummaryDto>> GetAllAsync(
        int? year = null,
        string? status = null,
        string? type = null,
        CancellationToken cancellationToken = default);

    /// <summary>Projects set up for monthly or project-based profit, with their latest payout.</summary>
    Task<IReadOnlyList<ProfitEligibleProjectDto>> GetEligibleProjectsAsync(
        CancellationToken cancellationToken = default);

    Task<MonthlyProfitDistributionDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<MonthlyProfitDistributionDto> CreateAsync(
        CreateMonthlyProfitDistributionDto dto,
        string? actionedBy,
        CancellationToken cancellationToken = default);

    Task<MonthlyProfitDistributionDto?> UpdateAsync(
        Guid id,
        UpdateMonthlyProfitDistributionDto dto,
        string? actionedBy,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<MonthlyProfitDistributionDto> DistributeAsync(
        Guid id,
        string? actionedBy,
        CancellationToken cancellationToken = default);

    Task<MonthlyProfitDistributionDto> PayAsync(
        Guid id,
        Guid? lineId,
        string? actionedBy,
        CancellationToken cancellationToken = default);
}
