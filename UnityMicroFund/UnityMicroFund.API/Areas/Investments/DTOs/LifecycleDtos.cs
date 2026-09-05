using System.ComponentModel.DataAnnotations;

namespace UnityMicroFund.API.Areas.Investments.DTOs;

public class ChangeInvestmentStatusDto
{
    [Required(ErrorMessage = "Target status is required.")]
    public string Status { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class CompleteInvestmentDto
{
    /// <summary>
    /// The gross amount received from the project. Backward-compatible: the service
    /// stores this into GrossReceivedAmount (formerly ActualGrossProfit).
    /// </summary>
    [Required(ErrorMessage = "Gross received amount is required.")]
    [Range(0, double.MaxValue, ErrorMessage = "Gross received amount cannot be negative.")]
    public decimal ActualGrossProfit { get; set; }

    public DateTime? CompletionDate { get; set; }

    [MaxLength(1000)]
    public string? ClosingNotes { get; set; }
}

/// <summary>What each investor is owed, frozen at distribution time.</summary>
public class ProfitDistributionDto
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public int SharesOwned { get; set; }
    public decimal OwnershipPercentage { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal ProfitAmount { get; set; }
    public decimal TotalPayable { get; set; }
    public DateTime DistributedAt { get; set; }
    public DateTime? DisbursedAt { get; set; }
}

/// <summary>Whole-project settlement summary (spec sections 11-13).</summary>
public class ProfitSettlementDto
{
    public Guid InvestmentId { get; set; }
    public string InvestmentName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

    /// <summary>Gross amount received from the project.</summary>
    public decimal ActualGrossProfit { get; set; }

    /// <summary>Total capital collected from investors.</summary>
    public decimal TotalInvested { get; set; }

    /// <summary>Total shares sold (active subscriptions).</summary>
    public int SharesSold { get; set; }

    /// <summary>Sum of accrued interim profit entries (included in net result).</summary>
    public decimal InterimProfitTotal { get; set; }

    /// <summary>Gross received + accrued interim profit before costs.</summary>
    public decimal GrossResult { get; set; }

    /// <summary>Sum of project costs (deducted from gross).</summary>
    public decimal TotalProjectCost { get; set; }

    /// <summary>Gross received + accrued interim profit − project costs.</summary>
    public decimal ValueAfterCosts { get; set; }

    public decimal MaintenancePercentage { get; set; }
    public decimal MaintenanceAmount { get; set; }

    /// <summary>The profit available for distribution: ValueAfterCosts − principal − maintenance.</summary>
    public decimal NetProfit { get; set; }

    /// <summary>The maintenance account the org fee was disbursed to (name, null if none).</summary>
    public string? MaintenanceAccountName { get; set; }

    /// <summary>Rounding remainder retained by the organisation.</summary>
    public decimal UndistributedRemainder { get; set; }

    public decimal TotalPrincipalReturned { get; set; }
    public decimal TotalProfitDistributed { get; set; }
    public decimal TotalPayable { get; set; }
    public List<ProfitDistributionDto> Distributions { get; set; } = new();
}

public class CreateInterimProfitDto
{
    [Required(ErrorMessage = "Profit amount is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Profit amount must be greater than zero.")]
    public decimal Amount { get; set; }

    [Required(ErrorMessage = "Profit date is required.")]
    public DateTime ProfitDate { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}

public class DisburseDto
{
    /// <summary>Null disburses to every investor who has not yet been paid.</summary>
    public Guid? MemberId { get; set; }
}
