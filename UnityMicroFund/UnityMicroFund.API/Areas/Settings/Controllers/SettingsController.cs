using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Settings.DTOs;
using UnityMicroFund.API.Areas.Settings.Services;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Settings.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;
    private readonly IRolesService _rolesService;

    public SettingsController(ISettingsService settingsService, IRolesService rolesService)
    {
        _settingsService = settingsService;
        _rolesService = rolesService;
    }

    [HttpGet("group-settings")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetGroupSettings()
    {
        var settings = await _settingsService.GetAllSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("group-settings/{settingType}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateGroupSetting(GroupSettingsType settingType, [FromBody] UpdateSettingDto dto)
    {
        var result = await _settingsService.UpdateSettingAsync(settingType, dto);
        if (result == null)
        {
            return NotFound(new { message = "Setting not found" });
        }
        return Ok(result);
    }

    [HttpGet("users")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _rolesService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpPut("users/{userId}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUserRole(Guid userId, [FromBody] UpdateUserRoleDto dto)
    {
        var result = await _rolesService.UpdateUserRoleAsync(userId, dto.Role);
        if (!result)
        {
            return NotFound(new { message = "User not found" });
        }
        return Ok(new { message = "Role updated successfully" });
    }

    [HttpGet("users/{userId}/claims")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetUserClaims(Guid userId)
    {
        var claims = await _rolesService.GetUserClaimsAsync(userId);
        return Ok(claims);
    }

    [HttpPost("users/{userId}/claims")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddUserClaim(Guid userId, [FromBody] CreateUserClaimDto dto)
    {
        dto.UserId = userId;
        var claim = await _rolesService.AddUserClaimAsync(dto);
        return CreatedAtAction(nameof(GetUserClaims), new { userId }, claim);
    }

    [HttpDelete("users/{userId}/claims/{claimId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveUserClaim(Guid userId, Guid claimId)
    {
        var result = await _rolesService.RemoveUserClaimAsync(claimId);
        if (!result)
        {
            return NotFound(new { message = "Claim not found" });
        }
        return NoContent();
    }

    [HttpGet("role-claims")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAllRoleClaims()
    {
        var claims = await _rolesService.GetAllRoleClaimsAsync();
        return Ok(claims);
    }

    [HttpGet("role-claims/{role}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetRoleClaims(string role)
    {
        var claims = await _rolesService.GetRoleClaimsAsync(role);
        return Ok(claims);
    }

    [HttpPost("role-claims")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddRoleClaim([FromBody] CreateRoleClaimDto dto)
    {
        var claim = await _rolesService.AddRoleClaimAsync(dto);
        return CreatedAtAction(nameof(GetRoleClaims), new { role = dto.Role }, claim);
    }

    [HttpDelete("role-claims/{claimId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveRoleClaim(Guid claimId)
    {
        var result = await _rolesService.RemoveRoleClaimAsync(claimId);
        if (!result)
        {
            return NotFound(new { message = "Claim not found" });
        }
        return NoContent();
    }

    [HttpGet("permissions/{role}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetRolePermissions(string role)
    {
        var permissions = await _rolesService.GetRolePermissionsAsync(role);
        return Ok(permissions);
    }
}
