namespace UnityMicroFund.API.Models;

/// <summary>
/// Once a project is completed its books are committed to a settlement, so the project
/// record (details, documents, cover image) becomes read-only. Only the lifecycle actions
/// (distribute, disburse, close) still move it forward.
/// </summary>
public static class InvestmentRecordLock
{
    public static bool IsLocked(InvestmentStatus status) => status is
        InvestmentStatus.Completed
        or InvestmentStatus.ProfitDistributed
        or InvestmentStatus.Closed
        or InvestmentStatus.Cancelled;

    /// <summary>A project with settled money must stay on record; a cancelled one has been refunded.</summary>
    public static bool CanDelete(InvestmentStatus status) => status is not
        (InvestmentStatus.Completed or InvestmentStatus.ProfitDistributed or InvestmentStatus.Closed);

    public static string Describe(InvestmentStatus status) => status switch
    {
        InvestmentStatus.ProfitDistributed => "Profit Distributed",
        _ => status.ToString()
    };
}
