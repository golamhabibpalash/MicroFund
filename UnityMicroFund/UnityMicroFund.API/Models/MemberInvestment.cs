using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

[Table("member_investments")]
public class MemberInvestment
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    [Required]
    [Column(TypeName = "decimal(5,2)")]
    public decimal SharePercentage { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ShareValue { get; set; }

    public DateTime CreatedAt { get; set; }
}
