using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Models;
using UnityMicroFund.API.Areas.Auth.Models;
using UnityMicroFund.API.Areas.Logging.Configuration;
using UnityMicroFund.API.Areas.Logging.Models;

namespace UnityMicroFund.API.Data;

public class AppDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    // Business entities whose create/update/delete operations are recorded in audit_logs.
    private static readonly HashSet<string> AuditedEntities = new()
    {
        nameof(Member), nameof(Investment), nameof(Contribution), nameof(MemberInvestment),
        nameof(Account), nameof(Transaction), nameof(GroupSetting), nameof(ParamBusConfig),
        nameof(InvestmentPartner), nameof(InvestmentDocument),
        nameof(WalletEntry), nameof(ShareSubscription), nameof(ProfitDistribution)
    };

    // httpContextAccessor is optional so design-time tooling (dotnet ef) can still construct the context.
    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DbSet<Member> Members { get; set; }
    public DbSet<Investment> Investments { get; set; }
    public DbSet<Contribution> Contributions { get; set; }
    public DbSet<MemberInvestment> MemberInvestments { get; set; }
    public DbSet<InvestmentPartner> InvestmentPartners { get; set; }
    public DbSet<InvestmentDocument> InvestmentDocuments { get; set; }
    public DbSet<WalletEntry> WalletEntries { get; set; }
    public DbSet<CashOutRequest> CashOutRequests { get; set; }
    public DbSet<ShareSubscription> ShareSubscriptions { get; set; }
    public DbSet<ProfitDistribution> ProfitDistributions { get; set; }
    public DbSet<MemberTransactionMap> MemberTransactionMaps { get; set; }
    public DbSet<GroupSetting> GroupSettings { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<ActivityLog> ActivityLogs { get; set; }
    public DbSet<RoleClaim> RoleClaims { get; set; }
    public DbSet<UserClaim> UserClaims { get; set; }
    public DbSet<Account> Accounts { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<RegistrationRequest> RegistrationRequests { get; set; }
    public DbSet<ChatRoom> ChatRooms { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<ChatRoomMember> ChatRoomMembers { get; set; }
    public DbSet<ParamBusConfig> ParamBusConfigs { get; set; }
    public DbSet<LogEntry> LogEntries { get; set; }
    public DbSet<PasswordResetCode> PasswordResetCodes { get; set; }
    public DbSet<InvestmentInterimProfit> InvestmentInterimProfits { get; set; }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = CaptureAuditEntries();
        var result = await base.SaveChangesAsync(cancellationToken);

        if (auditEntries.Count > 0)
        {
            AuditLogs.AddRange(auditEntries);
            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    public override int SaveChanges()
    {
        var auditEntries = CaptureAuditEntries();
        var result = base.SaveChanges();

        if (auditEntries.Count > 0)
        {
            AuditLogs.AddRange(auditEntries);
            base.SaveChanges();
        }

        return result;
    }

    /// <summary>
    /// Inspects the change tracker and builds an audit_logs row for every create/update/delete
    /// of an audited business entity. Captured before SaveChanges so original values are still available.
    /// </summary>
    private List<AuditLog> CaptureAuditEntries()
    {
        var auditLogs = new List<AuditLog>();

        var httpContext = _httpContextAccessor?.HttpContext;
        Guid? userId = Guid.TryParse(httpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid)
            ? uid
            : null;
        var userEmail = httpContext?.User.FindFirst(ClaimTypes.Email)?.Value;
        var ipAddress = httpContext?.Connection.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request.Headers.UserAgent.ToString();

        var jsonOptions = new JsonSerializerOptions { WriteIndented = false };

        foreach (var entry in ChangeTracker.Entries())
        {
            var entityName = entry.Entity.GetType().Name;
            if (!AuditedEntities.Contains(entityName))
                continue;

            string action;
            Dictionary<string, object?>? oldValues = null;
            Dictionary<string, object?>? newValues = null;

            switch (entry.State)
            {
                case EntityState.Added:
                    action = "CREATE";
                    newValues = entry.CurrentValues.Properties.ToDictionary(p => p.Name, p => entry.CurrentValues[p]);
                    break;

                case EntityState.Deleted:
                    action = "DELETE";
                    oldValues = entry.OriginalValues.Properties.ToDictionary(p => p.Name, p => entry.OriginalValues[p]);
                    break;

                case EntityState.Modified:
                    var modified = entry.Properties.Where(p => p.IsModified).ToList();
                    if (modified.Count == 0)
                        continue;
                    action = "UPDATE";
                    oldValues = modified.ToDictionary(p => p.Metadata.Name, p => p.OriginalValue);
                    newValues = modified.ToDictionary(p => p.Metadata.Name, p => p.CurrentValue);
                    break;

                default:
                    continue;
            }

            auditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                EntityName = entityName,
                Action = action,
                OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues, jsonOptions) : null,
                NewValues = newValues != null ? JsonSerializer.Serialize(newValues, jsonOptions) : null,
                Description = $"{action} {entityName}",
                UserId = userId,
                UserEmail = userEmail,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Timestamp = DateTime.UtcNow
            });
        }

        return auditLogs;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasIndex(e => e.Phone).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.UserId).IsUnique();  // enforce one Member per User at DB level
            entity.Property(e => e.MonthlyAmount).HasPrecision(18, 2);
            entity.Property(e => e.Gender).HasConversion<string>();

            // Legacy rows stored the profile image as a static path (/assets/member/...),
            // which nginx serves from the Angular dist (where uploads don't exist) and 404s in
            // production. Normalize on read so every consumer (profile, header, member list,
            // dashboard, chat) gets the API endpoint that streams from the writable uploads folder.
            // Idempotent: URLs that already use /api/profile/image/ are left unchanged.
            entity.Property(e => e.ProfileImageUrl)
                  .HasConversion(
                      v => v,
                      v => v.Replace("/assets/member/", "/api/profile/image/"));

            entity.HasOne(m => m.User)
                  .WithOne(u => u.Member)
                  .HasForeignKey<Member>(m => m.UserId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Investment>(entity =>
        {
            entity.Property(e => e.PrincipalAmount).HasPrecision(18, 2);
            entity.Property(e => e.CurrentValue).HasPrecision(18, 2);
            entity.Property(e => e.SharePrice).HasPrecision(18, 2);
            entity.Property(e => e.TargetGrossProfit).HasPrecision(18, 2);
            entity.Property(e => e.ActualGrossProfit).HasPrecision(18, 2);
            entity.Property(e => e.OperationalExpensePercentage).HasPrecision(5, 2);
            entity.Property(e => e.OperationalExpenseAmount).HasPrecision(18, 2);
            entity.Property(e => e.NetProfit).HasPrecision(18, 2);
            entity.Property(e => e.UndistributedRemainder).HasPrecision(18, 2);
            entity.Property(e => e.Type).HasConversion<string>();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);

            // MariaDB allows multiple NULLs in a unique index, so these enforce
            // "no duplicates" only for investments that actually carry a number.
            entity.HasIndex(e => e.CertificateNumber).IsUnique();
            entity.HasIndex(e => e.ReferenceNumber).IsUnique();
        });

        modelBuilder.Entity<InvestmentPartner>(entity =>
        {
            entity.HasOne(e => e.Investment)
                  .WithMany(i => i.Partners)
                  .HasForeignKey(e => e.InvestmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Unlinking a member must not delete the historical partner record.
            entity.HasOne(e => e.Member)
                  .WithMany()
                  .HasForeignKey(e => e.MemberId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.InvestmentId);
        });

        modelBuilder.Entity<InvestmentDocument>(entity =>
        {
            entity.HasOne(e => e.Investment)
                  .WithMany(i => i.Documents)
                  .HasForeignKey(e => e.InvestmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.InvestmentId);
        });

        modelBuilder.Entity<Contribution>(entity =>
        {
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.HasIndex(e => new { e.MemberId, e.Month, e.Year }).IsUnique();
        });

        modelBuilder.Entity<InvestmentInterimProfit>(entity =>
        {
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.HasOne(e => e.Investment)
                  .WithMany(i => i.InterimProfits)
                  .HasForeignKey(e => e.InvestmentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.InvestmentId);
            entity.HasIndex(e => new { e.InvestmentId, e.ProfitDate });
        });

        modelBuilder.Entity<MemberInvestment>(entity =>
        {
            entity.Property(e => e.SharePercentage).HasPrecision(9, 6);
            entity.Property(e => e.ShareValue).HasPrecision(18, 2);
            entity.Property(e => e.AmountInvested).HasPrecision(18, 2);
            entity.HasIndex(e => new { e.MemberId, e.InvestmentId }).IsUnique();
        });

        modelBuilder.Entity<WalletEntry>(entity =>
        {
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.EntryType).HasConversion<string>().HasMaxLength(20);

            // A funding transaction may only ever be credited once. This is what makes
            // the backfill safe to re-run and blocks double-crediting a deposit.
            entity.HasIndex(e => e.TransactionId).IsUnique();
            entity.HasIndex(e => new { e.MemberId, e.CreatedAt });

            entity.HasOne(e => e.Member)
                  .WithMany()
                  .HasForeignKey(e => e.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Transaction)
                  .WithMany()
                  .HasForeignKey(e => e.TransactionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Investment)
                  .WithMany()
                  .HasForeignKey(e => e.InvestmentId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CashOutRequest>(entity =>
        {
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.WalletBalanceAtRequest).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => new { e.MemberId, e.Status });
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Member)
                  .WithMany()
                  .HasForeignKey(e => e.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ShareSubscription>(entity =>
        {
            entity.Property(e => e.SharePriceAtPurchase).HasPrecision(18, 2);
            entity.Property(e => e.AmountPaid).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => new { e.InvestmentId, e.MemberId });

            entity.HasOne(e => e.Investment)
                  .WithMany(i => i.Subscriptions)
                  .HasForeignKey(e => e.InvestmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Member)
                  .WithMany()
                  .HasForeignKey(e => e.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProfitDistribution>(entity =>
        {
            entity.Property(e => e.PrincipalAmount).HasPrecision(18, 2);
            entity.Property(e => e.ProfitAmount).HasPrecision(18, 2);
            entity.Property(e => e.TotalPayable).HasPrecision(18, 2);
            entity.Property(e => e.OwnershipPercentage).HasPrecision(9, 6);

            // One settlement line per investor per project.
            entity.HasIndex(e => new { e.InvestmentId, e.MemberId }).IsUnique();

            entity.HasOne(e => e.Investment)
                  .WithMany(i => i.ProfitDistributions)
                  .HasForeignKey(e => e.InvestmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Member)
                  .WithMany()
                  .HasForeignKey(e => e.MemberId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MemberTransactionMap>(entity =>
        {
            entity.HasIndex(e => new { e.MemberId, e.TransactionId }).IsUnique();
        });

        modelBuilder.Entity<GroupSetting>(entity =>
        {
            entity.Property(e => e.SettingType).HasConversion<string>();
            entity.HasIndex(e => e.SettingType).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Role).HasConversion<string>();
        });

        modelBuilder.Entity<RoleClaim>(entity =>
        {
            entity.Property(e => e.Role).HasConversion<string>();
            entity.HasIndex(e => new { e.Role, e.ClaimType }).IsUnique();
        });

        modelBuilder.Entity<UserClaim>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.ClaimType }).IsUnique();
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.Property(e => e.Balance).HasPrecision(18, 2);
            entity.Property(e => e.AccountType).HasConversion<string>();
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.ApprovalStatus).HasConversion<string>();
            entity.HasIndex(e => e.TransactionId).IsUnique();
        });

        modelBuilder.Entity<ChatRoom>(entity =>
        {
            entity.Property(e => e.Type).HasConversion<string>();
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasIndex(e => new { e.ChatRoomId, e.CreatedAt });
        });

        modelBuilder.Entity<ChatRoomMember>(entity =>
        {
            entity.HasIndex(e => new { e.ChatRoomId, e.MemberId }).IsUnique();
        });

        modelBuilder.Entity<PasswordResetCode>(entity =>
        {
            entity.Property(e => e.Method).HasConversion<string>();
            entity.HasIndex(e => new { e.UserId, e.Method });

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.ApplyConfiguration(new LogEntryConfiguration());

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        
        var passwordHash = HashPassword("admin123");

        static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                Name = "System Admin",
                Email = "admin@unitymicrofund.com",
                PasswordHash = passwordHash,
                Role = UserRole.Admin,
                IsActive = true,
                IsApproved = true,
                CreatedAt = now,
                UpdatedAt = now
            }
        );

        modelBuilder.Entity<GroupSetting>().HasData(
            new GroupSetting
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                SettingType = GroupSettingsType.MonthlyContributionAmount,
                SettingName = "Default Monthly Contribution",
                SettingValue = "100.00",
                CreatedAt = now,
                UpdatedAt = now
            },
            new GroupSetting
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                SettingType = GroupSettingsType.GroupName,
                SettingName = "Group Name",
                SettingValue = "Unity MicroFund",
                CreatedAt = now,
                UpdatedAt = now
            },
            new GroupSetting
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                SettingType = GroupSettingsType.MaxMembers,
                SettingName = "Maximum Members",
                SettingValue = "50",
                CreatedAt = now,
                UpdatedAt = now
            }
        );

        modelBuilder.Entity<ParamBusConfig>().HasData(
            new ParamBusConfig
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                Name = "CompanyName",
                Value = "Unity MicroFund",
                Description = "Company or organization name",
                Status = true,
                LastModifiedDate = now,
                LastModifiedBy = "System",
                LastModifiedColumn = "Value"
            },
            new ParamBusConfig
            {
                Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                Name = "Currency",
                Value = "BDT",
                Description = "Default currency code",
                Status = true,
                LastModifiedDate = now,
                LastModifiedBy = "System",
                LastModifiedColumn = "Value"
            },
            new ParamBusConfig
            {
                Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                Name = "MinimumInvestment",
                Value = "1000",
                Description = "Minimum investment amount",
                Status = true,
                LastModifiedDate = now,
                LastModifiedBy = "System",
                LastModifiedColumn = "Value"
            },
            new ParamBusConfig
            {
                Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                Name = "PrimaryFundingAccount",
                Value = "",
                Description = "Primary funding account ID for transactions",
                Status = true,
                LastModifiedDate = now,
                LastModifiedBy = "System",
                LastModifiedColumn = "Value"
            }
        );
    }
}
