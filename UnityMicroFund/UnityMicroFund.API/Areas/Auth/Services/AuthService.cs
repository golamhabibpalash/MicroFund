using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using UnityMicroFund.API.Areas.Auth.DTOs;
using UnityMicroFund.API.Areas.Auth.Models;
using UnityMicroFund.API.Areas.Tasks.Services;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Auth.Services;

public class AuthService : IAuthService
{
    private readonly Data.AppDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly INotificationService _notificationService;

    public AuthService(Data.AppDbContext context, IJwtService jwtService, IConfiguration configuration, INotificationService notificationService)
    {
        _context = context;
        _jwtService = jwtService;
        _configuration = configuration;
        _notificationService = notificationService;
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return null;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = HashPassword(dto.Password),
            Role = Enum.TryParse<UnityMicroFund.API.Models.UserRole>(dto.Role, true, out var role) ? role : UnityMicroFund.API.Models.UserRole.Member,
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _notificationService.CreateRegistrationRequestAsync(user.Id, user.Email, user.Name);

        var admins = await _context.Users.Where(u => u.Role == UnityMicroFund.API.Models.UserRole.Admin && u.IsActive).ToListAsync();
        foreach (var admin in admins)
        {
            await _notificationService.CreateNotificationAsync(
                "New Registration Request",
                $"User {user.Name} ({user.Email}) has registered and is waiting for approval.",
                NotificationType.RegistrationApproval,
                admin.Id,
                user.Id,
                user.Id
            );
        }

        return new AuthResponseDto
        {
            Message = "Registration pending approval"
        };
    }

    public async Task<AuthResponseDto?> RegisterWithMemberAsync(RegisterWithMemberDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return null;
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = HashPassword(dto.Password),
                Role = Enum.TryParse<UnityMicroFund.API.Models.UserRole>(dto.Role, true, out var role) ? role : UnityMicroFund.API.Models.UserRole.Member,
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);

            var member = new UnityMicroFund.API.Models.Member
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Name = dto.Name,
                DateOfBirth = dto.DateOfBirth,
                Gender = Enum.TryParse<UnityMicroFund.API.Models.Gender>(dto.Gender, true, out var gender) ? gender : UnityMicroFund.API.Models.Gender.Other,
                Nationality = dto.Nationality,
                Phone = dto.Phone,
                AlternatePhone = dto.AlternatePhone,
                Email = dto.Email,
                Address = dto.Address,
                Occupation = dto.Occupation,
                EmployerName = dto.EmployerName,
                EmergencyContactName = dto.EmergencyContactName,
                EmergencyContactPhone = dto.EmergencyContactPhone,
                EmergencyContactRelation = dto.EmergencyContactRelation,
                NomineeName = dto.NomineeName,
                NomineeRelation = dto.NomineeRelation,
                NomineePhone = dto.NomineePhone,
                BankName = dto.BankName,
                AccountHolderName = dto.AccountHolderName,
                AccountNumber = dto.AccountNumber,
                RoutingNumber = dto.RoutingNumber,
                SwiftCode = dto.SwiftCode,
                MonthlyAmount = dto.MonthlyAmount,
                JoinDate = DateTime.UtcNow,
                AcceptTerms = dto.AcceptTerms,
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Members.Add(member);

            await _context.SaveChangesAsync();

            await _notificationService.CreateRegistrationRequestAsync(user.Id, user.Email, user.Name, member.Id);

            var admins = await _context.Users.Where(u => u.Role == UnityMicroFund.API.Models.UserRole.Admin && u.IsActive).ToListAsync();
            foreach (var admin in admins)
            {
                await _notificationService.CreateNotificationAsync(
                    "New Registration Request",
                    $"User {user.Name} ({user.Email}) has registered as a member and is waiting for approval.",
                    NotificationType.RegistrationApproval,
                    admin.Id,
                    user.Id,
                    user.Id,
                    member.Id
                );
            }

            await transaction.CommitAsync();

            return new AuthResponseDto
            {
                Message = "Registration pending approval"
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        
        if (user == null)
        {
            return null;
        }
        
        if (!user.IsActive)
        {
            return null;
        }
        
        if (!VerifyPassword(dto.Password, user.PasswordHash))
        {
            return null;
        }

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto?> RefreshTokenAsync(string refreshToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => 
            u.RefreshToken == refreshToken && 
            u.RefreshTokenExpiry > DateTime.UtcNow &&
            u.IsActive);

        if (user == null)
        {
            return null;
        }

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _context.SaveChangesAsync();

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !VerifyPassword(dto.CurrentPassword, user.PasswordHash))
        {
            return false;
        }

        user.PasswordHash = HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString()
        };
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .Where(u => u.IsActive)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role.ToString()
            })
            .ToListAsync();
    }

    private async Task<AuthResponseDto> GenerateAuthResponseAsync(User user)
    {
        var accessToken = _jwtService.GenerateAccessToken(user);
        var (refreshToken, refreshExpiry) = _jwtService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = refreshExpiry;
        await _context.SaveChangesAsync();

        var expiryMinutes = int.Parse(_configuration["Jwt:ExpiryMinutes"] ?? "60");

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            User = new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString()
            }
        };
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private static bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }
}
