using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Areas.Auth.Models;

[Table("users")]
public class User
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    public string? PasswordHash { get; set; }

    [Required]
    public UnityMicroFund.API.Models.UserRole Role { get; set; } = UnityMicroFund.API.Models.UserRole.Member;

    public bool IsActive { get; set; } = true;

    public string? RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiry { get; set; }

    [MaxLength(500)]
    public string? GoogleId { get; set; }

    [MaxLength(500)]
    public string? GoogleAccessToken { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
