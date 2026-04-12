using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UnityMicroFund.API.Areas.Auth.Models;

namespace UnityMicroFund.API.Models;

[Table("transactions")]
public class Transaction
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string RefNo { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string TransferFor { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    public TransactionStatus Status { get; set; }

    public TransactionApprovalStatus ApprovalStatus { get; set; } = TransactionApprovalStatus.Pending;

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public Guid? ApprovedBy { get; set; }

    [ForeignKey(nameof(ApprovedBy))]
    public virtual User? ApprovedByUser { get; set; }

    public DateTime? ApprovedAt { get; set; }

    [Required]
    public Guid TransferById { get; set; }

    [ForeignKey(nameof(TransferById))]
    public virtual User? TransferBy { get; set; }

    [Required]
    public Guid CreatedById { get; set; }

    [ForeignKey(nameof(CreatedById))]
    public virtual User? CreatedBy { get; set; }

    [Required]
    public Guid AccountId { get; set; }

    [ForeignKey(nameof(AccountId))]
    public virtual Account? Account { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
