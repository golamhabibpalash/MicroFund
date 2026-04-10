using UnityMicroFund.API.Areas.Profile.DTOs;

namespace UnityMicroFund.API.Areas.Auth.Services;

public interface IProfileService
{
    Task<UserProfileDto?> GetProfileAsync(Guid userId);
    Task<UserProfileDto?> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
    Task<bool> UpdateProfileImageAsync(Guid userId, string? imageUrl);
}