using UnityMicroFund.API.Areas.Contributions.DTOs;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Contributions.Services;

public interface IContributionService
{
    Task<ContributionSummaryDto> GetContributionsAsync(Guid? memberId = null, int? year = null, string? month = null, ContributionStatus? status = null);
    Task<ContributionResponseDto?> GetContributionByIdAsync(Guid id);
    Task<ContributionResponseDto> CreateContributionAsync(CreateContributionDto dto);
    Task<ContributionResponseDto?> UpdateContributionStatusAsync(Guid id, UpdateContributionStatusDto dto);
    Task<bool> DeleteContributionAsync(Guid id);
    Task<ContributionSummaryDto> GenerateMonthlyContributionsAsync(int? year = null, string? month = null);
}
