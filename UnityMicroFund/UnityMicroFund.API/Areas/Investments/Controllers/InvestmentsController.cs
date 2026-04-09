using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Areas.Investments.Services;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvestmentsController : ControllerBase
{
    private readonly IInvestmentService _investmentService;

    public InvestmentsController(IInvestmentService investmentService)
    {
        _investmentService = investmentService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetInvestments([FromQuery] InvestmentType? type = null)
    {
        var investments = await _investmentService.GetInvestmentsAsync(type);
        return Ok(investments);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvestment(Guid id)
    {
        var investment = await _investmentService.GetInvestmentByIdAsync(id);
        if (investment == null)
        {
            return NotFound(new { message = "Investment not found" });
        }
        return Ok(investment);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> CreateInvestment([FromBody] CreateInvestmentDto dto)
    {
        var investment = await _investmentService.CreateInvestmentAsync(dto);
        return CreatedAtAction(nameof(GetInvestment), new { id = investment.Id }, investment);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateInvestment(Guid id, [FromBody] UpdateInvestmentDto dto)
    {
        var investment = await _investmentService.UpdateInvestmentAsync(id, dto);
        if (investment == null)
        {
            return NotFound(new { message = "Investment not found" });
        }
        return Ok(investment);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteInvestment(Guid id)
    {
        var result = await _investmentService.DeleteInvestmentAsync(id);
        if (!result)
        {
            return NotFound(new { message = "Investment not found" });
        }
        return NoContent();
    }
}
