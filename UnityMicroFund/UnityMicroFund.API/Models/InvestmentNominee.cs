using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// The nominee nominated on behalf of an <see cref="InvestmentPartner"/>. Exactly one
/// per partner. Like the partner, the details are a point-in-time record and are not
/// read back through any member relationship - the nominee is an external person.
///
/// Business rule: the nominee must be a different person from the partner, enforced by
/// comparing NID numbers during investment create/update.
/// </summary>
[Table("investment_nominees")]
public class InvestmentNominee
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvestmentPartnerId { get; set; }

    [ForeignKey(nameof(InvestmentPartnerId))]
    public virtual InvestmentPartner? Partner { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Nid { get; set; } = string.Empty;

    /// <summary>Relationship of the nominee to the partner, e.g. "Spouse".</summary>
    [MaxLength(50)]
    public string? Relation { get; set; }

    public DateTime CreatedAt { get; set; }
}
