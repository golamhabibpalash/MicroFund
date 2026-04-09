using UnityMicroFund.API.Areas.Dashboard.DTOs;

namespace UnityMicroFund.API.Areas.Dashboard.Services;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync();
}
