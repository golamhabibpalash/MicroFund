using UnityMicroFund.API.Areas.Auth.DTOs;
using UnityMicroFund.API.Areas.Auth.Models;

namespace UnityMicroFund.API.Areas.Auth.Services;

public interface IAuthService
{
    Task<AuthResponseDto?> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto?> RegisterWithMemberAsync(RegisterWithMemberDto dto);
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);
    Task<AuthResponseDto?> RefreshTokenAsync(string refreshToken);
    Task<AuthResponseDto?> GoogleLoginOrRegisterAsync(string googleToken);
    Task<AuthResponseDto?> FacebookLoginOrRegisterAsync(string facebookToken);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<bool> RequestPasswordResetAsync(ForgotPasswordDto dto);
    Task<bool> VerifyResetCodeAsync(VerifyResetCodeDto dto);
    Task<bool> ResetPasswordAsync(ResetPasswordDto dto);
    Task<UserDto?> GetUserByIdAsync(Guid userId);
    Task<User?> GetUserByEmailAsync(string email);
    Task<bool> UpdateUserAsync(User user);
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<AuthResponseDto?> CompleteSsoRegistrationAsync(Guid userId, SsoMemberRegistrationDto dto);
}
