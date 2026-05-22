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
    private readonly IWebHostEnvironment _environment;

    private const string CompanyNameKey = "CompanyName";
    private const string CompanyLogoKey = "CompanyLogo";
    private const string DefaultCompanyName = "Unity MicroFund";
    private const string DefaultLogoUrl = "assets/organization/logo.png";

    public ParamBusConfigController(IParamBusConfigService service, IWebHostEnvironment environment)
    {
        _service = service;
        _environment = environment;
    }

    private string GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
    }

    /// <summary>
    /// Public branding (company name + logo URL) for pre-login screens. No auth required.
    /// </summary>
    [HttpGet("branding")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBranding(CancellationToken cancellationToken)
    {
        var name = await _service.GetByNameAsync(CompanyNameKey, cancellationToken);
        var logo = await _service.GetByNameAsync(CompanyLogoKey, cancellationToken);

        return Ok(new
        {
            companyName = string.IsNullOrWhiteSpace(name?.Value) ? DefaultCompanyName : name!.Value,
            logoUrl = string.IsNullOrWhiteSpace(logo?.Value) ? DefaultLogoUrl : logo!.Value
        });
    }

    /// <summary>
    /// Upload a new company logo. Saves the image and stores its URL in the CompanyLogo config. Admin only.
    /// </summary>
    [HttpPost("logo")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadLogo(IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file provided" });
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".svg", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only JPG, PNG, SVG, or WEBP files are allowed" });
        }

        const long maxSize = 2 * 1024 * 1024; // 2MB
        if (file.Length > maxSize)
        {
            return BadRequest(new { message = "Logo size must be less than 2MB" });
        }

        var uploadsFolder = Path.Combine(_environment.ContentRootPath, "..", "unitymicrofund_web", "src", "assets", "organization");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"logo_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        // Mirror into the production build folder when present, so it is served after a build.
        var distFolder = Path.Combine(_environment.ContentRootPath, "..", "unitymicrofund_web", "dist", "unitymicrofund_web", "browser", "assets", "organization");
        if (Directory.Exists(Path.GetDirectoryName(distFolder)!))
        {
            Directory.CreateDirectory(distFolder);
            System.IO.File.Copy(filePath, Path.Combine(distFolder, fileName), overwrite: true);
        }

        var logoUrl = $"assets/organization/{fileName}";
        await _service.SetValueByNameAsync(CompanyLogoKey, logoUrl, "Company logo image path", GetCurrentUserId(), cancellationToken);

        return Ok(new { logoUrl });
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