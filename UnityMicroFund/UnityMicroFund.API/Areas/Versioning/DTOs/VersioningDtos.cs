namespace UnityMicroFund.API.Areas.Versioning.DTOs;

public record AppVersionChangeDto(string Type, string Description);

public record AppVersionDto(
    Guid Id,
    string Version,
    DateTime ReleaseDate,
    string Title,
    string? Summary,
    bool IsCurrent,
    IReadOnlyList<AppVersionChangeDto> Changes);
