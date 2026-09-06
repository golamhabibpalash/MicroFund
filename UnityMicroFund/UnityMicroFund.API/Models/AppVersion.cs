using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>
/// One released version of the platform. The full history is what the
/// footer "version" link expands into. Rows are seeded from the project's
/// change history on startup and can be appended to as new releases ship.
/// </summary>
[Table("app_versions")]
public class AppVersion
{
    [Key]
    public Guid Id { get; set; }

    /// <summary>Semantic version string, e.g. "1.7.0".</summary>
    [Required]
    [MaxLength(20)]
    public string Version { get; set; } = string.Empty;

    [Required]
    public DateTime ReleaseDate { get; set; }

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Summary { get; set; }

    /// <summary>
    /// Higher means newer. Drives ordering so releases that share a date
    /// still sort deterministically.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>True for exactly one row — the version currently deployed.</summary>
    public bool IsCurrent { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<AppVersionChange> Changes { get; set; } = new List<AppVersionChange>();
}
