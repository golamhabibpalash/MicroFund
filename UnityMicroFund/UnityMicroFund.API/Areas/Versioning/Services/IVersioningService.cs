using UnityMicroFund.API.Areas.Versioning.DTOs;

namespace UnityMicroFund.API.Areas.Versioning.Services;

public interface IVersioningService
{
    /// <summary>Full release history, newest first.</summary>
    Task<IReadOnlyList<AppVersionDto>> GetHistoryAsync(CancellationToken cancellationToken = default);

    /// <summary>The version currently deployed, or null if none has been recorded.</summary>
    Task<AppVersionDto?> GetCurrentAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Idempotently writes the built-in release history to the database and keeps the
    /// IsCurrent flag on the newest row. Safe to run on every startup.
    /// </summary>
    Task SeedAsync(CancellationToken cancellationToken = default);
}
