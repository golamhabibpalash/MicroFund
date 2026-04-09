using System.ComponentModel.DataAnnotations;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Contributions.DTOs;

public class CreateContributionDto
{
    [Required]
    public Guid MemberId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(20)]
    public string Month { get; set; } = string.Empty;

    [Required]
    [Range(2000, 2100)]
    public int Year { get; set; }

    public ContributionStatus Status { get; set; } = ContributionStatus.Pending;
}

public class UpdateContributionStatusDto
{
    [Required]
    public ContributionStatus Status { get; set; }
}

public class ContributionResponseDto
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Month { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? PaidDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ContributionSummaryDto
{
    public int TotalContributions { get; set; }
    public decimal TotalAmount { get; set; }
    public int PaidCount { get; set; }
    public int PendingCount { get; set; }
    public int OverdueCount { get; set; }
    public List<ContributionResponseDto> RecentContributions { get; set; } = new();
}
