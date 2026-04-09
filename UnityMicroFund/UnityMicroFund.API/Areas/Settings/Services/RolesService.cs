using UnityMicroFund.API.Areas.Settings.DTOs;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Settings.Services;

public interface IRolesService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<bool> UpdateUserRoleAsync(Guid userId, string role);
    Task<IEnumerable<UserClaimDto>> GetUserClaimsAsync(Guid userId);
    Task<UserClaimDto> AddUserClaimAsync(CreateUserClaimDto dto);
    Task<bool> RemoveUserClaimAsync(Guid claimId);
    Task<IEnumerable<RoleClaimDto>> GetAllRoleClaimsAsync();
    Task<IEnumerable<RoleClaimDto>> GetRoleClaimsAsync(string role);
    Task<RoleClaimDto> AddRoleClaimAsync(CreateRoleClaimDto dto);
    Task<bool> RemoveRoleClaimAsync(Guid claimId);
    Task<ClaimPermissionsDto> GetRolePermissionsAsync(string role);
}

public class RolesService : IRolesService
{
    private readonly Data.AppDbContext _context;

    public RolesService(Data.AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        return await Task.FromResult(_context.Users.Select(u => new UserDto
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Role = u.Role.ToString(),
            Claims = new List<string>()
        }).ToList());
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

    public async Task<IEnumerable<UserClaimDto>> GetUserClaimsAsync(Guid userId)
    {
        return await Task.FromResult(_context.UserClaims
            .Where(c => c.UserId == userId)
            .Select(c => new UserClaimDto
            {
                Id = c.Id,
                UserId = c.UserId,
                UserName = c.User != null ? c.User.Name : "",
                ClaimType = c.ClaimType,
                ClaimValue = c.ClaimValue,
                Description = c.Description
            }).ToList());
    }

    public async Task<UserClaimDto> AddUserClaimAsync(CreateUserClaimDto dto)
    {
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
            UserName = "",
            ClaimType = claim.ClaimType,
            ClaimValue = claim.ClaimValue,
            Description = claim.Description
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

    public async Task<IEnumerable<RoleClaimDto>> GetAllRoleClaimsAsync()
    {
        return await Task.FromResult(_context.RoleClaims.Select(c => new RoleClaimDto
        {
            Id = c.Id,
            Role = c.Role.ToString(),
            ClaimType = c.ClaimType,
            ClaimValue = c.ClaimValue,
            Description = c.Description
        }).ToList());
    }

    public async Task<IEnumerable<RoleClaimDto>> GetRoleClaimsAsync(string role)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            return Enumerable.Empty<RoleClaimDto>();

        return await Task.FromResult(_context.RoleClaims
            .Where(c => c.Role == userRole)
            .Select(c => new RoleClaimDto
            {
                Id = c.Id,
                Role = c.Role.ToString(),
                ClaimType = c.ClaimType,
                ClaimValue = c.ClaimValue,
                Description = c.Description
            }).ToList());
    }

    public async Task<RoleClaimDto> AddRoleClaimAsync(CreateRoleClaimDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, true, out var userRole))
            throw new ArgumentException("Invalid role");

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

    public async Task<bool> RemoveRoleClaimAsync(Guid claimId)
    {
        var claim = await _context.RoleClaims.FindAsync(claimId);
        if (claim == null) return false;

        _context.RoleClaims.Remove(claim);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ClaimPermissionsDto> GetRolePermissionsAsync(string role)
    {
        var availableClaims = new List<string>
        {
            "members.view", "members.create", "members.edit", "members.delete",
            "contributions.view", "contributions.create", "contributions.edit", "contributions.delete",
            "investments.view", "investments.create", "investments.edit", "investments.delete",
            "dashboard.view", "reports.view", "settings.manage", "users.manage"
        };

        var roleClaims = await GetRoleClaimsAsync(role);

        return new ClaimPermissionsDto
        {
            Role = role,
            Claims = roleClaims.ToList(),
            AvailableClaims = availableClaims
        };
    }
}
