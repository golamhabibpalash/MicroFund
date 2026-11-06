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

    /// <summary>
    /// Processes the project's undistributed income and expenses for the period: creates the
    /// investor lines, locks the entries and posts maintenance. Investors are paid by PayAsync.
    /// </summary>
    Task<MonthlyProfitDistributionDto> ProcessAsync(
        CreateMonthlyProfitDistributionDto dto,
        string? actionedBy,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Undoes a processed distribution that has no payments yet: releases its entries and
    /// reverses the maintenance posting. Returns false when it does not exist.
    /// </summary>
    Task<bool> CancelAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>Disburses profit to one investor line, or to every pending line.</summary>
    Task<MonthlyProfitDistributionDto> PayAsync(
        Guid id,
        Guid? lineId,
        string? actionedBy,
        CancellationToken cancellationToken = default);
}
