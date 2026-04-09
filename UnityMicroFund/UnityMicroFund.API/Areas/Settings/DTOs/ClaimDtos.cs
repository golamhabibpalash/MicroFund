using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Settings.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Claims { get; set; } = new();
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
    public string UserName { get; set; } = string.Empty;
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;
    public string? Description { get; set; }
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
