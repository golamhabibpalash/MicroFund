using System.ComponentModel.DataAnnotations;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.DTOs;

public class CreateInvestmentDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public InvestmentType Type { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal PrincipalAmount { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal CurrentValue { get; set; }

    [Required]
    public DateTime DateInvested { get; set; }

    public List<Guid>? MemberIds { get; set; }
}

public class UpdateInvestmentDto
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    public InvestmentType? Type { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal? PrincipalAmount { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal? CurrentValue { get; set; }

    public DateTime? DateInvested { get; set; }
}

public class InvestmentResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal PrincipalAmount { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal ReturnAmount { get; set; }
    public decimal ReturnPercentage { get; set; }
    public DateTime DateInvested { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<MemberInvestmentDto> Members { get; set; } = new();
}

public class MemberInvestmentDto
{
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public decimal SharePercentage { get; set; }
    public decimal ShareValue { get; set; }
}
