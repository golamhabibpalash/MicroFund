using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Settings.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Settings.Services;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _context;

    public SettingsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<GroupSetting>> GetAllSettingsAsync()
    {
        return await _context.GroupSettings.ToListAsync();
    }

    public async Task<GroupSetting?> GetSettingByTypeAsync(GroupSettingsType settingType)
    {
        return await _context.GroupSettings
            .FirstOrDefaultAsync(s => s.SettingType == settingType);
    }

    public async Task<GroupSetting?> UpdateSettingAsync(GroupSettingsType settingType, UpdateSettingDto dto)
    {
        var setting = await _context.GroupSettings
            .FirstOrDefaultAsync(s => s.SettingType == settingType);

        if (setting == null) return null;

        setting.SettingValue = dto.SettingValue;
        setting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return setting;
    }

    public async Task<decimal> GetMonthlyContributionAmountAsync()
    {
        var setting = await _context.GroupSettings
            .FirstOrDefaultAsync(s => s.SettingType == GroupSettingsType.MonthlyContributionAmount);

        if (setting == null || !decimal.TryParse(setting.SettingValue, out var amount))
        {
            return 100.00m;
        }

        return amount;
    }
}
