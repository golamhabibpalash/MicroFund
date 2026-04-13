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

    #region User Management

    [HttpGet("users")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _rolesService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpGet("users/{userId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetUserById(Guid userId)
    {
        var user = await _rolesService.GetUserByIdAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }
        return Ok(user);
    }

    [HttpPost("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        try
        {
            var user = await _rolesService.CreateUserAsync(dto);
            return CreatedAtAction(nameof(GetUserById), new { userId = user.Id }, user);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("users/{userId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] UpdateUserDto dto)
    {
        var user = await _rolesService.UpdateUserAsync(userId, dto);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }
        return Ok(user);
    }

    [HttpDelete("users/{userId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        var result = await _rolesService.DeleteUserAsync(userId);
        if (!result)
        {
            return NotFound(new { message = "User not found" });
        }
        return NoContent();
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

    [HttpPut("users/bulk-role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> BulkUpdateUserRole([FromBody] BulkAssignRoleDto dto)
    {
        var count = await _rolesService.BulkUpdateUserRoleAsync(dto);
        return Ok(new { message = $"{count} users updated successfully" });
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

    #endregion

    #region Role Management

    [HttpGet("roles")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAllRoles()
    {
        var roles = await _rolesService.GetAllRolesAsync();
        return Ok(roles);
    }

    [HttpGet("roles/{roleName}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetRoleByName(string roleName)
    {
        var role = await _rolesService.GetRoleByNameAsync(roleName);
        if (role == null)
        {
            return NotFound(new { message = "Role not found" });
        }
        return Ok(role);
    }

    [HttpPost("roles")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto dto)
    {
        try
        {
            var role = await _rolesService.CreateRoleAsync(dto);
            return CreatedAtAction(nameof(GetRoleByName), new { roleName = role.Name }, role);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("roles/{roleName}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRole(string roleName, [FromBody] UpdateRoleDto dto)
    {
        var role = await _rolesService.UpdateRoleAsync(roleName, dto);
        if (role == null)
        {
            return NotFound(new { message = "Role not found" });
        }
        return Ok(role);
    }

    [HttpDelete("roles/{roleName}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteRole(string roleName)
    {
        try
        {
            var result = await _rolesService.DeleteRoleAsync(roleName);
            if (!result)
            {
                return NotFound(new { message = "Role not found" });
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    #endregion

    #region Role Claims / Permissions

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
        try
        {
            var claim = await _rolesService.AddRoleClaimAsync(dto);
            return CreatedAtAction(nameof(GetRoleClaims), new { role = dto.Role }, claim);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("role-claims/{role}/bulk")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddRoleClaims(string role, [FromBody] List<string> permissions)
    {
        try
        {
            await _rolesService.AddRoleClaimsAsync(role, permissions);
            return Ok(new { message = $"{permissions.Count} permissions added to {role}" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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

    [HttpDelete("role-claims/role/{role}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveAllRoleClaims(string role)
    {
        await _rolesService.RemoveAllRoleClaimsAsync(role);
        return Ok(new { message = $"All claims removed from {role}" });
    }

    [HttpGet("permissions/{role}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetRolePermissions(string role)
    {
        var permissions = await _rolesService.GetRolePermissionsAsync(role);
        return Ok(permissions);
    }

    [HttpGet("permissions-matrix")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetPermissionsMatrix()
    {
        var matrix = await _rolesService.GetPermissionsMatrixAsync();
        return Ok(matrix);
    }

    [HttpGet("permission-categories")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetPermissionCategories()
    {
        var categories = await _rolesService.GetPermissionCategoriesAsync();
        return Ok(categories);
    }

    #endregion
}
