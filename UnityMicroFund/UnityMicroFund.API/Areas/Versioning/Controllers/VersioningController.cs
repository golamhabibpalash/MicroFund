using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Versioning.Services;

namespace UnityMicroFund.API.Areas.Versioning.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VersioningController : ControllerBase
{
    private readonly IVersioningService _versioningService;

    public VersioningController(IVersioningService versioningService)
    {
        _versioningService = versioningService;
    }

    /// <summary>Full release history, newest first — powers the version-history modal.</summary>
    [HttpGet]
    public async Task<IActionResult> GetHistory(CancellationToken cancellationToken)
    {
        var history = await _versioningService.GetHistoryAsync(cancellationToken);
        return Ok(history);
    }

    /// <summary>The version currently deployed — powers the footer badge.</summary>
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var current = await _versioningService.GetCurrentAsync(cancellationToken);
        return current == null ? NoContent() : Ok(current);
    }
}
