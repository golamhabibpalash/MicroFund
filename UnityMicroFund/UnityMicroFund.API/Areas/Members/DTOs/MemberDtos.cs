using System.ComponentModel.DataAnnotations;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Members.DTOs;

public class CreateMemberDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTime DateOfBirth { get; set; }

    [Required]
    public string Gender { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Nationality { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? AlternatePhone { get; set; }

    [MaxLength(100)]
    [EmailAddress]
    public string? Email { get; set; }

    [Required]
    [MaxLength(200)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Occupation { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? EmployerName { get; set; }

    [MaxLength(20)]
    public string? EmergencyContactName { get; set; }

    [Required]
    [MaxLength(20)]
    public string EmergencyContactPhone { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? EmergencyContactRelation { get; set; }

    [Required]
    [MaxLength(100)]
    public string NomineeName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? NomineeRelation { get; set; }

    [MaxLength(20)]
    public string? NomineePhone { get; set; }

    [Required]
    [MaxLength(50)]
    public string BankName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string AccountHolderName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string AccountNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string RoutingNumber { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? SwiftCode { get; set; }

    [MaxLength(500)]
    public string? ProfileImageUrl { get; set; }

    [MaxLength(500)]
    public string? DocumentUrl { get; set; }

    [MaxLength(500)]
    public string? SignatureUrl { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Monthly amount must be greater than 0")]
    public decimal MonthlyAmount { get; set; }

    [Required]
    public DateTime JoinDate { get; set; }

    public bool AcceptTerms { get; set; }
}

public class UpdateMemberDto
{
    [MaxLength(100)]
    public string? Name { get; set; }

    public DateTime? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    [MaxLength(100)]
    public string? Nationality { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(20)]
    public string? AlternatePhone { get; set; }

    [MaxLength(100)]
    [EmailAddress]
    public string? Email { get; set; }

    [MaxLength(200)]
    public string? Address { get; set; }

    [MaxLength(50)]
    public string? Occupation { get; set; }

    [MaxLength(100)]
    public string? EmployerName { get; set; }

    [MaxLength(20)]
    public string? EmergencyContactName { get; set; }

    [MaxLength(20)]
    public string? EmergencyContactPhone { get; set; }

    [MaxLength(50)]
    public string? EmergencyContactRelation { get; set; }

    [MaxLength(100)]
    public string? NomineeName { get; set; }

    [MaxLength(50)]
    public string? NomineeRelation { get; set; }

    [MaxLength(20)]
    public string? NomineePhone { get; set; }

    [MaxLength(50)]
    public string? BankName { get; set; }

    [MaxLength(50)]
    public string? AccountHolderName { get; set; }

    [MaxLength(30)]
    public string? AccountNumber { get; set; }

    [MaxLength(30)]
    public string? RoutingNumber { get; set; }

    [MaxLength(20)]
    public string? SwiftCode { get; set; }

    [MaxLength(500)]
    public string? ProfileImageUrl { get; set; }

    [MaxLength(500)]
    public string? DocumentUrl { get; set; }

    [MaxLength(500)]
    public string? SignatureUrl { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal? MonthlyAmount { get; set; }

    public DateTime? JoinDate { get; set; }

    public bool? IsActive { get; set; }
}

public class MemberResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Nationality { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? AlternatePhone { get; set; }
    public string? Email { get; set; }
    public string Address { get; set; } = string.Empty;
    public string Occupation { get; set; } = string.Empty;
    public string? EmployerName { get; set; }
    public string? EmergencyContactName { get; set; }
    public string EmergencyContactPhone { get; set; } = string.Empty;
    public string? EmergencyContactRelation { get; set; }
    public string NomineeName { get; set; } = string.Empty;
    public string? NomineeRelation { get; set; }
    public string? NomineePhone { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string RoutingNumber { get; set; } = string.Empty;
    public string? SwiftCode { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? DocumentUrl { get; set; }
    public string? SignatureUrl { get; set; }
    public decimal MonthlyAmount { get; set; }
    public DateTime JoinDate { get; set; }
    public string? MemberId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public decimal TotalContributions { get; set; }
    public int TotalInstallmentsPaid { get; set; }
    public decimal CurrentShareValue { get; set; }
    public decimal SharePercentage { get; set; }
}
