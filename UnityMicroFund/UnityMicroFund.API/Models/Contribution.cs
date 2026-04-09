using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum ContributionStatus
{
    Paid,
    Pending,
    Overdue
}

[Table("contributions")]
public class Contribution
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(20)]
    public string Month { get; set; } = string.Empty;

    [Required]
    public int Year { get; set; }

    [Required]
    public ContributionStatus Status { get; set; } = ContributionStatus.Pending;

    public DateTime? PaidDate { get; set; }

    public DateTime CreatedAt { get; set; }
}
