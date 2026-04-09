using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum GroupSettingsType
{
    MonthlyContributionAmount,
    GroupName,
    MaxMembers,
    InvestmentCycleMonths
}

[Table("group_settings")]
public class GroupSetting
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public GroupSettingsType SettingType { get; set; }

    [Required]
    [MaxLength(200)]
    public string SettingName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string SettingValue { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
