namespace UnityMicroFund.API.Areas.Investments.DTOs;

public class WalletEntryDto
{
    public Guid Id { get; set; }
    public string EntryType { get; set; } = string.Empty;

    /// <summary>Signed: credits positive, debits negative.</summary>
    public decimal Amount { get; set; }

    /// <summary>Running balance after this entry, oldest to newest.</summary>
    public decimal BalanceAfter { get; set; }

    public Guid? InvestmentId { get; set; }
    public string? InvestmentName { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class WalletSummaryDto
{
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;

    // Enough member context for the wallet drawer to stand on its own.
    public string? MemberImageUrl { get; set; }
    public string? MemberCode { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Occupation { get; set; }
    public DateTime? JoinDate { get; set; }
    public bool IsActive { get; set; }

    /// <summary>Spendable balance = SUM of every entry.</summary>
    public decimal Balance { get; set; }

    public decimal TotalDeposited { get; set; }
    public decimal TotalInvested { get; set; }
    public decimal TotalProfitEarned { get; set; }
    public decimal TotalDisbursed { get; set; }
    public decimal TotalWithdrawn { get; set; }
    public List<WalletEntryDto> Entries { get; set; } = new();
}

public class SubscribeToInvestmentDto
{
    /// <summary>Admin-only: subscribe on another member's behalf. Ignored for self-service.</summary>
    public Guid? MemberId { get; set; }

    public int Shares { get; set; }

    /// <summary>
    /// The buyer's explicit acknowledgement of the investment agreement / caution.
    /// Must be true; the purchase is rejected server-side otherwise.
    /// </summary>
    public bool AgreementAccepted { get; set; }
}

public class ShareSubscriptionDto
{
    public Guid Id { get; set; }
    public Guid InvestmentId { get; set; }
    public string InvestmentName { get; set; } = string.Empty;
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public int SharesPurchased { get; set; }
    public decimal SharePriceAtPurchase { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal OwnershipPercentage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime PurchasedAt { get; set; }
}
