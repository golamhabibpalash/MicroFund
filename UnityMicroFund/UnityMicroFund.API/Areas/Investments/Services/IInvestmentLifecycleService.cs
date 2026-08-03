using UnityMicroFund.API.Areas.Investments.DTOs;

namespace UnityMicroFund.API.Areas.Investments.Services;

public interface IInvestmentLifecycleService
{
    Task<InvestmentResponseDto> ChangeStatusAsync(
        Guid investmentId, string targetStatus, string? reason, string? actionedBy, CancellationToken cancellationToken = default);

    /// <summary>Records the actual gross profit and moves the project to Completed.</summary>
    Task<InvestmentResponseDto> CompleteAsync(
        Guid investmentId, CompleteInvestmentDto dto, string? actionedBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates the operational fee, splits net profit by share count and credits
    /// principal + profit to each investor's wallet. Idempotent: a project already
    /// distributed is rejected rather than paid twice.
    /// </summary>
    Task<ProfitSettlementDto> DistributeProfitAsync(
        Guid investmentId, string? actionedBy, CancellationToken cancellationToken = default);

    Task<ProfitSettlementDto> GetSettlementAsync(
        Guid investmentId, CancellationToken cancellationToken = default);

    /// <summary>Pays money out, debiting the investor's wallet.</summary>
    Task<ProfitSettlementDto> DisburseAsync(
        Guid investmentId, Guid? memberId, string? actionedBy, CancellationToken cancellationToken = default);

    /// <summary>Cancels the project and refunds every active subscription.</summary>
    Task<InvestmentResponseDto> CancelAsync(
        Guid investmentId, string? reason, string? actionedBy, CancellationToken cancellationToken = default);
}
