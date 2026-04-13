using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Settings.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Claims { get; set; } = new();
}

public class UserDetailDto : UserDto
{
    public List<UserClaimDto> DirectClaims { get; set; } = new();
    public List<string> InheritedClaims { get; set; } = new();
}

public class CreateUserDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Member";
}

public class UpdateUserDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public bool? IsActive { get; set; }
}

public class AssignUserRoleDto
{
    public string Role { get; set; } = string.Empty;
}

public class BulkAssignRoleDto
{
    public List<Guid> UserIds { get; set; } = new();
    public string Role { get; set; } = string.Empty;
}

public class RoleDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int UserCount { get; set; }
    public List<RoleClaimDto> Claims { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateRoleDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string>? Permissions { get; set; }
}

public class UpdateRoleDto
{
    public string? Description { get; set; }
    public List<string>? Permissions { get; set; }
}

public class RoleClaimDto
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UserClaimDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserName { get; set; }
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateRoleClaimDto
{
    public string Role { get; set; } = string.Empty;
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateUserClaimDto
{
    public Guid UserId { get; set; }
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateUserRoleDto
{
    public string Role { get; set; } = string.Empty;
}

public class RoleManagementDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string CurrentRole { get; set; } = string.Empty;
    public List<string> Claims { get; set; } = new();
}

public class ClaimPermissionsDto
{
    public string Role { get; set; } = string.Empty;
    public List<RoleClaimDto> Claims { get; set; } = new();
    public List<string> AvailableClaims { get; set; } = new();
}

public class PermissionCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public List<PermissionDto> Permissions { get; set; } = new();
}

public class PermissionDto
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsAssigned { get; set; }
}

public class RolePermissionsMatrixDto
{
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public Dictionary<string, List<string>> RolePermissions { get; set; } = new();
}

public class ApiResponseDto<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }

    public static ApiResponseDto<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponseDto<T> Error(string message) =>
        new() { Success = false, Message = message };
}
