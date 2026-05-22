using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using UnityMicroFund.API.Areas.Auth.DTOs;
using UnityMicroFund.API.Infrastructure.Configuration;
using UnityMicroFund.API.Areas.Auth.Models;
using UnityMicroFund.API.Areas.Tasks.Services;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.Email;
using UnityMicroFund.API.Infrastructure.Sms;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Auth.Services;

public class AuthService : IAuthService
{
    private readonly Data.AppDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly INotificationService _notificationService;
    private readonly HttpClient _httpClient;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;
    private readonly AdminSettings _adminSettings;

    private const int ResetCodeExpiryMinutes = 10;
    private const int MaxResetAttempts = 5;

    public AuthService(Data.AppDbContext context, IJwtService jwtService, IConfiguration configuration, INotificationService notificationService, HttpClient httpClient, IEmailService emailService, ISmsService smsService, IOptions<AdminSettings> adminSettings)
    {
        _context = context;
        _jwtService = jwtService;
        _configuration = configuration;
        _notificationService = notificationService;
        _httpClient = httpClient;
        _emailService = emailService;
        _smsService = smsService;
        _adminSettings = adminSettings.Value;
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

        var isAdmin = string.Equals(user.Email, _adminSettings.Email, StringComparison.OrdinalIgnoreCase);

        // Upgrade known admin users so they bypass member registration
        if (isAdmin)
        {
            user.Role = UserRole.Admin;
            user.IsApproved = true;
            user.IsActive = true;
        }
        
        // Check if user is not approved
        if (!user.IsApproved)
        {
            await _context.SaveChangesAsync();
            return new AuthResponseDto
            {
                User = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    IsActive = user.IsActive,
                    IsApproved = user.IsApproved
                },
                RequiresApproval = true,
                Message = "Your account is pending approval. Please wait for admin approval."
            };
        }
        
        // Check if user is not active (but is approved)
        if (!user.IsActive)
        {
            await _context.SaveChangesAsync();
            return new AuthResponseDto
            {
                User = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    IsActive = user.IsActive,
                    IsApproved = user.IsApproved
                },
                RequiresApproval = true,
                Message = "Your account has been deactivated. Please contact admin."
            };
        }
        
        // Check password
        if (string.IsNullOrEmpty(user.PasswordHash) || string.IsNullOrEmpty(dto.Password) || !VerifyPassword(dto.Password, user.PasswordHash))
        {
            return null;
        }

        if (isAdmin)
        {
            await _context.SaveChangesAsync();
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

    public async Task<AuthResponseDto?> GoogleLoginOrRegisterAsync(string googleToken)
    {
        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _configuration["Google:ClientId"] }
            };
            payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(googleToken, settings);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Google token validation failed: {ex.Message}");
            return null;
        }

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);
        var isAdmin = string.Equals(payload.Email, _adminSettings.Email, StringComparison.OrdinalIgnoreCase);

        if (existingUser != null)
        {
            if (!existingUser.IsActive)
            {
                return null;
            }

            existingUser.GoogleId = payload.Subject;
            existingUser.GoogleAccessToken = googleToken;
            existingUser.UpdatedAt = DateTime.UtcNow;

            if (isAdmin)
            {
                existingUser.Role = UserRole.Admin;
                existingUser.IsApproved = true;
                existingUser.IsActive = true;
                await _context.SaveChangesAsync();
                return await GenerateAuthResponseAsync(existingUser);
            }

            if (existingUser.IsApproved)
            {
                await _context.SaveChangesAsync();
                return await GenerateAuthResponseAsync(existingUser);
            }

            var hasMember = await _context.Members.AnyAsync(m => m.UserId == existingUser.Id);
            if (!hasMember)
            {
                await _context.SaveChangesAsync();
                var existingResult = await GenerateAuthResponseAsync(existingUser);
                existingResult.RequiresMemberRegistration = true;
                existingResult.Message = "Please complete your member registration.";
                return existingResult;
            }

            await _context.SaveChangesAsync();
            return new AuthResponseDto
            {
                User = new UserDto
                {
                    Id = existingUser.Id,
                    Name = existingUser.Name,
                    Email = existingUser.Email,
                    Role = existingUser.Role.ToString(),
                    IsActive = existingUser.IsActive,
                    IsApproved = existingUser.IsApproved
                },
                RequiresApproval = true,
                Message = "Your account is pending approval."
            };
        }

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Name = payload.Name ?? payload.Email,
            Email = payload.Email,
            GoogleId = payload.Subject,
            GoogleAccessToken = googleToken,
            Role = isAdmin ? UserRole.Admin : UserRole.Member,
            IsActive = true,
            IsApproved = isAdmin,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var newUserResult = await GenerateAuthResponseAsync(newUser);
        if (!isAdmin)
        {
            newUserResult.RequiresMemberRegistration = true;
            newUserResult.Message = "Please complete your member registration.";
        }
        return newUserResult;
    }

    public async Task<AuthResponseDto?> FacebookLoginOrRegisterAsync(string facebookToken)
    {
        FacebookUserInfo? facebookUser;
        try
        {
            var appSecret = _configuration["Facebook:AppSecret"];
            var appSecretProof = Convert.ToHexString(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(facebookToken + appSecret)
                )
            ).ToLowerInvariant();

            var response = await _httpClient.GetAsync(
                $"https://graph.facebook.com/me?access_token={facebookToken}&fields=id,name,email&appsecret_proof={appSecretProof}"
            );

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"Facebook token validation failed: {response.StatusCode}");
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            facebookUser = System.Text.Json.JsonSerializer.Deserialize<FacebookUserInfo>(json);

            if (facebookUser == null || string.IsNullOrEmpty(facebookUser.Id))
            {
                return null;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Facebook token validation failed: {ex.Message}");
            return null;
        }

        var email = facebookUser.Email ?? $"{facebookUser.Id}@facebook.com";
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        var isAdmin = string.Equals(email, _adminSettings.Email, StringComparison.OrdinalIgnoreCase);

        if (existingUser != null)
        {
            if (!existingUser.IsActive)
            {
                return null;
            }

            existingUser.FacebookId = facebookUser.Id;
            existingUser.FacebookAccessToken = facebookToken;
            existingUser.UpdatedAt = DateTime.UtcNow;

            if (isAdmin)
            {
                existingUser.Role = UserRole.Admin;
                existingUser.IsApproved = true;
                existingUser.IsActive = true;
                await _context.SaveChangesAsync();
                return await GenerateAuthResponseAsync(existingUser);
            }

            if (existingUser.IsApproved)
            {
                await _context.SaveChangesAsync();
                return await GenerateAuthResponseAsync(existingUser);
            }

            var hasMember = await _context.Members.AnyAsync(m => m.UserId == existingUser.Id);
            if (!hasMember)
            {
                await _context.SaveChangesAsync();
                var fbExistingResult = await GenerateAuthResponseAsync(existingUser);
                fbExistingResult.RequiresMemberRegistration = true;
                fbExistingResult.Message = "Please complete your member registration.";
                return fbExistingResult;
            }

            await _context.SaveChangesAsync();
            return new AuthResponseDto
            {
                User = new UserDto
                {
                    Id = existingUser.Id,
                    Name = existingUser.Name,
                    Email = existingUser.Email,
                    Role = existingUser.Role.ToString(),
                    IsActive = existingUser.IsActive,
                    IsApproved = existingUser.IsApproved
                },
                RequiresApproval = true,
                Message = "Your account is pending approval."
            };
        }

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Name = facebookUser.Name ?? facebookUser.Email ?? "Facebook User",
            Email = email,
            FacebookId = facebookUser.Id,
            FacebookAccessToken = facebookToken,
            Role = isAdmin ? UserRole.Admin : UserRole.Member,
            IsActive = true,
            IsApproved = isAdmin,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var fbNewUserResult = await GenerateAuthResponseAsync(newUser);
        if (!isAdmin)
        {
            fbNewUserResult.RequiresMemberRegistration = true;
            fbNewUserResult.Message = "Please complete your member registration.";
        }
        return fbNewUserResult;
    }

    public async Task<AuthResponseDto?> CompleteSsoRegistrationAsync(Guid userId, SsoMemberRegistrationDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        var existingMember = await _context.Members.AnyAsync(m => m.UserId == userId);
        if (existingMember)
        {
            return new AuthResponseDto
            {
                User = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    IsActive = user.IsActive,
                    IsApproved = user.IsApproved
                },
                RequiresApproval = true,
                Message = "You have already submitted your registration. Please wait for approval."
            };
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            user.Name = dto.Name;
            user.UpdatedAt = DateTime.UtcNow;

            var member = new Member
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Name = dto.Name,
                DateOfBirth = dto.DateOfBirth,
                Gender = Enum.TryParse<Gender>(dto.Gender, true, out var gender) ? gender : Gender.Other,
                Nationality = dto.Nationality,
                Phone = dto.Phone,
                AlternatePhone = dto.AlternatePhone,
                Email = user.Email,
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
                    $"User {user.Name} ({user.Email}) has completed SSO registration and is waiting for approval.",
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
                User = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    IsActive = user.IsActive,
                    IsApproved = user.IsApproved
                },
                RequiresApproval = true,
                Message = "Your registration has been submitted and is pending admin approval."
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !VerifyPassword(dto.CurrentPassword, user.PasswordHash))
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

    public async Task<bool> RequestPasswordResetAsync(ForgotPasswordDto dto)
    {
        if (!TryParseMethod(dto.Method, out var method))
        {
            return false;
        }

        var (user, destination) = await ResolveUserAsync(method, dto.Identifier);
        if (user == null || string.IsNullOrEmpty(destination))
        {
            return false;
        }

        // Invalidate any outstanding codes for this user + method.
        var existing = await _context.PasswordResetCodes
            .Where(c => c.UserId == user.Id && c.Method == method && c.ConsumedAt == null)
            .ToListAsync();
        _context.PasswordResetCodes.RemoveRange(existing);

        var code = GenerateResetCode();
        _context.PasswordResetCodes.Add(new PasswordResetCode
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Method = method,
            CodeHash = HashPassword(code),
            ExpiresAt = DateTime.UtcNow.AddMinutes(ResetCodeExpiryMinutes),
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        // Dispatch in the background so the HTTP response is not blocked by SMTP/SMS latency.
        if (method == PasswordResetMethod.Email)
        {
            _ = _emailService.SendPasswordResetCodeEmailAsync(destination, user.Name, code, ResetCodeExpiryMinutes);
        }
        else
        {
            var message = $"Your UnityMicroFund password reset code is: {code}. It expires in {ResetCodeExpiryMinutes} minutes.";
            _ = _smsService.SendSmsAsync(destination, message);
        }

        return true;
    }

    public async Task<bool> VerifyResetCodeAsync(VerifyResetCodeDto dto)
    {
        if (!TryParseMethod(dto.Method, out var method))
        {
            return false;
        }

        var (user, _) = await ResolveUserAsync(method, dto.Identifier);
        if (user == null)
        {
            return false;
        }

        var record = await GetActiveResetCodeAsync(user.Id, method);
        if (record == null)
        {
            return false;
        }

        record.AttemptCount++;
        if (record.AttemptCount > MaxResetAttempts)
        {
            record.ConsumedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return false;
        }

        var valid = record.CodeHash == HashPassword(dto.Code);
        if (valid)
        {
            record.IsVerified = true;
        }
        await _context.SaveChangesAsync();
        return valid;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
    {
        if (!TryParseMethod(dto.Method, out var method))
        {
            return false;
        }

        var (user, _) = await ResolveUserAsync(method, dto.Identifier);
        if (user == null)
        {
            return false;
        }

        var record = await GetActiveResetCodeAsync(user.Id, method);
        if (record == null || record.CodeHash != HashPassword(dto.Code))
        {
            return false;
        }

        user.PasswordHash = HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        record.ConsumedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<PasswordResetCode?> GetActiveResetCodeAsync(Guid userId, PasswordResetMethod method)
    {
        return await _context.PasswordResetCodes
            .Where(c => c.UserId == userId && c.Method == method && c.ConsumedAt == null && c.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();
    }

    private async Task<(User? User, string Destination)> ResolveUserAsync(PasswordResetMethod method, string identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return (null, string.Empty);
        }

        if (method == PasswordResetMethod.Email)
        {
            var email = identifier.Trim();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return (user, user?.Email ?? string.Empty);
        }

        var local = NormalizePhone(identifier);
        if (string.IsNullOrEmpty(local))
        {
            return (null, string.Empty);
        }

        var member = await _context.Members
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.UserId != null && m.Phone.Contains(local));
        return (member?.User, member?.Phone ?? string.Empty);
    }

    private static bool TryParseMethod(string method, out PasswordResetMethod parsed)
    {
        return Enum.TryParse(method, true, out parsed);
    }

    private static string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("880"))
        {
            digits = digits[3..];
        }
        else if (digits.StartsWith("0"))
        {
            digits = digits[1..];
        }
        return digits;
    }

    private static string GenerateResetCode()
    {
        return RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
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

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<bool> UpdateUserAsync(User user)
    {
        try
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return true;
        }
        catch
        {
            return false;
        }
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
                Role = user.Role.ToString(),
                IsActive = user.IsActive,
                IsApproved = user.IsApproved
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

internal class FacebookUserInfo
{
    public string Id { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Email { get; set; }
}
