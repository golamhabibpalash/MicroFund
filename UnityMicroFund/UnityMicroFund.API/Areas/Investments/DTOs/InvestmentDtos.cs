using System.ComponentModel.DataAnnotations;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.DTOs;

/// <summary>
/// Shared validation patterns. Client-side validation is a convenience, not a
/// boundary, so the same rules are enforced here.
/// </summary>
internal static class InvestmentValidation
{
    public const string PhonePattern = @"^(\+?88)?01[3-9]\d{8}$";
    public const string PhoneMessage = "Enter a valid Bangladeshi mobile number, e.g. 01712345678.";

    public const string NidPattern = @"^(\d{10}|\d{13}|\d{17})$";
    public const string NidMessage = "NID must be 10, 13 or 17 digits.";
}

public class InvestmentPartnerDto
{
    public Guid? Id { get; set; }

    /// <summary>Optional link to an existing member. Null for external partners.</summary>
    public Guid? MemberId { get; set; }

    [Required(ErrorMessage = "Partner name is required.")]
    [MaxLength(100)]
    public string PartnerName { get; set; } = string.Empty;

    [MaxLength(50)]
    [RegularExpression(InvestmentValidation.NidPattern, ErrorMessage = InvestmentValidation.NidMessage)]
    public string? Nid { get; set; }

    [Required(ErrorMessage = "Partner phone number is required.")]
    [MaxLength(20)]
    [RegularExpression(InvestmentValidation.PhonePattern, ErrorMessage = InvestmentValidation.PhoneMessage)]
    public string Phone1 { get; set; } = string.Empty;

    [MaxLength(20)]
    [RegularExpression(InvestmentValidation.PhonePattern, ErrorMessage = InvestmentValidation.PhoneMessage)]
    public string? Phone2 { get; set; }

    [MaxLength(100)]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    public string? Email { get; set; }

    [MaxLength(250)]
    public string? PresentAddress { get; set; }

    [MaxLength(250)]
    public string? PermanentAddress { get; set; }

    [MaxLength(100)]
    public string? NomineeName { get; set; }

    [MaxLength(50)]
    public string? NomineeRelationship { get; set; }

    [MaxLength(20)]
    [RegularExpression(InvestmentValidation.PhonePattern, ErrorMessage = InvestmentValidation.PhoneMessage)]
    public string? NomineeContact { get; set; }
}

public class InvestmentDocumentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? ContentType { get; set; }
    public long FileSizeBytes { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class CreateInvestmentDto
{
    [Required(ErrorMessage = "Investment name is required.")]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    /// <summary>
    /// Enum name, e.g. "Business". Typed as a string to match how every other DTO in
    /// the project passes enums; parsed in the service.
    /// </summary>
    [Required(ErrorMessage = "Investment type is required.")]
    public string Type { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Category { get; set; }

    /// <summary>The spec's "Investment Value".</summary>
    [Required(ErrorMessage = "Investment value is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Investment value must be greater than zero.")]
    public decimal PrincipalAmount { get; set; }

    /// <summary>Defaults to PrincipalAmount when omitted — a new investment has not moved yet.</summary>
    [Range(0.01, double.MaxValue, ErrorMessage = "Current value must be greater than zero.")]
    public decimal? CurrentValue { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Total shares must be greater than zero.")]
    public int? TotalShares { get; set; }

    /// <summary>
    /// Ignored on input - the server derives it as PrincipalAmount / TotalShares
    /// (spec section 3). Kept on the DTO so older clients posting it are not rejected.
    /// </summary>
    public decimal? SharePrice { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Minimum shares per member must be at least 1.")]
    public int? MinimumSharesPerMember { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Maximum shares per member must be at least 1.")]
    public int? MaximumSharesPerMember { get; set; }

    [Range(0, 100, ErrorMessage = "Maintenance percentage must be between 0 and 100.")]
    public decimal? MaintenancePercentage { get; set; }

    /// <summary>The organisation account that receives this project's maintenance amount.</summary>
    public Guid? MaintenanceAccountId { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Target gross profit cannot be negative.")]
    public decimal? TargetGrossProfit { get; set; }

    /// <summary>The spec's "Investment Start Date".</summary>
    [Required(ErrorMessage = "Investment start date is required.")]
    public DateTime DateInvested { get; set; }

    public DateTime? MaturityDate { get; set; }

    [Range(1, 1200, ErrorMessage = "Duration must be between 1 and 1200 months.")]
    public int? DurationMonths { get; set; }

    /// <summary>
    /// Enum name. New projects start in Draft and move through the lifecycle via the
    /// status endpoint rather than being created directly into a later state.
    /// </summary>
    public string Status { get; set; } = nameof(InvestmentStatus.Draft);

    [MaxLength(100)]
    public string? CertificateNumber { get; set; }

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    public List<InvestmentPartnerDto>? Partners { get; set; }

    /// <summary>
    /// Existing percentage-based ownership allocation across fund members.
    /// Unrelated to Partners, which records the counterparty on the investment.
    /// </summary>
    public List<Guid>? MemberIds { get; set; }
}

public class UpdateInvestmentDto
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    /// <summary>Enum name, e.g. "Business". Null leaves the current value.</summary>
    public string? Type { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "Investment value must be greater than zero.")]
    public decimal? PrincipalAmount { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "Current value must be greater than zero.")]
    public decimal? CurrentValue { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Total shares must be greater than zero.")]
    public int? TotalShares { get; set; }

    /// <summary>Ignored on input; re-derived from value / shares (section 3).</summary>
    public decimal? SharePrice { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Minimum shares per member must be at least 1.")]
    public int? MinimumSharesPerMember { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Maximum shares per member must be at least 1.")]
    public int? MaximumSharesPerMember { get; set; }

    [Range(0, 100, ErrorMessage = "Maintenance percentage must be between 0 and 100.")]
    public decimal? MaintenancePercentage { get; set; }

    /// <summary>The organisation account that receives this project's maintenance amount.</summary>
    public Guid? MaintenanceAccountId { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Target gross profit cannot be negative.")]
    public decimal? TargetGrossProfit { get; set; }

    public DateTime? DateInvested { get; set; }

    public DateTime? MaturityDate { get; set; }

    [Range(1, 1200, ErrorMessage = "Duration must be between 1 and 1200 months.")]
    public int? DurationMonths { get; set; }

    /// <summary>Enum name, e.g. "Matured". Null leaves the current value.</summary>
    public string? Status { get; set; }

    [MaxLength(100)]
    public string? CertificateNumber { get; set; }

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    /// <summary>
    /// When supplied, replaces the partner list wholesale. When null, partners are
    /// left untouched — so a caller updating only the status cannot wipe them.
    /// </summary>
    public List<InvestmentPartnerDto>? Partners { get; set; }
}

public class InvestmentResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal ReturnAmount { get; set; }
    public decimal ReturnPercentage { get; set; }
    public int? TotalShares { get; set; }
    public decimal? SharePrice { get; set; }
    public int? MinimumSharesPerMember { get; set; }
    public int? MaximumSharesPerMember { get; set; }

    // Section 8 - real-time share availability.
    public int SoldShares { get; set; }
    public int RemainingShares { get; set; }
    public decimal SubscriptionPercentage { get; set; }

    public decimal? TargetGrossProfit { get; set; }
    public decimal? ActualGrossProfit { get; set; }
    public decimal MaintenancePercentage { get; set; }
    public decimal? MaintenanceAmount { get; set; }
    public Guid? MaintenanceAccountId { get; set; }
    public decimal? NetProfit { get; set; }
    public decimal? UndistributedRemainder { get; set; }

    /// <summary>Alias of ActualGrossProfit - the gross amount received from the project.</summary>
    public decimal? GrossReceivedAmount { get; set; }

    /// <summary>Total capital collected from investors for this project.</summary>
    public decimal TotalInvested { get; set; }

    /// <summary>Shares currently sold (active subscriptions).</summary>
    public int TotalSharesSold { get; set; }

    /// <summary>Sum of all accrued interim profit entries.</summary>
    public decimal InterimProfitTotal { get; set; }

    /// <summary>Sum of all project cost entries.</summary>
    public decimal TotalProjectCost { get; set; }

    /// <summary>Gross received + interim profits − project costs; the basis for profit.</summary>
    public decimal ValueAfterCosts { get; set; }

    /// <summary>Individual project cost records (feed, labour, transport, etc.).</summary>
    public List<InvestmentProjectCostDto> ProjectCosts { get; set; } = new();

    public DateTime? CompletionDate { get; set; }
    public string? ClosingNotes { get; set; }

    public DateTime DateInvested { get; set; }
    public DateTime? MaturityDate { get; set; }
    public int? DurationMonths { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? CertificateNumber { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? LastModifiedBy { get; set; }
    public DateTime LastModifiedAt { get; set; }
    public List<MemberInvestmentDto> Members { get; set; } = new();
    public List<InvestmentPartnerDto> Partners { get; set; } = new();
    public List<InvestmentDocumentDto> Documents { get; set; } = new();
    public List<InterimProfitDto> InterimProfits { get; set; } = new();
}

public class InterimProfitDto
{
    public Guid Id { get; set; }
    public Guid InvestmentId { get; set; }
    public decimal Amount { get; set; }
    public DateTime ProfitDate { get; set; }
    public string? Remarks { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MemberInvestmentDto
{
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public decimal SharePercentage { get; set; }
    public decimal ShareValue { get; set; }
}

public class InvestmentProjectCostDto
{
    public Guid Id { get; set; }
    public Guid InvestmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Remarks { get; set; }
    public DateTime CostDate { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateProjectCostDto
{
    [Required(ErrorMessage = "Cost title is required.")]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "Cost amount must be greater than zero.")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime? CostDate { get; set; }
}

public class UpdateProjectCostDto
{
    [Required(ErrorMessage = "Cost title is required.")]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "Cost amount must be greater than zero.")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime? CostDate { get; set; }
}
