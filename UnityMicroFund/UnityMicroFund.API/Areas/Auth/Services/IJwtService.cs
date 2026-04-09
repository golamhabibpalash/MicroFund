using UnityMicroFund.API.Areas.Auth.DTOs;
using UnityMicroFund.API.Areas.Auth.Models;

namespace UnityMicroFund.API.Areas.Auth.Services;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    (string token, DateTime expiry) GenerateRefreshToken();
    int GetRefreshTokenValidityDays();
}
