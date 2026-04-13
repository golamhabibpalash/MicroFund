using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Auth.Models;
using UnityMicroFund.API.Areas.Settings.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Settings.Services;

public interface IRolesService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<UserDetailDto?> GetUserByIdAsync(Guid userId);
    Task<UserDto> CreateUserAsync(CreateUserDto dto);
    Task<UserDto?> UpdateUserAsync(Guid userId, UpdateUserDto dto);
    Task<bool> DeleteUserAsync(Guid userId);
    Task<bool> UpdateUserRoleAsync(Guid userId, string role);
    Task<int> BulkUpdateUserRoleAsync(BulkAssignRoleDto dto);
    Task<IEnumerable<UserClaimDto>> GetUserClaimsAsync(Guid userId);
    Task<UserClaimDto> AddUserClaimAsync(CreateUserClaimDto dto);
    Task<bool> RemoveUserClaimAsync(Guid claimId);
    
    Task<IEnumerable<RoleDto>> GetAllRolesAsync();
    Task<RoleDto?> GetRoleByNameAsync(string roleName);
    Task<RoleDto> CreateRoleAsync(CreateRoleDto dto);
    Task<RoleDto?> UpdateRoleAsync(string roleName, UpdateRoleDto dto);
    Task<bool> DeleteRoleAsync(string roleName);
    Task<bool> RoleExistsAsync(string roleName);
    
    Task<IEnumerable<RoleClaimDto>> GetAllRoleClaimsAsync();
    Task<IEnumerable<RoleClaimDto>> GetRoleClaimsAsync(string role);
    Task<RoleClaimDto> AddRoleClaimAsync(CreateRoleClaimDto dto);
    Task<RoleClaimDto> AddRoleClaimsAsync(string role, List<string> permissions);
    Task<bool> RemoveRoleClaimAsync(Guid claimId);
    Task<bool> RemoveAllRoleClaimsAsync(string role);
    Task<ClaimPermissionsDto> GetRolePermissionsAsync(string role);
    Task<RolePermissionsMatrixDto> GetPermissionsMatrixAsync();
    Task<IEnumerable<PermissionCategoryDto>> GetPermissionCategoriesAsync();
}

public class RolesService : IRolesService
{
    private readonly AppDbContext _context;

    public RolesService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _context.Users
            .Select(u => new UserDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role.ToString(),
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                Claims = _context.UserClaims
                    .Where(c => c.UserId == u.Id)
                    .Select(c => c.ClaimValue)
                    .ToList()
            })
            .ToListAsync();

        return users;
    }

    public async Task<UserDetailDto?> GetUserByIdAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        var directClaims = await _context.UserClaims
            .Where(c => c.UserId == userId)
            .Select(c => new UserClaimDto
            {
                Id = c.Id,
                UserId = c.UserId,
                UserName = user.Name,
                ClaimType = c.ClaimType,
                ClaimValue = c.ClaimValue,
                Description = c.Description,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        var roleClaims = await _context.RoleClaims
            .Where(c => c.Role == user.Role)
            .Select(c => c.ClaimValue)
            .ToListAsync();

        return new UserDetailDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            DirectClaims = directClaims,
            InheritedClaims = roleClaims
        };
    }

    public async Task<UserDto> CreateUserAsync(CreateUserDto dto)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = HashPassword(dto.Password),
            Role = Enum.Parse<UserRole>(dto.Role, true),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Claims = new List<string>()
        };
    }

    public async Task<UserDto?> UpdateUserAsync(Guid userId, UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        if (dto.Name != null) user.Name = dto.Name;
        if (dto.Email != null) user.Email = dto.Email;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Claims = await _context.UserClaims
                .Where(c => c.UserId == userId)
                .Select(c => c.ClaimValue)
                .ToListAsync()
        };
    }

    public async Task<bool> DeleteUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        var userClaims = await _context.UserClaims.Where(c => c.UserId == userId).ToListAsync();
        _context.UserClaims.RemoveRange(userClaims);
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UpdateUserRoleAsync(Guid userId, string role)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        if (Enum.TryParse<UserRole>(role, true, out var userRole))
        {
            user.Role = userRole;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        return false;
    }

    public async Task<int> BulkUpdateUserRoleAsync(BulkAssignRoleDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, true, out var userRole))
            return 0;

        var users = await _context.Users
            .Where(u => dto.UserIds.Contains(u.Id))
            .ToListAsync();

        foreach (var user in users)
        {
            user.Role = userRole;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return users.Count;
    }

    public async Task<IEnumerable<UserClaimDto>> GetUserClaimsAsync(Guid userId)
    {
        return await _context.UserClaims
            .Where(c => c.UserId == userId)
            .Select(c => new UserClaimDto
            {
                Id = c.Id,
                UserId = c.UserId,
                UserName = c.User != null ? c.User.Name : "",
                ClaimType = c.ClaimType,
                ClaimValue = c.ClaimValue,
                Description = c.Description,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<UserClaimDto> AddUserClaimAsync(CreateUserClaimDto dto)
    {
        var existingClaim = await _context.UserClaims
            .FirstOrDefaultAsync(c => c.UserId == dto.UserId && c.ClaimType == dto.ClaimType);

        if (existingClaim != null)
        {
            existingClaim.ClaimValue = dto.ClaimValue;
            existingClaim.Description = dto.Description;
            await _context.SaveChangesAsync();
            
            return new UserClaimDto
            {
                Id = existingClaim.Id,
                UserId = existingClaim.UserId,
                ClaimType = existingClaim.ClaimType,
                ClaimValue = existingClaim.ClaimValue,
                Description = existingClaim.Description,
                CreatedAt = existingClaim.CreatedAt
            };
        }

        var claim = new UserClaim
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            ClaimType = dto.ClaimType,
            ClaimValue = dto.ClaimValue,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow
        };

        _context.UserClaims.Add(claim);
        await _context.SaveChangesAsync();

        return new UserClaimDto
        {
            Id = claim.Id,
            UserId = claim.UserId,
            ClaimType = claim.ClaimType,
            ClaimValue = claim.ClaimValue,
            Description = claim.Description,
            CreatedAt = claim.CreatedAt
        };
    }

    public async Task<bool> RemoveUserClaimAsync(Guid claimId)
    {
        var claim = await _context.UserClaims.FindAsync(claimId);
        if (claim == null) return false;

        _context.UserClaims.Remove(claim);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<RoleDto>> GetAllRolesAsync()
    {
        var roles = Enum.GetValues<UserRole>().Select(r => r.ToString()).ToList();
        var roleDtos = new List<RoleDto>();

        foreach (var roleName in roles)
        {
            var role = Enum.Parse<UserRole>(roleName);
            var userCount = await _context.Users.CountAsync(u => u.Role == role);
            var claims = await GetRoleClaimsAsync(roleName);

            roleDtos.Add(new RoleDto
            {
                Name = roleName,
                Description = GetRoleDescription(roleName),
                UserCount = userCount,
                Claims = claims.ToList(),
                CreatedAt = DateTime.UtcNow
            });
        }

        return roleDtos;
    }

    public async Task<RoleDto?> GetRoleByNameAsync(string roleName)
    {
        if (!Enum.TryParse<UserRole>(roleName, true, out var role))
            return null;

        var userCount = await _context.Users.CountAsync(u => u.Role == role);
        var claims = await GetRoleClaimsAsync(roleName);

        return new RoleDto
        {
            Name = roleName,
            Description = GetRoleDescription(roleName),
            UserCount = userCount,
            Claims = claims.ToList(),
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task<RoleDto> CreateRoleAsync(CreateRoleDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Name, true, out _))
            throw new ArgumentException("Invalid role name. Use Admin, Manager, Member, or Viewer.");

        var roleName = dto.Name;
        var userRole = Enum.Parse<UserRole>(roleName);

        if (dto.Permissions != null && dto.Permissions.Any())
        {
            var claims = dto.Permissions.Select(p => new RoleClaim
            {
                Id = Guid.NewGuid(),
                Role = userRole,
                ClaimType = p.Split('.')[0],
                ClaimValue = p,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            _context.RoleClaims.AddRange(claims);
        }

        var userCount = await _context.Users.CountAsync(u => u.Role == userRole);

        return new RoleDto
        {
            Name = roleName,
            Description = dto.Description,
            UserCount = userCount,
            Claims = (await GetRoleClaimsAsync(roleName)).ToList(),
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task<RoleDto?> UpdateRoleAsync(string roleName, UpdateRoleDto dto)
    {
        if (!Enum.TryParse<UserRole>(roleName, true, out _))
            return null;

        if (dto.Permissions != null)
        {
            await RemoveAllRoleClaimsAsync(roleName);
            
            if (dto.Permissions.Any())
            {
                await AddRoleClaimsAsync(roleName, dto.Permissions);
            }
        }

        return await GetRoleByNameAsync(roleName);
    }

    public async Task<bool> DeleteRoleAsync(string roleName)
    {
        if (!Enum.TryParse<UserRole>(roleName, true, out var role))
            return false;

        var userCount = await _context.Users.CountAsync(u => u.Role == role);
        if (userCount > 0)
            throw new InvalidOperationException($"Cannot delete role '{roleName}' as it is assigned to {userCount} users.");

        await RemoveAllRoleClaimsAsync(roleName);
        return true;
    }

    public async Task<bool> RoleExistsAsync(string roleName)
    {
        return Enum.TryParse<UserRole>(roleName, true, out _);
    }

    public async Task<IEnumerable<RoleClaimDto>> GetAllRoleClaimsAsync()
    {
        return await _context.RoleClaims
            .Select(c => new RoleClaimDto
            {
                Id = c.Id,
                Role = c.Role.ToString(),
                ClaimType = c.ClaimType,
                ClaimValue = c.ClaimValue,
                Description = c.Description
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<RoleClaimDto>> GetRoleClaimsAsync(string role)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            return Enumerable.Empty<RoleClaimDto>();

        return await _context.RoleClaims
            .Where(c => c.Role == userRole)
            .Select(c => new RoleClaimDto
            {
                Id = c.Id,
                Role = c.Role.ToString(),
                ClaimType = c.ClaimType,
                ClaimValue = c.ClaimValue,
                Description = c.Description
            })
            .ToListAsync();
    }

    public async Task<RoleClaimDto> AddRoleClaimAsync(CreateRoleClaimDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, true, out var userRole))
            throw new ArgumentException("Invalid role");

        var existingClaim = await _context.RoleClaims
            .FirstOrDefaultAsync(c => c.Role == userRole && c.ClaimType == dto.ClaimType);

        if (existingClaim != null)
        {
            existingClaim.ClaimValue = dto.ClaimValue;
            existingClaim.Description = dto.Description;
            await _context.SaveChangesAsync();

            return new RoleClaimDto
            {
                Id = existingClaim.Id,
                Role = existingClaim.Role.ToString(),
                ClaimType = existingClaim.ClaimType,
                ClaimValue = existingClaim.ClaimValue,
                Description = existingClaim.Description
            };
        }

        var claim = new RoleClaim
        {
            Id = Guid.NewGuid(),
            Role = userRole,
            ClaimType = dto.ClaimType,
            ClaimValue = dto.ClaimValue,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow
        };

        _context.RoleClaims.Add(claim);
        await _context.SaveChangesAsync();

        return new RoleClaimDto
        {
            Id = claim.Id,
            Role = claim.Role.ToString(),
            ClaimType = claim.ClaimType,
            ClaimValue = claim.ClaimValue,
            Description = claim.Description
        };
    }

    public async Task<RoleClaimDto> AddRoleClaimsAsync(string role, List<string> permissions)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            throw new ArgumentException("Invalid role");

        var claims = permissions.Select(p => new RoleClaim
        {
            Id = Guid.NewGuid(),
            Role = userRole,
            ClaimType = p.Split('.')[0],
            ClaimValue = p,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.RoleClaims.AddRange(claims);
        await _context.SaveChangesAsync();

        return new RoleClaimDto
        {
            Id = claims.First().Id,
            Role = role,
            ClaimType = claims.First().ClaimType,
            ClaimValue = claims.First().ClaimValue,
            Description = null
        };
    }

    public async Task<bool> RemoveRoleClaimAsync(Guid claimId)
    {
        var claim = await _context.RoleClaims.FindAsync(claimId);
        if (claim == null) return false;

        _context.RoleClaims.Remove(claim);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveAllRoleClaimsAsync(string role)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            return false;

        var claims = await _context.RoleClaims.Where(c => c.Role == userRole).ToListAsync();
        _context.RoleClaims.RemoveRange(claims);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ClaimPermissionsDto> GetRolePermissionsAsync(string role)
    {
        var availableClaims = GetAllAvailablePermissions();
        var roleClaims = await GetRoleClaimsAsync(role);

        return new ClaimPermissionsDto
        {
            Role = role,
            Claims = roleClaims.ToList(),
            AvailableClaims = availableClaims
        };
    }

    public async Task<RolePermissionsMatrixDto> GetPermissionsMatrixAsync()
    {
        var roles = Enum.GetValues<UserRole>().Select(r => r.ToString()).ToList();
        var permissions = GetAllAvailablePermissions();
        var matrix = new Dictionary<string, List<string>>();

        foreach (var role in roles)
        {
            var claims = await GetRoleClaimsAsync(role);
            matrix[role] = claims.Select(c => c.ClaimValue).ToList();
        }

        return new RolePermissionsMatrixDto
        {
            Roles = roles,
            Permissions = permissions,
            RolePermissions = matrix
        };
    }

    public async Task<IEnumerable<PermissionCategoryDto>> GetPermissionCategoriesAsync()
    {
        var allClaims = await _context.RoleClaims.ToListAsync();
        var categories = new List<PermissionCategoryDto>
        {
            new PermissionCategoryDto
            {
                Category = "Dashboard",
                Icon = "dashboard",
                Permissions = GetPermissionsByCategory("dashboard", allClaims)
            },
            new PermissionCategoryDto
            {
                Category = "Members",
                Icon = "people",
                Permissions = GetPermissionsByCategory("members", allClaims)
            },
            new PermissionCategoryDto
            {
                Category = "Contributions",
                Icon = "payments",
                Permissions = GetPermissionsByCategory("contributions", allClaims)
            },
            new PermissionCategoryDto
            {
                Category = "Investments",
                Icon = "trending_up",
                Permissions = GetPermissionsByCategory("investments", allClaims)
            },
            new PermissionCategoryDto
            {
                Category = "Accounts",
                Icon = "account_balance",
                Permissions = GetPermissionsByCategory("accounts", allClaims)
            },
            new PermissionCategoryDto
            {
                Category = "Reports",
                Icon = "assessment",
                Permissions = GetPermissionsByCategory("reports", allClaims)
            },
            new PermissionCategoryDto
            {
                Category = "Users & Roles",
                Icon = "admin_panel_settings",
                Permissions = GetPermissionsByCategory("users", allClaims)
            },
            new PermissionCategoryDto
            {
                Category = "Settings",
                Icon = "settings",
                Permissions = GetPermissionsByCategory("settings", allClaims)
            }
        };

        return categories;
    }

    private List<string> GetAllAvailablePermissions() => new()
    {
        "dashboard.view", "dashboard.export",
        "members.view", "members.create", "members.edit", "members.delete",
        "contributions.view", "contributions.create", "contributions.edit", "contributions.delete", "contributions.approve",
        "investments.view", "investments.create", "investments.edit", "investments.delete",
        "accounts.view", "accounts.create", "accounts.edit", "accounts.delete", "accounts.transfer",
        "reports.view", "reports.export", "reports.create",
        "users.view", "users.create", "users.edit", "users.delete", "users.manage_roles",
        "settings.view", "settings.manage"
    };

    private List<PermissionDto> GetPermissionsByCategory(string category, List<RoleClaim> existingClaims)
    {
        var allPerms = GetAllAvailablePermissions()
            .Where(p => p.StartsWith(category))
            .Select(p => new PermissionDto
            {
                Key = p,
                Name = GetPermissionName(p),
                Description = GetPermissionDescription(p),
                IsAssigned = existingClaims.Any(c => c.ClaimValue == p)
            })
            .ToList();

        return allPerms;
    }

    private string GetRoleDescription(string roleName) => roleName switch
    {
        "Admin" => "Full system access with all permissions",
        "Manager" => "Can manage members, contributions, and investments",
        "Member" => "Can view and manage own data",
        "Viewer" => "Read-only access to the system",
        _ => ""
    };

    private string GetPermissionName(string permission) => permission switch
    {
        "dashboard.view" => "View Dashboard",
        "dashboard.export" => "Export Dashboard Data",
        "members.view" => "View Members",
        "members.create" => "Create Members",
        "members.edit" => "Edit Members",
        "members.delete" => "Delete Members",
        "contributions.view" => "View Contributions",
        "contributions.create" => "Create Contributions",
        "contributions.edit" => "Edit Contributions",
        "contributions.delete" => "Delete Contributions",
        "contributions.approve" => "Approve Contributions",
        "investments.view" => "View Investments",
        "investments.create" => "Create Investments",
        "investments.edit" => "Edit Investments",
        "investments.delete" => "Delete Investments",
        "accounts.view" => "View Accounts",
        "accounts.create" => "Create Accounts",
        "accounts.edit" => "Edit Accounts",
        "accounts.delete" => "Delete Accounts",
        "accounts.transfer" => "Transfer Funds",
        "reports.view" => "View Reports",
        "reports.export" => "Export Reports",
        "reports.create" => "Create Reports",
        "users.view" => "View Users",
        "users.create" => "Create Users",
        "users.edit" => "Edit Users",
        "users.delete" => "Delete Users",
        "users.manage_roles" => "Manage User Roles",
        "settings.view" => "View Settings",
        "settings.manage" => "Manage Settings",
        _ => permission
    };

    private string GetPermissionDescription(string permission) => permission switch
    {
        "dashboard.view" => "Access to view dashboard statistics and charts",
        "dashboard.export" => "Export dashboard data to CSV/PDF",
        "members.view" => "View member list and details",
        "members.create" => "Add new members to the system",
        "members.edit" => "Modify existing member information",
        "members.delete" => "Remove members from the system",
        "contributions.view" => "View all contributions",
        "contributions.create" => "Record new contributions",
        "contributions.edit" => "Edit contribution records",
        "contributions.delete" => "Delete contribution records",
        "contributions.approve" => "Approve or reject contributions",
        "investments.view" => "View investment portfolio",
        "investments.create" => "Create new investments",
        "investments.edit" => "Edit investment details",
        "investments.delete" => "Delete investments",
        "accounts.view" => "View account balances and transactions",
        "accounts.create" => "Create new accounts",
        "accounts.edit" => "Edit account details",
        "accounts.delete" => "Delete accounts",
        "accounts.transfer" => "Transfer funds between accounts",
        "reports.view" => "Access reports and analytics",
        "reports.export" => "Export reports to CSV/PDF",
        "reports.create" => "Create custom reports",
        "users.view" => "View user list",
        "users.create" => "Create new users",
        "users.edit" => "Edit user information",
        "users.delete" => "Delete users",
        "users.manage_roles" => "Assign roles to users",
        "settings.view" => "View system settings",
        "settings.manage" => "Modify system settings",
        _ => ""
    };

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}
