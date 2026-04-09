using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Contributions.DTOs;
using UnityMicroFund.API.Areas.Contributions.Services;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Contributions.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContributionsController : ControllerBase
{
    private readonly IContributionService _contributionService;

    public ContributionsController(IContributionService contributionService)
    {
        _contributionService = contributionService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetContributions(
        [FromQuery] Guid? memberId = null,
        [FromQuery] int? year = null,
        [FromQuery] string? month = null,
        [FromQuery] ContributionStatus? status = null)
    {
        var result = await _contributionService.GetContributionsAsync(memberId, year, month, status);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetContribution(Guid id)
    {
        var contribution = await _contributionService.GetContributionByIdAsync(id);
        if (contribution == null)
        {
            return NotFound(new { message = "Contribution not found" });
        }
        return Ok(contribution);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> CreateContribution([FromBody] CreateContributionDto dto)
    {
        try
        {
            var contribution = await _contributionService.CreateContributionAsync(dto);
            return CreatedAtAction(nameof(GetContribution), new { id = contribution.Id }, contribution);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateContributionStatus(Guid id, [FromBody] UpdateContributionStatusDto dto)
    {
        var contribution = await _contributionService.UpdateContributionStatusAsync(id, dto);
        if (contribution == null)
        {
            return NotFound(new { message = "Contribution not found" });
        }
        return Ok(contribution);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteContribution(Guid id)
    {
        var result = await _contributionService.DeleteContributionAsync(id);
        if (!result)
        {
            return NotFound(new { message = "Contribution not found" });
        }
        return NoContent();
    }

    [HttpPost("generate-monthly")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GenerateMonthlyContributions([FromQuery] int? year = null, [FromQuery] string? month = null)
    {
        try
        {
            var result = await _contributionService.GenerateMonthlyContributionsAsync(year, month);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
