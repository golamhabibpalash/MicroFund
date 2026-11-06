using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.MonthlyProfits.DTOs;
using UnityMicroFund.API.Areas.MonthlyProfits.Services;

namespace UnityMicroFund.API.Areas.MonthlyProfits.Controllers;

[ApiController]
[Route("api/monthly-profit-distributions")]
[Authorize(Roles = "Admin")]
public class MonthlyProfitDistributionsController : ControllerBase
{
    private readonly IMonthlyProfitDistributionService _service;

    public MonthlyProfitDistributionsController(IMonthlyProfitDistributionService service)
    {
        _service = service;
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview(
        [FromBody] CalculateMonthlyProfitDto dto,
        CancellationToken cancellationToken)
        => Ok(await _service.PreviewAsync(dto, cancellationToken));

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? year,
        [FromQuery] string? status,
        [FromQuery] string? type,
        CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(year, status, type, cancellationToken));

    [HttpGet("eligible-projects")]
    public async Task<IActionResult> GetEligibleProjects(CancellationToken cancellationToken)
        => Ok(await _service.GetEligibleProjectsAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var distribution = await _service.GetByIdAsync(id, cancellationToken);
        return distribution == null
            ? NotFound(new { message = "Profit distribution not found." })
            : Ok(distribution);
    }

    [HttpPost]
    public async Task<IActionResult> Process(
        [FromBody] CreateMonthlyProfitDistributionDto dto,
        CancellationToken cancellationToken)
    {
        var distribution = await _service.ProcessAsync(dto, GetCurrentUserName(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = distribution.Id }, distribution);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
        => await _service.CancelAsync(id, cancellationToken)
            ? NoContent()
            : NotFound(new { message = "Profit distribution not found." });

    [HttpPost("{id:guid}/pay")]
    public async Task<IActionResult> Pay(
        Guid id,
        [FromBody] PayMonthlyProfitDto? dto,
        CancellationToken cancellationToken)
        => Ok(await _service.PayAsync(id, dto?.LineId, GetCurrentUserName(), cancellationToken));

    private string? GetCurrentUserName()
        => User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue(ClaimTypes.Email)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
}
