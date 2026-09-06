using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Versioning.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Versioning.Services;

public class VersioningService : IVersioningService
{
    private readonly AppDbContext _context;
    private readonly ILogger<VersioningService> _logger;

    public VersioningService(AppDbContext context, ILogger<VersioningService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AppVersionDto>> GetHistoryAsync(CancellationToken cancellationToken = default)
    {
        var versions = await _context.AppVersions
            .AsNoTracking()
            .Include(v => v.Changes)
            .OrderByDescending(v => v.SortOrder)
            .ToListAsync(cancellationToken);

        return versions.Select(ToDto).ToList();
    }

    public async Task<AppVersionDto?> GetCurrentAsync(CancellationToken cancellationToken = default)
    {
        var current = await _context.AppVersions
            .AsNoTracking()
            .Include(v => v.Changes)
            .Where(v => v.IsCurrent)
            .OrderByDescending(v => v.SortOrder)
            .FirstOrDefaultAsync(cancellationToken);

        current ??= await _context.AppVersions
            .AsNoTracking()
            .Include(v => v.Changes)
            .OrderByDescending(v => v.SortOrder)
            .FirstOrDefaultAsync(cancellationToken);

        return current == null ? null : ToDto(current);
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var existing = await _context.AppVersions
            .Include(v => v.Changes)
            .ToDictionaryAsync(v => v.Version, cancellationToken);

        var now = DateTime.UtcNow;
        var order = 0;

        foreach (var seed in ReleaseHistory)
        {
            order++;

            if (!existing.TryGetValue(seed.Version, out var version))
            {
                version = new AppVersion
                {
                    Id = Guid.NewGuid(),
                    Version = seed.Version,
                    CreatedAt = now
                };
                _context.AppVersions.Add(version);
                existing[seed.Version] = version;
            }

            var releaseDate = DateTime.SpecifyKind(seed.ReleaseDate, DateTimeKind.Utc);
            if (version.ReleaseDate != releaseDate) version.ReleaseDate = releaseDate;
            if (version.Title != seed.Title) version.Title = seed.Title;
            if (version.Summary != seed.Summary) version.Summary = seed.Summary;
            if (version.SortOrder != order) version.SortOrder = order;

            // Only rebuild the changelog when it actually differs, so an unchanged
            // release history is a genuine no-op on restart.
            var current = version.Changes
                .OrderBy(c => c.SortOrder)
                .Select(c => (c.Type, c.Description))
                .ToList();
            var desired = seed.Changes.Select(c => (c.Type, c.Description)).ToList();

            if (!current.SequenceEqual(desired))
            {
                if (version.Changes.Count > 0)
                {
                    _context.AppVersionChanges.RemoveRange(version.Changes);
                    version.Changes.Clear();
                }

                var changeOrder = 0;
                foreach (var change in seed.Changes)
                {
                    version.Changes.Add(new AppVersionChange
                    {
                        Id = Guid.NewGuid(),
                        AppVersionId = version.Id,
                        Type = change.Type,
                        Description = change.Description,
                        SortOrder = changeOrder++
                    });
                }
            }
        }

        var maxOrder = order;
        foreach (var version in existing.Values)
        {
            version.IsCurrent = version.SortOrder == maxOrder;
        }

        var written = await _context.SaveChangesAsync(cancellationToken);
        if (written > 0)
        {
            _logger.LogInformation("Version history seeded/refreshed ({Count} versions).", ReleaseHistory.Length);
        }
    }

    private static AppVersionDto ToDto(AppVersion v) => new(
        v.Id,
        v.Version,
        v.ReleaseDate,
        v.Title,
        v.Summary,
        v.IsCurrent,
        v.Changes
            .OrderBy(c => c.SortOrder)
            .Select(c => new AppVersionChangeDto(c.Type.ToString(), c.Description))
            .ToList());

    private sealed record SeedChange(AppVersionChangeType Type, string Description);

    private sealed record SeedVersion(
        string Version,
        DateTime ReleaseDate,
        string Title,
        string Summary,
        SeedChange[] Changes);

    private static SeedChange Feature(string d) => new(AppVersionChangeType.Feature, d);
    private static SeedChange Improvement(string d) => new(AppVersionChangeType.Improvement, d);
    private static SeedChange Fix(string d) => new(AppVersionChangeType.Fix, d);
    private static SeedChange Docs(string d) => new(AppVersionChangeType.Docs, d);
    private static SeedChange Chore(string d) => new(AppVersionChangeType.Chore, d);

    /// <summary>
    /// Built-in release history, oldest first. Reconstructed from the project's commit
    /// history. Append a new record here whenever a release ships — the startup seeder
    /// picks it up and moves the "current" marker to the newest entry.
    /// </summary>
    private static readonly SeedVersion[] ReleaseHistory =
    [
        new("0.1.0", new DateTime(2026, 4, 9), "Project kickoff",
            "First cut of the platform: Angular front end and ASP.NET Core API scaffolding.",
            [
                Feature("Angular front-end scaffolding and initial UI"),
                Feature("ASP.NET Core Web API project initiated")
            ]),

        new("0.2.0", new DateTime(2026, 4, 10), "Authentication & member records",
            "Users can sign in and register; the member and profile data model lands.",
            [
                Feature("Login and registration pages"),
                Feature("Member and profile data model")
            ]),

        new("0.3.0", new DateTime(2026, 4, 11), "Profile & investor management",
            "Profile and investor screens reworked; database moved to MariaDB.",
            [
                Improvement("Profile and investor pages reworked"),
                Chore("Migrated the database from PostgreSQL to MariaDB")
            ]),

        new("0.4.0", new DateTime(2026, 4, 13), "Transactions & notifications",
            "Transaction recording and in-app notifications arrive.",
            [
                Feature("Transaction recording"),
                Feature("In-app notifications"),
                Fix("Notification delivery issues")
            ]),

        new("0.5.0", new DateTime(2026, 4, 15), "User management",
            "Dedicated User Management screen plus assorted page clean-ups.",
            [
                Feature("User Management page"),
                Improvement("Various page refinements")
            ]),

        new("0.6.0", new DateTime(2026, 4, 24), "Receipt OCR",
            "Uploaded receipts are read automatically on the server.",
            [
                Feature("Backend OCR for uploaded receipts"),
                Feature("SBL transfer support"),
                Improvement("Profile and investor page updates")
            ]),

        new("0.7.0", new DateTime(2026, 5, 2), "Coding standards & structure",
            "Documented coding standards and a project-wide file/structure tidy-up.",
            [
                Docs("Backend and frontend coding standards"),
                Chore("Project restructure and file-naming cleanup")
            ]),

        new("0.8.0", new DateTime(2026, 5, 4), "Member status handling",
            "Active / inactive / approved member states behave correctly; list filters added.",
            [
                Fix("Active / inactive / approved member state handling"),
                Feature("List filtering")
            ]),

        new("0.9.0", new DateTime(2026, 5, 21), "Logging, navigation & email",
            "Application logging, a collapsible side navigation, and admin email notifications.",
            [
                Feature("Application logging system"),
                Feature("Collapsible side navigation with hover popovers and persisted state"),
                Feature("Email notifications on registration and transactions"),
                Feature("Established a 1:1 User–Member relationship"),
                Improvement("Responsive layout pass across all pages")
            ]),

        new("0.10.0", new DateTime(2026, 5, 22), "Google sign-in & branding",
            "Sign in with Google, and make the company name and logo configurable.",
            [
                Feature("Google SSO login"),
                Feature("Dynamic branding — configurable company name and logo with upload")
            ]),

        new("0.11.0", new DateTime(2026, 5, 23), "Auditing & deployment",
            "Automatic change auditing and an auto-deploy pipeline with a maintenance page.",
            [
                Feature("Automatic entity-change auditing via a SaveChanges override"),
                Feature("Maintenance page shown during deployments"),
                Feature("GitHub Actions auto-deploy pipeline"),
                Fix("Production crash on a read-only filesystem")
            ]),

        new("0.12.0", new DateTime(2026, 5, 26), "Layout polish",
            "Spacing, type scale and table density tuned for a more professional look.",
            [
                Improvement("Consistent spacing and refined layout"),
                Improvement("Reduced global font scale"),
                Improvement("Compact investors table")
            ]),

        new("0.13.0", new DateTime(2026, 5, 29), "Transaction dates & structured errors",
            "A transaction date field, transaction auditing, and structured API errors.",
            [
                Feature("Transaction date field; renamed SBL to PBL"),
                Feature("Audit logging on transactions"),
                Improvement("Structured error responses and exception handling")
            ]),

        new("0.14.0", new DateTime(2026, 6, 5), "Design system & Payments redesign",
            "Design tokens land and the Payments page is rebuilt on the brand palette.",
            [
                Feature("Design tokens and global component styles with the Inter font"),
                Feature("Export (Excel/CSV) and summary endpoints for transactions"),
                Feature("Dynamic \"Total Funded\" on Payments"),
                Improvement("Payments page redesigned to the brand palette")
            ]),

        new("0.15.0", new DateTime(2026, 6, 6), "Login redesign",
            "A modern login screen and a three-row header layout.",
            [
                Improvement("Login page redesigned for a modern, professional look"),
                Fix("Header layout aligned to a three-row structure"),
                Chore("Removed console logging across the app")
            ]),

        new("0.16.0", new DateTime(2026, 6, 8), "Password reset hardening",
            "Password reset copes with SMTP failures and no longer blocks on slow mail.",
            [
                Fix("Password reset send-failure handling and user-friendly errors"),
                Feature("Audit logging for email dispatch"),
                Improvement("Reset code dispatched in the background to avoid blocking on slow SMTP")
            ]),

        new("0.17.0", new DateTime(2026, 6, 9), "Dynamic dashboard & image serving",
            "The dashboard shows live data and images are served through the API.",
            [
                Feature("Dynamic Recent Activity and Top Investors on the dashboard"),
                Fix("Serve profile images and org logos via API endpoints instead of static files"),
                Fix("Google login and forgot-password error messaging")
            ]),

        new("0.18.0", new DateTime(2026, 6, 11), "Transaction lifecycle",
            "Transactions move through an explicit, status-based lifecycle.",
            [
                Feature("Status-based transaction lifecycle management")
            ]),

        new("1.0.0", new DateTime(2026, 8, 2), "First stable release",
            "UTC timestamps everywhere, shared UI primitives, and hardened OCR.",
            [
                Improvement("Serialize all API timestamps as explicit UTC"),
                Improvement("Shared TimeAgo pipe for consistent relative times"),
                Feature("Draggable modals via a shared directive"),
                Fix("Hardened PBL receipt OCR extraction; default transaction date to today")
            ]),

        new("1.1.0", new DateTime(2026, 8, 3), "Investment lifecycle",
            "End-to-end investment lifecycle with wallets, subscriptions, partners and documents.",
            [
                Feature("Investment lifecycle with wallet, share subscriptions, partners and documents")
            ]),

        new("1.2.0", new DateTime(2026, 9, 2), "Wallet, withdrawals & share limits",
            "Funding reconciliation, member cash-out, per-investment share limits and interim profits.",
            [
                Feature("Wallet funding reconciliation and member cash-out (withdraw) flow"),
                Feature("Per-investment share limits, interim profits and circulation flow"),
                Feature("UAT deployment pipeline"),
                Fix("Reports summary display, transaction columns and PDF export")
            ]),

        new("1.3.0", new DateTime(2026, 9, 3), "Maintenance accounts & project costs",
            "Profit-based maintenance fees, project cost tracking and a shared confirmation dialog.",
            [
                Feature("Maintenance account with a profit-based maintenance fee and project costs"),
                Feature("Shared two-step confirmation dialog for critical actions"),
                Improvement("Investment card redesign with status colour indicators and a share-availability bar"),
                Fix("Compute return / current value from realized funds instead of a stale stored value")
            ]),

        new("1.4.0", new DateTime(2026, 9, 4), "Accounts ledger & wallet history tools",
            "An expense/income ledger, an Available Balance card, and search tools on wallet history.",
            [
                Feature("Expense / income ledger, balance adjustment and account summary"),
                Feature("Available Balance card with Expenses & Income UI"),
                Feature("Live search, filter, sort and pagination on wallet Transaction History"),
                Feature("Mandatory participants, nominee and purchase agreement on investments"),
                Fix("Share investment losses proportionally instead of paying full principal")
            ]),

        new("1.5.0", new DateTime(2026, 9, 5), "Investor notifications & docs",
            "Investors are told when a project goes Active; document attachments served via the API.",
            [
                Feature("Notify each investor when their project goes Active"),
                Fix("Serve investment document attachments through the API"),
                Improvement("Replaced the description hover tooltip with a Read more button"),
                Docs("Added AGENTS.md with repo setup, run commands and conventions")
            ]),

        new("1.6.0", new DateTime(2026, 9, 5), "Accounts ledger search & pool semantics",
            "Search and paging on the accounts ledger, plus corrected pool and balance semantics.",
            [
                Feature("Ledger search, filter, sort and pagination"),
                Fix("Corrected pool and balance semantics")
            ]),

        new("1.7.0", new DateTime(2026, 9, 6), "Funding vs. investing on the dashboard",
            "Top Investors ranks by investing only; a new Top Funding section ranks by funding.",
            [
                Fix("Top Investors now ranks by investing amount only — never funding + investing combined"),
                Feature("New \"Top Funding\" dashboard section ranking members by funding amount"),
                Improvement("Explicit, unambiguous amount fields in the dashboard API")
            ])
    ];
}
