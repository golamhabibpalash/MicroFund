using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// A supporting document attached to an investment. Files live on disk under the
/// configured Uploads:InvestmentDocumentsPath and are served from /assets/investment.
/// </summary>
[Table("investment_documents")]
public class InvestmentDocument
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FileUrl { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ContentType { get; set; }

    public long FileSizeBytes { get; set; }

    [MaxLength(100)]
    public string? UploadedBy { get; set; }

    public DateTime UploadedAt { get; set; }
}
