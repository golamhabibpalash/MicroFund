using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// A partner on an investment. Modelled one-to-many from the start so additional
/// partners can be recorded without a structural change.
///
/// When <see cref="MemberId"/> is set the row is linked to a fund member, but the
/// contact details are still stored here rather than read through the relationship:
/// an investment is a point-in-time record and must not change retroactively if the
/// member later edits their profile.
/// </summary>
[Table("investment_partners")]
public class InvestmentPartner
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvestmentId { get; set; }

    [ForeignKey(nameof(InvestmentId))]
    public virtual Investment? Investment { get; set; }

    /// <summary>
    /// Optional link to an existing member. Null for external partners.
    /// </summary>
    public Guid? MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    [Required]
    [MaxLength(100)]
    public string PartnerName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Nid { get; set; }

    [Required]
    [MaxLength(20)]
    public string Phone1 { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone2 { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    [MaxLength(250)]
    public string? PresentAddress { get; set; }

    [MaxLength(250)]
    public string? PermanentAddress { get; set; }

    [MaxLength(100)]
    public string? NomineeName { get; set; }

    [MaxLength(50)]
    public string? NomineeRelationship { get; set; }

    [MaxLength(20)]
    public string? NomineeContact { get; set; }

    public DateTime CreatedAt { get; set; }
}
