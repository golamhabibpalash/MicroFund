using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Models;
using UnityMicroFund.API.Areas.Auth.Models;

namespace UnityMicroFund.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Member> Members { get; set; }
    public DbSet<Investment> Investments { get; set; }
    public DbSet<Contribution> Contributions { get; set; }
    public DbSet<MemberInvestment> MemberInvestments { get; set; }
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasIndex(e => e.Phone).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.Property(e => e.MonthlyAmount).HasPrecision(18, 2);
            entity.Property(e => e.Gender).HasConversion<string>();
        });

        modelBuilder.Entity<Investment>(entity =>
        {
            entity.Property(e => e.PrincipalAmount).HasPrecision(18, 2);
            entity.Property(e => e.CurrentValue).HasPrecision(18, 2);
            entity.Property(e => e.Type).HasConversion<string>();
        });

        modelBuilder.Entity<Contribution>(entity =>
        {
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.HasIndex(e => new { e.MemberId, e.Month, e.Year }).IsUnique();
        });

        modelBuilder.Entity<MemberInvestment>(entity =>
        {
            entity.Property(e => e.SharePercentage).HasPrecision(5, 2);
            entity.Property(e => e.ShareValue).HasPrecision(18, 2);
            entity.HasIndex(e => new { e.MemberId, e.InvestmentId }).IsUnique();
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
            entity.HasIndex(e => e.RefNo).IsUnique();
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
    }
}
