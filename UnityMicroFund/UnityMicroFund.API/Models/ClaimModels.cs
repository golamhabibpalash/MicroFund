using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UnityMicroFund.API.Areas.Auth.Models;

namespace UnityMicroFund.API.Models;

[Table("role_claims")]
public class RoleClaim
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public UserRole Role { get; set; }

    [Required]
    [MaxLength(100)]
    public string ClaimType { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string ClaimValue { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("user_claims")]
public class UserClaim
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string ClaimType { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string ClaimValue { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }
}
