using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

/// <summary>How a single changelog line should be categorised and badged in the UI.</summary>
public enum AppVersionChangeType
{
    Feature,
    Improvement,
    Fix,
    Docs,
    Chore
}

/// <summary>One line item within an <see cref="AppVersion"/>'s changelog.</summary>
[Table("app_version_changes")]
public class AppVersionChange
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid AppVersionId { get; set; }

    [ForeignKey(nameof(AppVersionId))]
    public virtual AppVersion? AppVersion { get; set; }

    [Required]
    public AppVersionChangeType Type { get; set; }

    [Required]
    [MaxLength(300)]
    public string Description { get; set; } = string.Empty;

    /// <summary>Order within the parent version's list (ascending).</summary>
    public int SortOrder { get; set; }
}
