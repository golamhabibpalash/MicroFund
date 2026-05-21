using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UnityMicroFund.API.Areas.Logging.Models;

namespace UnityMicroFund.API.Areas.Logging.Configuration;

public class LogEntryConfiguration : IEntityTypeConfiguration<LogEntry>
{
    public void Configure(EntityTypeBuilder<LogEntry> builder)
    {
        builder.HasKey(l => l.LogId);

        builder.Property(l => l.LogLevel).HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(l => l.Timestamp);
        builder.HasIndex(l => l.LogLevel);
        builder.HasIndex(l => l.UserId);
        builder.HasIndex(l => l.Module);
        builder.HasIndex(l => l.CorrelationId);
        builder.HasIndex(l => new { l.Timestamp, l.LogLevel });
    }
}
