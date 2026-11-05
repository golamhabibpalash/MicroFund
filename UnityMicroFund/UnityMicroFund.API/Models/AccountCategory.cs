namespace UnityMicroFund.API.Models;

/// <summary>
/// The accounting class of an account. This is intentionally separate from
/// <see cref="AccountType"/>, which describes the operational fund a bank account
/// belongs to. Category drives the chart of accounts and the financial statements.
/// </summary>
public enum AccountCategory
{
    /// <summary>Cash, bank balances and other resources owned by the organisation.</summary>
    Asset,

    /// <summary>Amounts owed by the organisation to third parties.</summary>
    Liability,

    /// <summary>Members' capital and accumulated results.</summary>
    Equity,

    /// <summary>Revenue and other income earned.</summary>
    Income,

    /// <summary>Costs incurred in running the organisation.</summary>
    Expense
}
