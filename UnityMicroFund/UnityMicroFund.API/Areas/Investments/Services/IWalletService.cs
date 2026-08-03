using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public interface IWalletService
{
    Task<decimal> GetBalanceAsync(Guid memberId, CancellationToken cancellationToken = default);

    Task<WalletSummaryDto?> GetSummaryAsync(Guid memberId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Appends an entry. Does not save - the caller commits, so a wallet movement and
    /// the thing that caused it always land in the same transaction.
    /// </summary>
    WalletEntry AddEntry(
        Guid memberId,
        WalletEntryType type,
        decimal signedAmount,
        string? description,
        string? createdBy,
        Guid? investmentId = null,
        Guid? shareSubscriptionId = null,
        Guid? transactionId = null);
}
