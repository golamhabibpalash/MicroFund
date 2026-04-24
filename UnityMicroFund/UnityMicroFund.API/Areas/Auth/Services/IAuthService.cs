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
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<UserDto?> GetUserByIdAsync(Guid userId);
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
}
