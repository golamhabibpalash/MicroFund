using UnityMicroFund.API.Areas.Settings.DTOs;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Settings.Services;

public interface ISettingsService
{
    Task<IEnumerable<GroupSetting>> GetAllSettingsAsync();
    Task<GroupSetting?> GetSettingByTypeAsync(GroupSettingsType settingType);
    Task<GroupSetting?> UpdateSettingAsync(GroupSettingsType settingType, UpdateSettingDto dto);
    Task<decimal> GetMonthlyContributionAmountAsync();
}
