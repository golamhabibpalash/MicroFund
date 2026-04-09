namespace UnityMicroFund.API.Infrastructure.Authorization;

public static class Policies
{
    public const string Admin = "AdminPolicy";
    public const string Manager = "ManagerPolicy";
    public const string Member = "MemberPolicy";
    public const string AdminOrManager = "AdminOrManagerPolicy";
}

public static class Permissions
{
    public const string CanManageMembers = "can_manage_members";
    public const string CanManageContributions = "can_manage_contributions";
    public const string CanManageInvestments = "can_manage_investments";
    public const string CanViewDashboard = "can_view_dashboard";
    public const string CanManageSettings = "can_manage_settings";
}
