using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Settings.DTOs;
using UnityMicroFund.API.Areas.Settings.Services;

namespace UnityMicroFund.API.Areas.Settings.Controllers;

/// <summary>
/// Controller for managing business configuration parameters.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ParamBusConfigController : ControllerBase
{
    private readonly IParamBusConfigService _service;

    public ParamBusConfigController(IParamBusConfigService service)
    {
        _service = service;
    }

    private string GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
    }

    /// <summary>
    /// Get all configuration parameters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var configs = await _service.GetAllAsync(cancellationToken);
        return Ok(configs);
    }

    /// <summary>
    /// Get only active configuration parameters.
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActive(CancellationToken cancellationToken)
    {
        var configs = await _service.GetActiveAsync(cancellationToken);
        return Ok(configs);
    }

    /// <summary>
    /// Get configuration by ID.
    /// </summary>
    /// <param name="id">Configuration ID</param>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var config = await _service.GetByIdAsync(id, cancellationToken);
        if (config == null)
        {
            return NotFound(new { message = "Configuration not found" });
        }
        return Ok(config);
    }

    /// <summary>
    /// Get configuration by name.
    /// </summary>
    /// <param name="name">Configuration name</param>
    [HttpGet("name/{name}")]
    public async Task<IActionResult> GetByName(string name, CancellationToken cancellationToken)
    {
        var config = await _service.GetByNameAsync(name, cancellationToken);
        if (config == null)
        {
            return NotFound(new { message = "Configuration not found" });
        }
        return Ok(config);
    }

    /// <summary>
    /// Create a new configuration parameter. Admin only.
    /// </summary>
    /// <param name="Dto">Configuration data</param>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateParamBusConfigDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Value))
        {
            return BadRequest(new { message = "Name and Value are required" });
        }

        var result = await _service.CreateAsync(dto, GetCurrentUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>
    /// Update a configuration parameter. Admin only.
    /// </summary>
    /// <param name="id">Configuration ID</param>
    /// <param name="Dto">Updated configuration data</param>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateParamBusConfigDto dto, CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(id, dto, GetCurrentUserId(), cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = "Configuration not found" });
        }
        return Ok(result);
    }

    /// <summary>
    /// Delete a configuration parameter. Admin only.
    /// </summary>
    /// <param name="id">Configuration ID</param>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _service.DeleteAsync(id, cancellationToken);
        if (!result)
        {
            return NotFound(new { message = "Configuration not found" });
        }
        return Ok(new { message = "Configuration deleted successfully" });
    }

    /// <summary>
    /// Toggle configuration status. Admin only.
    /// </summary>
    /// <param name="id">Configuration ID</param>
    [HttpPut("{id:guid}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleStatus(Guid id, CancellationToken cancellationToken)
    {
        var result = await _service.ToggleStatusAsync(id, GetCurrentUserId(), cancellationToken);
        if (!result)
        {
            return NotFound(new { message = "Configuration not found" });
        }
        return Ok(new { message = "Status toggled successfully" });
    }
}