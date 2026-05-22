using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Profile.DTOs;
using UnityMicroFund.API.Areas.Auth.Services;

namespace UnityMicroFund.API.Areas.Profile.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IWebHostEnvironment _environment;

    public ProfileController(IProfileService profileService, IWebHostEnvironment environment)
    {
        _profileService = profileService;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null || !Guid.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var profile = await _profileService.GetProfileAsync(id);
        if (profile == null)
        {
            return NotFound();
        }
        return Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null || !Guid.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var profile = await _profileService.UpdateProfileAsync(id, dto);
        if (profile == null)
        {
            return NotFound();
        }
        return Ok(profile);
    }

    [HttpPut("image")]
    public async Task<IActionResult> UpdateProfileImage([FromBody] UpdateProfileImageDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null || !Guid.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var result = await _profileService.UpdateProfileImageAsync(id, dto.ImageUrl);
        if (!result)
        {
            return NotFound();
        }
        return Ok(new { message = "Profile image updated successfully" });
    }

    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file provided" });
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
        var allowedContentTypes = new[] { "image/jpeg", "image/jpg", "image/png" };

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only JPG and PNG files are allowed" });
        }

        if (!allowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "Only JPG and PNG files are allowed" });
        }

        const long maxSize = 2 * 1024 * 1024; // 2MB
        if (file.Length > maxSize)
        {
            return BadRequest(new { message = "Image size must be less than 2MB" });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null || !Guid.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var uploadsFolder = Path.Combine(_environment.ContentRootPath, "..", "unitymicrofund_web", "src", "assets", "member");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{userId}_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Also copy to dist/browser folder so it is served in production builds
        var distFolder = Path.Combine(_environment.ContentRootPath, "..", "unitymicrofund_web", "dist", "unitymicrofund_web", "browser", "assets", "member");
        if (Directory.Exists(Path.GetDirectoryName(distFolder)!))
        {
            Directory.CreateDirectory(distFolder);
            System.IO.File.Copy(filePath, Path.Combine(distFolder, fileName), overwrite: true);
        }

        var imageUrl = $"/assets/member/{fileName}";
        await _profileService.UpdateProfileImageAsync(id, imageUrl);

        return Ok(new { imageUrl });
    }
}