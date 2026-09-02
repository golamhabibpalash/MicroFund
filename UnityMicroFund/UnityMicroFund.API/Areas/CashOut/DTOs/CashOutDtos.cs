namespace UnityMicroFund.API.Areas.CashOut.DTOs;

public class CreateCashOutRequestDto
{
    public decimal Amount { get; set; }
    public string? Remarks { get; set; }
}

public class CashOutRequestDto
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string? MemberName { get; set; }
    public string? MemberCode { get; set; }
    public string? MemberEmail { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string? AdminRemarks { get; set; }
    public DateTime RequestedAt { get; set; }
    public string? RequestedBy { get; set; }
    public DateTime? ActionedAt { get; set; }
    public string? ActionedBy { get; set; }
    public decimal? WalletBalanceAtRequest { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CashOutActionDto
{
    public bool IsApproved { get; set; }
    public string? AdminRemarks { get; set; }
}

public class CashOutBalanceDto
{
    public decimal Balance { get; set; }
    public decimal Pending { get; set; }
    public decimal Available { get; set; }
}
