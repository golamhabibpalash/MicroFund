using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public class InvestmentService : IInvestmentService
{
    private readonly AppDbContext _context;
    private readonly IInvestmentSettings _settings;

    public InvestmentService(AppDbContext context, IInvestmentSettings settings)
    {
        _context = context;
        _settings = settings;
    }

    /// <summary>
    /// Spec section 3: share price is always Total Project Value / Total Shares,
    /// never whatever the client happened to send.
    /// </summary>
    private static decimal? DeriveSharePrice(decimal principalAmount, int? totalShares)
        => totalShares is > 0 ? Math.Round(principalAmount / totalShares.Value, 2, MidpointRounding.AwayFromZero) : null;

    public async Task<IEnumerable<InvestmentResponseDto>> GetInvestmentsAsync(
        InvestmentType? type = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Investments.AsNoTracking();

        if (type.HasValue)
        {
            query = query.Where(i => i.Type == type.Value);
        }

        var investments = await query
            .Include(i => i.MemberInvestments)
                .ThenInclude(mi => mi.Member)
            .Include(i => i.InvestorMember)
            .Include(i => i.WitnessMember)
            .Include(i => i.GuarantorMember)
            .Include(i => i.Partners)
                .ThenInclude(p => p.Nominee)
            .Include(i => i.Documents)
            .Include(i => i.Subscriptions)
            .Include(i => i.InterimProfits)
            .Include(i => i.ProjectCosts)
            .OrderByDescending(i => i.DateInvested)
            .ToListAsync(cancellationToken);

        return investments.Select(MapToDto);
    }

    public async Task<IEnumerable<InvestmentResponseDto>> GetPublishedInvestmentsAsync(
        InvestmentType? type = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Investments.AsNoTracking()
            .Where(i => i.Status != InvestmentStatus.Draft && i.Status != InvestmentStatus.Cancelled);

        if (type.HasValue)
        {
            query = query.Where(i => i.Type == type.Value);
        }

        var investments = await query
            .Include(i => i.MemberInvestments)
                .ThenInclude(mi => mi.Member)
            .Include(i => i.InvestorMember)
            .Include(i => i.WitnessMember)
            .Include(i => i.GuarantorMember)
            .Include(i => i.Partners)
                .ThenInclude(p => p.Nominee)
            .Include(i => i.Documents)
            .Include(i => i.Subscriptions)
            .Include(i => i.InterimProfits)
            .Include(i => i.ProjectCosts)
            .OrderByDescending(i => i.DateInvested)
            .ToListAsync(cancellationToken);

        return investments.Select(MapToDto);
    }

    public async Task<InvestmentResponseDto?> GetInvestmentByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var investment = await _context.Investments
            .AsNoTracking()
            .Include(i => i.MemberInvestments)
                .ThenInclude(mi => mi.Member)
            .Include(i => i.InvestorMember)
            .Include(i => i.WitnessMember)
            .Include(i => i.GuarantorMember)
            .Include(i => i.Partners)
                .ThenInclude(p => p.Nominee)
            .Include(i => i.Documents)
            .Include(i => i.Subscriptions)
            .Include(i => i.InterimProfits)
            .Include(i => i.ProjectCosts)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        return investment == null ? null : MapToDto(investment);
    }

    public async Task<InvestmentResponseDto> CreateInvestmentAsync(
        CreateInvestmentDto dto,
        string? createdBy,
        CancellationToken cancellationToken = default)
    {
        ValidateDates(dto.DateInvested, dto.MaturityDate);
        await ValidateUniqueNumbersAsync(dto.CertificateNumber, dto.ReferenceNumber, null, cancellationToken);
        ValidateShareLimits(dto.MinimumSharesPerMember, dto.MaximumSharesPerMember, dto.TotalShares);
        await ValidateParticipantsAsync(
            dto.InvestorMemberId, dto.WitnessMemberId, dto.GuarantorMemberId,
            dto.Partners, requireAll: true, cancellationToken);

        var now = DateTime.UtcNow;
        // Per-project maintenance percentage. When the caller does not supply one for
        // a brand-new project, fall back to the global default so creation still works.
        var maintenancePercentage = dto.MaintenancePercentage
            ?? await _settings.GetMaintenancePercentageAsync(cancellationToken);

        if (dto.MaintenanceAccountId.HasValue)
            await EnsureAccountExistsAsync(dto.MaintenanceAccountId.Value, cancellationToken);

        var investment = new Investment
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Type = ParseEnum<InvestmentType>(dto.Type, "investment type"),
            Category = dto.Category,
            PrincipalAmount = dto.PrincipalAmount,
            // A brand new investment has not moved yet, so it is worth what was put in.
            CurrentValue = dto.CurrentValue ?? dto.PrincipalAmount,
            TotalShares = dto.TotalShares,
            SharePrice = DeriveSharePrice(dto.PrincipalAmount, dto.TotalShares),
            MinimumSharesPerMember = dto.MinimumSharesPerMember,
            MaximumSharesPerMember = dto.MaximumSharesPerMember,
            TargetGrossProfit = dto.TargetGrossProfit,
            // Frozen at creation so a later change to the global rate cannot rewrite
            // the arithmetic of a project that has already been agreed.
            MaintenancePercentage = maintenancePercentage,
            MaintenanceAccountId = dto.MaintenanceAccountId,
            DateInvested = dto.DateInvested,
            MaturityDate = dto.MaturityDate,
            DurationMonths = ResolveDuration(dto.DurationMonths, dto.DateInvested, dto.MaturityDate),
            Status = ParseEnum<InvestmentStatus>(dto.Status, "investment status"),
            CertificateNumber = NullIfBlank(dto.CertificateNumber),
            ReferenceNumber = NullIfBlank(dto.ReferenceNumber),
            InvestorMemberId = dto.InvestorMemberId,
            WitnessMemberId = dto.WitnessMemberId,
            GuarantorMemberId = dto.GuarantorMemberId,
            CreatedBy = createdBy,
            LastModifiedBy = createdBy,
            CreatedAt = now,
            UpdatedAt = now,
            LastModifiedAt = now
        };

        _context.Investments.Add(investment);

        if (dto.Partners != null)
        {
            foreach (var partner in dto.Partners)
            {
                _context.InvestmentPartners.Add(ToEntity(partner, investment.Id, now));
            }
        }

        if (dto.MemberIds != null && dto.MemberIds.Count > 0)
        {
            var sharePercentage = 100m / dto.MemberIds.Count;
            foreach (var memberId in dto.MemberIds)
            {
                _context.MemberInvestments.Add(new MemberInvestment
                {
                    Id = Guid.NewGuid(),
                    MemberId = memberId,
                    InvestmentId = investment.Id,
                    SharePercentage = sharePercentage,
                    ShareValue = (investment.CurrentValue * sharePercentage) / 100,
                    CreatedAt = now
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return (await GetInvestmentByIdAsync(investment.Id, cancellationToken))!;
    }

    public async Task<InvestmentResponseDto?> UpdateInvestmentAsync(
        Guid id,
        UpdateInvestmentDto dto,
        string? modifiedBy,
        CancellationToken cancellationToken = default)
    {
        var investment = await _context.Investments
            .Include(i => i.Partners)
                .ThenInclude(p => p.Nominee)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (investment == null) return null;

        if (!string.IsNullOrWhiteSpace(dto.Name))
            investment.Name = dto.Name;
        if (dto.Description != null)
            investment.Description = dto.Description;
        if (!string.IsNullOrWhiteSpace(dto.Type))
            investment.Type = ParseEnum<InvestmentType>(dto.Type, "investment type");
        if (dto.Category != null)
            investment.Category = NullIfBlank(dto.Category);
        if (dto.PrincipalAmount.HasValue)
            investment.PrincipalAmount = dto.PrincipalAmount.Value;
        if (dto.CurrentValue.HasValue)
            investment.CurrentValue = dto.CurrentValue.Value;
        if (dto.TotalShares.HasValue)
            investment.TotalShares = dto.TotalShares.Value;
        if (dto.MinimumSharesPerMember.HasValue)
            investment.MinimumSharesPerMember = dto.MinimumSharesPerMember.Value;
        if (dto.MaximumSharesPerMember.HasValue)
            investment.MaximumSharesPerMember = dto.MaximumSharesPerMember.Value;
        if (dto.MaintenancePercentage.HasValue)
            investment.MaintenancePercentage = Math.Clamp(dto.MaintenancePercentage.Value, 0m, 100m);
        if (dto.MaintenanceAccountId.HasValue)
        {
            await EnsureAccountExistsAsync(dto.MaintenanceAccountId.Value, cancellationToken);
            investment.MaintenanceAccountId = dto.MaintenanceAccountId.Value;
        }
        if (dto.TargetGrossProfit.HasValue)
            investment.TargetGrossProfit = dto.TargetGrossProfit.Value;
        if (dto.DateInvested.HasValue)
            investment.DateInvested = dto.DateInvested.Value;
        if (dto.MaturityDate.HasValue)
            investment.MaturityDate = dto.MaturityDate.Value;
        if (!string.IsNullOrWhiteSpace(dto.Status))
            investment.Status = ParseEnum<InvestmentStatus>(dto.Status, "investment status");
        if (dto.CertificateNumber != null)
            investment.CertificateNumber = NullIfBlank(dto.CertificateNumber);
        if (dto.ReferenceNumber != null)
            investment.ReferenceNumber = NullIfBlank(dto.ReferenceNumber);

        // Participants: only overwrite the ones the caller actually supplied, so an edit
        // that touches nothing else keeps a legacy project working.
        if (dto.InvestorMemberId.HasValue)
            investment.InvestorMemberId = dto.InvestorMemberId.Value;
        if (dto.WitnessMemberId.HasValue)
            investment.WitnessMemberId = dto.WitnessMemberId.Value;
        if (dto.GuarantorMemberId.HasValue)
            investment.GuarantorMemberId = dto.GuarantorMemberId.Value;

        // Re-derive rather than validate: value or share count may have just changed,
        // and the price must always follow from them (section 3).
        investment.SharePrice = DeriveSharePrice(investment.PrincipalAmount, investment.TotalShares);

        // Validate against the merged state, not the incoming patch, so a partial
        // update cannot leave the record internally inconsistent.
        ValidateDates(investment.DateInvested, investment.MaturityDate);
        await GuardShareStructureChangeAsync(investment, cancellationToken);
        ValidateShareLimits(investment.MinimumSharesPerMember, investment.MaximumSharesPerMember, investment.TotalShares);
        await GuardShareLimitChangeAsync(investment, cancellationToken);
        await ValidateUniqueNumbersAsync(investment.CertificateNumber, investment.ReferenceNumber, id, cancellationToken);
        // Lenient: only enforces rules for participants that are actually present
        // (existing nulls on a pre-participants project are left alone).
        await ValidateParticipantsAsync(
            investment.InvestorMemberId, investment.WitnessMemberId, investment.GuarantorMemberId,
            dto.Partners, requireAll: false, cancellationToken);

        investment.DurationMonths = ResolveDuration(
            dto.DurationMonths ?? investment.DurationMonths,
            investment.DateInvested,
            investment.MaturityDate);

        var now = DateTime.UtcNow;
        investment.UpdatedAt = now;
        investment.LastModifiedAt = now;
        investment.LastModifiedBy = modifiedBy;

        // A null Partners list means "not supplied" - leave them alone. An empty list
        // is an explicit instruction to remove all partners.
        if (dto.Partners != null)
        {
            _context.InvestmentPartners.RemoveRange(investment.Partners);
            foreach (var partner in dto.Partners)
            {
                _context.InvestmentPartners.Add(ToEntity(partner, investment.Id, now));
            }
        }

        // Member share values track the investment's current value.
        var memberInvestments = await _context.MemberInvestments
            .Where(mi => mi.InvestmentId == id)
            .ToListAsync(cancellationToken);

        foreach (var mi in memberInvestments)
        {
            mi.ShareValue = (investment.CurrentValue * mi.SharePercentage) / 100;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await GetInvestmentByIdAsync(id, cancellationToken);
    }

    public async Task<IReadOnlyList<string>?> DeleteInvestmentAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var investment = await _context.Investments
            .Include(i => i.Documents)
            .Include(i => i.Subscriptions)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (investment == null) return null;

        var fileUrls = investment.Documents.Select(d => d.FileUrl).ToList();

        // Partners and documents cascade; MemberInvestments has no cascade configured,
        // so remove those explicitly.
        var memberInvestments = await _context.MemberInvestments
            .Where(mi => mi.InvestmentId == id)
            .ToListAsync(cancellationToken);
        _context.MemberInvestments.RemoveRange(memberInvestments);

        _context.Investments.Remove(investment);
        await _context.SaveChangesAsync(cancellationToken);

        return fileUrls;
    }

    public async Task<InvestmentDocumentDto?> AddDocumentAsync(
        Guid investmentId,
        InvestmentDocumentDto document,
        CancellationToken cancellationToken = default)
    {
        var exists = await _context.Investments
            .AsNoTracking()
            .AnyAsync(i => i.Id == investmentId, cancellationToken);

        if (!exists) return null;

        var entity = new InvestmentDocument
        {
            Id = Guid.NewGuid(),
            InvestmentId = investmentId,
            FileName = document.FileName,
            FileUrl = document.FileUrl,
            ContentType = document.ContentType,
            FileSizeBytes = document.FileSizeBytes,
            UploadedBy = document.UploadedBy,
            UploadedAt = DateTime.UtcNow
        };

        _context.InvestmentDocuments.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return ToDto(entity);
    }

    public async Task<string?> DeleteDocumentAsync(
        Guid investmentId,
        Guid documentId,
        CancellationToken cancellationToken = default)
    {
        var document = await _context.InvestmentDocuments
            .FirstOrDefaultAsync(d => d.Id == documentId && d.InvestmentId == investmentId, cancellationToken);

        if (document == null) return null;

        var fileUrl = document.FileUrl;
        _context.InvestmentDocuments.Remove(document);
        await _context.SaveChangesAsync(cancellationToken);

        return fileUrl;
    }

    /// <summary>
    /// Enums cross the wire as names, matching the rest of the project's DTOs.
    /// An unknown name is a client error, not a server fault.
    /// </summary>
    private static TEnum ParseEnum<TEnum>(string? value, string fieldLabel) where TEnum : struct, Enum
    {
        if (Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed) && Enum.IsDefined(parsed))
        {
            return parsed;
        }

        var allowed = string.Join(", ", Enum.GetNames<TEnum>());
        throw new ValidationException($"'{value}' is not a valid {fieldLabel}. Allowed values: {allowed}.");
    }

    /// <summary>
    /// Once shares have been sold, the value and share count are locked: changing
    /// either would silently reprice what people have already paid for.
    /// </summary>
    private async Task GuardShareStructureChangeAsync(Investment investment, CancellationToken cancellationToken)
    {
        var entry = _context.Entry(investment);
        var valueChanged = entry.Property(i => i.PrincipalAmount).IsModified;
        var sharesChanged = entry.Property(i => i.TotalShares).IsModified;

        if (!valueChanged && !sharesChanged) return;

        var sold = await _context.ShareSubscriptions
            .Where(s => s.InvestmentId == investment.Id && s.Status == ShareSubscriptionStatus.Active)
            .SumAsync(s => (int?)s.SharesPurchased, cancellationToken) ?? 0;

        if (sold > 0)
        {
            throw new ValidationException(
                $"{sold} share(s) have already been sold, so the project value and share count can no longer be changed.");
        }
    }

    /// <summary>Per-investment per-member share ceiling cannot be lowered below what a member already owns.</summary>
    private async Task GuardShareLimitChangeAsync(Investment investment, CancellationToken cancellationToken)
    {
        var maxChanged = _context.Entry(investment).Property(i => i.MaximumSharesPerMember).IsModified;
        if (!maxChanged) return;

        var maxShares = investment.MaximumSharesPerMember;
        if (!maxShares.HasValue) return;

        var highest = await _context.MemberInvestments
            .AsNoTracking()
            .Where(mi => mi.InvestmentId == investment.Id)
            .MaxAsync(mi => (int?)mi.SharesOwned, cancellationToken) ?? 0;

        if (highest > maxShares.Value)
        {
            throw new ValidationException(
                $"{highest} shares are already held by a member, which exceeds the new {maxShares.Value}-share maximum per member.");
        }
    }

    /// <summary>
    /// Section 5: minimum must not exceed maximum, none may be zero, and a maximum
    /// larger than the total share count is meaningless.
    /// </summary>
    private static void ValidateShareLimits(int? min, int? max, int? totalShares)
    {
        if (min.HasValue && min.Value < 1)
        {
            throw new ValidationException("Minimum shares per member must be at least 1.");
        }
        if (max.HasValue && max.Value < 1)
        {
            throw new ValidationException("Maximum shares per member must be at least 1.");
        }
        if (min.HasValue && max.HasValue && min.Value > max.Value)
        {
            throw new ValidationException("Minimum shares per member cannot exceed the maximum.");
        }
        if (max.HasValue && totalShares.HasValue && max.Value > totalShares.Value)
        {
            throw new ValidationException("Maximum shares per member cannot exceed the total number of shares available.");
        }
    }

    private static void ValidateDates(DateTime dateInvested, DateTime? maturityDate)
    {
        if (maturityDate.HasValue && maturityDate.Value.Date <= dateInvested.Date)
        {
            throw new ValidationException("Maturity date must be after the investment start date.");
        }
    }

    private static string DigitsOnly(string? value) =>
        new(( value ?? string.Empty).Where(char.IsDigit).ToArray());

    /// <summary>
    /// Enforces the participant business rules (spec sections 1-5, 7, 9):
    ///   - Investor, Witness and Guarantor must each be an ACTIVE fund member.
    ///   - Those three must be three different members.
    ///   - When a partner list is supplied it must contain exactly one partner, that
    ///     partner must carry a nominee, and the partner and nominee NID must differ.
    /// <paramref name="requireAll"/> is true on create (every participant mandatory) and
    /// false on update (only validate what is present, so legacy projects still edit).
    /// </summary>
    private async Task ValidateParticipantsAsync(
        Guid? investorMemberId,
        Guid? witnessMemberId,
        Guid? guarantorMemberId,
        IReadOnlyList<InvestmentPartnerDto>? partners,
        bool requireAll,
        CancellationToken cancellationToken)
    {
        if (requireAll)
        {
            if (investorMemberId is null) throw new ValidationException("An investor is required.");
            if (witnessMemberId is null) throw new ValidationException("An investor witness is required.");
            if (guarantorMemberId is null) throw new ValidationException("A guarantor is required.");
            if (partners is null || partners.Count == 0)
                throw new ValidationException("An investment project must have exactly one partner.");
        }

        // Distinctness among whichever of the three are set.
        if (investorMemberId is not null && investorMemberId == witnessMemberId)
            throw new ValidationException("The investor and the witness must be different members.");
        if (investorMemberId is not null && investorMemberId == guarantorMemberId)
            throw new ValidationException("The investor and the guarantor must be different members.");
        if (witnessMemberId is not null && witnessMemberId == guarantorMemberId)
            throw new ValidationException("The witness and the guarantor must be different members.");

        // Each supplied participant must resolve to an active member.
        var ids = new[] { investorMemberId, witnessMemberId, guarantorMemberId }
            .Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
        if (ids.Count > 0)
        {
            var activeIds = await _context.Members
                .AsNoTracking()
                .Where(m => ids.Contains(m.Id) && m.IsActive)
                .Select(m => m.Id)
                .ToListAsync(cancellationToken);

            if (investorMemberId is not null && !activeIds.Contains(investorMemberId.Value))
                throw new ValidationException("The selected investor is not an active fund member.");
            if (witnessMemberId is not null && !activeIds.Contains(witnessMemberId.Value))
                throw new ValidationException("The selected witness is not an active fund member.");
            if (guarantorMemberId is not null && !activeIds.Contains(guarantorMemberId.Value))
                throw new ValidationException("The selected guarantor is not an active fund member.");
        }

        if (partners is null) return;

        if (partners.Count != 1)
            throw new ValidationException("An investment project must have exactly one partner.");

        var partner = partners[0];
        var nominee = partner.Nominee;
        if (nominee is null || string.IsNullOrWhiteSpace(nominee.Name)
            || string.IsNullOrWhiteSpace(nominee.Phone) || string.IsNullOrWhiteSpace(nominee.Nid))
        {
            throw new ValidationException("Partner nominee information (name, phone and NID) is required.");
        }

        if (!string.IsNullOrWhiteSpace(partner.Nid)
            && DigitsOnly(partner.Nid) == DigitsOnly(nominee.Nid))
        {
            throw new ValidationException(
                "The partner and nominee must be two different people - their NID numbers cannot be the same.");
        }
    }

    private async Task ValidateUniqueNumbersAsync(
        string? certificateNumber,
        string? referenceNumber,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        certificateNumber = NullIfBlank(certificateNumber);
        referenceNumber = NullIfBlank(referenceNumber);

        if (certificateNumber == null && referenceNumber == null) return;

        var clashes = await _context.Investments
            .AsNoTracking()
            .Where(i => (excludeId == null || i.Id != excludeId)
                        && ((certificateNumber != null && i.CertificateNumber == certificateNumber)
                            || (referenceNumber != null && i.ReferenceNumber == referenceNumber)))
            .Select(i => new { i.CertificateNumber, i.ReferenceNumber })
            .ToListAsync(cancellationToken);

        if (certificateNumber != null && clashes.Any(c => c.CertificateNumber == certificateNumber))
        {
            throw new ConflictException($"Certificate number '{certificateNumber}' is already in use.");
        }

        if (referenceNumber != null && clashes.Any(c => c.ReferenceNumber == referenceNumber))
        {
            throw new ConflictException($"Reference number '{referenceNumber}' is already in use.");
        }
    }

    /// <summary>
    /// Prefers the span between the two dates when both are known, since that is the
    /// authoritative duration; otherwise keeps whatever was supplied.
    /// </summary>
    private static int? ResolveDuration(int? supplied, DateTime start, DateTime? maturity)
    {
        if (!maturity.HasValue) return supplied;

        var months = ((maturity.Value.Year - start.Year) * 12) + maturity.Value.Month - start.Month;
        if (maturity.Value.Day < start.Day) months--;

        return months > 0 ? months : supplied;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static InvestmentPartner ToEntity(InvestmentPartnerDto dto, Guid investmentId, DateTime now)
    {
        var partner = new InvestmentPartner
        {
            Id = Guid.NewGuid(),
            InvestmentId = investmentId,
            MemberId = dto.MemberId,
            PartnerName = dto.PartnerName,
            Nid = NullIfBlank(dto.Nid),
            Phone1 = dto.Phone1,
            Phone2 = NullIfBlank(dto.Phone2),
            Email = NullIfBlank(dto.Email),
            PresentAddress = NullIfBlank(dto.PresentAddress),
            PermanentAddress = NullIfBlank(dto.PermanentAddress),
            CreatedAt = now
        };

        var nominee = dto.Nominee;
        if (nominee != null && !string.IsNullOrWhiteSpace(nominee.Name))
        {
            partner.Nominee = new InvestmentNominee
            {
                Id = Guid.NewGuid(),
                InvestmentPartnerId = partner.Id,
                Name = nominee.Name.Trim(),
                Phone = nominee.Phone.Trim(),
                Nid = nominee.Nid.Trim(),
                Relation = NullIfBlank(nominee.Relation),
                CreatedAt = now
            };
        }

        return partner;
    }

    private static InvestmentPartnerDto ToDto(InvestmentPartner p) => new()
    {
        Id = p.Id,
        MemberId = p.MemberId,
        PartnerName = p.PartnerName,
        Nid = p.Nid,
        Phone1 = p.Phone1,
        Phone2 = p.Phone2,
        Email = p.Email,
        PresentAddress = p.PresentAddress,
        PermanentAddress = p.PermanentAddress,
        Nominee = p.Nominee == null
            ? new InvestmentNomineeDto()
            : new InvestmentNomineeDto
            {
                Name = p.Nominee.Name,
                Phone = p.Nominee.Phone,
                Nid = p.Nominee.Nid,
                Relation = p.Nominee.Relation
            }
    };

    private static InvestmentDocumentDto ToDto(InvestmentDocument d) => new()
    {
        Id = d.Id,
        FileName = d.FileName,
        // Routed through the API (guaranteed to be reachable wherever this app is
        // hosted) rather than the raw /assets/investment/* static path, which only
        // resolves if the deployment's web server also proxies that prefix to the
        // API - see InvestmentsController.DownloadDocument.
        FileUrl = $"/api/investments/{d.InvestmentId}/documents/{d.Id}/file",
        ContentType = d.ContentType,
        FileSizeBytes = d.FileSizeBytes,
        UploadedBy = d.UploadedBy,
        UploadedAt = d.UploadedAt
    };

    private async Task EnsureAccountExistsAsync(Guid accountId, CancellationToken cancellationToken)
    {
        if (!await _context.Accounts.AsNoTracking().AnyAsync(a => a.Id == accountId, cancellationToken))
            throw new NotFoundException("Maintenance account not found.");
    }

    private static InvestmentResponseDto MapToDto(Investment investment)
    {
        var totalShares = investment.TotalShares ?? 0;

        // Cancelled subscriptions have been refunded, so they no longer occupy shares.
        var soldShares = investment.Subscriptions
            .Where(s => s.Status == ShareSubscriptionStatus.Active)
            .Sum(s => s.SharesPurchased);

        var interimProfitTotal = investment.InterimProfits.Sum(p => p.Amount);
        var totalProjectCost = investment.ProjectCosts.Sum(pc => pc.Amount);

        // Total Returns = profit earned to date on top of the principal, so interim/occasional
        // profits recorded during the project raise the return value and percentage.
        // Profit already received back above the principal, plus accrued interim profit, net of costs.
        var receivedProfit = Math.Max(0m, (investment.ActualGrossProfit ?? 0m) - investment.PrincipalAmount);
        var totalProfit = receivedProfit + interimProfitTotal - totalProjectCost;

        // The principal is recovered at maturity, so the project is worth at least the principal
        // plus any profit earned so far (never shown below principal before it is realized).
        var effectiveCurrentValue = investment.PrincipalAmount + Math.Max(0m, totalProfit);

        var returnAmount = effectiveCurrentValue - investment.PrincipalAmount;
        var returnPercentage = investment.PrincipalAmount > 0
            ? (returnAmount / investment.PrincipalAmount) * 100
            : 0;

        var activeSubs = investment.Subscriptions
            .Where(s => s.Status == ShareSubscriptionStatus.Active)
            .ToList();
        var totalInvested = activeSubs.Sum(s => s.AmountPaid);

        return new InvestmentResponseDto
        {
            Id = investment.Id,
            Name = investment.Name,
            Description = investment.Description,
            Type = investment.Type.ToString(),
            Category = investment.Category,
            PrincipalAmount = investment.PrincipalAmount,
            CurrentValue = effectiveCurrentValue,
            ReturnAmount = returnAmount,
            ReturnPercentage = returnPercentage,
            TotalShares = investment.TotalShares,
            SharePrice = investment.SharePrice,
            MinimumSharesPerMember = investment.MinimumSharesPerMember,
            MaximumSharesPerMember = investment.MaximumSharesPerMember,
            SoldShares = soldShares,
            RemainingShares = Math.Max(0, totalShares - soldShares),
            SubscriptionPercentage = totalShares > 0
                ? Math.Round((decimal)soldShares / totalShares * 100m, 2)
                : 0m,
            TargetGrossProfit = investment.TargetGrossProfit,
            ActualGrossProfit = investment.ActualGrossProfit,
            GrossReceivedAmount = investment.ActualGrossProfit,
            TotalInvested = totalInvested,
            TotalSharesSold = soldShares,
            InterimProfitTotal = interimProfitTotal,
            TotalProjectCost = investment.ProjectCosts.Sum(pc => pc.Amount),
            ValueAfterCosts = (investment.ActualGrossProfit ?? 0m) + interimProfitTotal - investment.ProjectCosts.Sum(pc => pc.Amount),
            ProjectCosts = investment.ProjectCosts
                .OrderByDescending(pc => pc.CostDate)
                .Select(pc => new InvestmentProjectCostDto
                {
                    Id = pc.Id,
                    InvestmentId = pc.InvestmentId,
                    Title = pc.Title,
                    Amount = pc.Amount,
                    Remarks = pc.Remarks,
                    CostDate = pc.CostDate,
                    CreatedBy = pc.CreatedBy,
                    CreatedAt = pc.CreatedAt,
                    UpdatedAt = pc.UpdatedAt
                }).ToList(),
            MaintenancePercentage = investment.MaintenancePercentage,
            MaintenanceAmount = investment.MaintenanceAmount,
            MaintenanceAccountId = investment.MaintenanceAccountId,
            NetProfit = investment.NetProfit,
            UndistributedRemainder = investment.UndistributedRemainder,
            CompletionDate = investment.CompletionDate,
            ClosingNotes = investment.ClosingNotes,
            DateInvested = investment.DateInvested,
            MaturityDate = investment.MaturityDate,
            DurationMonths = investment.DurationMonths,
            Status = investment.Status.ToString(),
            CertificateNumber = investment.CertificateNumber,
            ReferenceNumber = investment.ReferenceNumber,
            InvestorMemberId = investment.InvestorMemberId,
            InvestorName = investment.InvestorMember?.Name,
            WitnessMemberId = investment.WitnessMemberId,
            WitnessName = investment.WitnessMember?.Name,
            GuarantorMemberId = investment.GuarantorMemberId,
            GuarantorName = investment.GuarantorMember?.Name,
            CreatedBy = investment.CreatedBy,
            CreatedAt = investment.CreatedAt,
            LastModifiedBy = investment.LastModifiedBy,
            LastModifiedAt = investment.LastModifiedAt,
            Members = investment.MemberInvestments.Select(mi => new MemberInvestmentDto
            {
                MemberId = mi.MemberId,
                MemberName = mi.Member?.Name ?? "Unknown",
                SharePercentage = mi.SharePercentage,
                ShareValue = mi.ShareValue
            }).ToList(),
            Partners = investment.Partners.Select(ToDto).ToList(),
            Documents = investment.Documents.Select(ToDto).ToList(),
            InterimProfits = investment.InterimProfits
                .OrderBy(p => p.ProfitDate)
                .Select(p => new InterimProfitDto
                {
                    Id = p.Id,
                    InvestmentId = p.InvestmentId,
                    Amount = p.Amount,
                    ProfitDate = p.ProfitDate,
                    Remarks = p.Remarks,
                    CreatedBy = p.CreatedBy,
                    CreatedAt = p.CreatedAt
                }).ToList()
        };
    }
}
