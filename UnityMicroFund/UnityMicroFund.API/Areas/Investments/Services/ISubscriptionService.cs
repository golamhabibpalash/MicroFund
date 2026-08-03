using UnityMicroFund.API.Areas.Investments.DTOs;

namespace UnityMicroFund.API.Areas.Investments.Services;

public interface ISubscriptionService
{
    /// <summary>
    /// Buys shares against the member's wallet. Debits the wallet, records the
    /// subscription, refreshes the holdings rollup and auto-transitions the project
    /// to FullySubscribed when the last share goes.
    /// </summary>
    Task<ShareSubscriptionDto> SubscribeAsync(
        Guid investmentId,
        Guid memberId,
        int shares,
        string? createdBy,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ShareSubscriptionDto>> GetSubscriptionsAsync(
        Guid investmentId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ShareSubscriptionDto>> GetMemberSubscriptionsAsync(
        Guid memberId,
        CancellationToken cancellationToken = default);
}
