using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UnityMicroFund.API.Areas.Auth.Models;

namespace UnityMicroFund.API.Models;

public enum Gender
{
    Male,
    Female,
    Other
}

[Table("members")]
public class Member
{
    [Key]
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTime DateOfBirth { get; set; }

    [Required]
    public Gender Gender { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nationality { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? AlternatePhone { get; set; }

    [MaxLength(100)]
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
    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyAmount { get; set; }

    [Required]
    public DateTime JoinDate { get; set; }

    [MaxLength(20)]
    public string? MemberId { get; set; }

    public bool IsActive { get; set; } = true;

    public bool AcceptTerms { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Contribution> Contributions { get; set; } = new List<Contribution>();
    public virtual ICollection<MemberInvestment> MemberInvestments { get; set; } = new List<MemberInvestment>();
}
