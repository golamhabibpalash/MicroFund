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
            .Include(i => i.Partners)
            .Include(i => i.Documents)
            .Include(i => i.Subscriptions)
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
            .Include(i => i.Partners)
            .Include(i => i.Documents)
            .Include(i => i.Subscriptions)
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

        var now = DateTime.UtcNow;
        var operationalExpensePercentage = await _settings.GetOperationalExpensePercentageAsync(cancellationToken);

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
            TargetGrossProfit = dto.TargetGrossProfit,
            // Frozen at creation so a later change to the global rate cannot rewrite
            // the arithmetic of a project that has already been agreed.
            OperationalExpensePercentage = operationalExpensePercentage,
            DateInvested = dto.DateInvested,
            MaturityDate = dto.MaturityDate,
            DurationMonths = ResolveDuration(dto.DurationMonths, dto.DateInvested, dto.MaturityDate),
            Status = ParseEnum<InvestmentStatus>(dto.Status, "investment status"),
            CertificateNumber = NullIfBlank(dto.CertificateNumber),
            ReferenceNumber = NullIfBlank(dto.ReferenceNumber),
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

        // Re-derive rather than validate: value or share count may have just changed,
        // and the price must always follow from them (section 3).
        investment.SharePrice = DeriveSharePrice(investment.PrincipalAmount, investment.TotalShares);

        // Validate against the merged state, not the incoming patch, so a partial
        // update cannot leave the record internally inconsistent.
        ValidateDates(investment.DateInvested, investment.MaturityDate);
        await GuardShareStructureChangeAsync(investment, cancellationToken);
        await ValidateUniqueNumbersAsync(investment.CertificateNumber, investment.ReferenceNumber, id, cancellationToken);

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

    private static void ValidateDates(DateTime dateInvested, DateTime? maturityDate)
    {
        if (maturityDate.HasValue && maturityDate.Value.Date <= dateInvested.Date)
        {
            throw new ValidationException("Maturity date must be after the investment start date.");
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

    private static InvestmentPartner ToEntity(InvestmentPartnerDto dto, Guid investmentId, DateTime now) => new()
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
        NomineeName = NullIfBlank(dto.NomineeName),
        NomineeRelationship = NullIfBlank(dto.NomineeRelationship),
        NomineeContact = NullIfBlank(dto.NomineeContact),
        CreatedAt = now
    };

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
        NomineeName = p.NomineeName,
        NomineeRelationship = p.NomineeRelationship,
        NomineeContact = p.NomineeContact
    };

    private static InvestmentDocumentDto ToDto(InvestmentDocument d) => new()
    {
        Id = d.Id,
        FileName = d.FileName,
        FileUrl = d.FileUrl,
        ContentType = d.ContentType,
        FileSizeBytes = d.FileSizeBytes,
        UploadedBy = d.UploadedBy,
        UploadedAt = d.UploadedAt
    };

    private static InvestmentResponseDto MapToDto(Investment investment)
    {
        var totalShares = investment.TotalShares ?? 0;

        // Cancelled subscriptions have been refunded, so they no longer occupy shares.
        var soldShares = investment.Subscriptions
            .Where(s => s.Status == ShareSubscriptionStatus.Active)
            .Sum(s => s.SharesPurchased);

        var returnAmount = investment.CurrentValue - investment.PrincipalAmount;
        var returnPercentage = investment.PrincipalAmount > 0
            ? (returnAmount / investment.PrincipalAmount) * 100
            : 0;

        return new InvestmentResponseDto
        {
            Id = investment.Id,
            Name = investment.Name,
            Description = investment.Description,
            Type = investment.Type.ToString(),
            Category = investment.Category,
            PrincipalAmount = investment.PrincipalAmount,
            CurrentValue = investment.CurrentValue,
            ReturnAmount = returnAmount,
            ReturnPercentage = returnPercentage,
            TotalShares = investment.TotalShares,
            SharePrice = investment.SharePrice,
            SoldShares = soldShares,
            RemainingShares = Math.Max(0, totalShares - soldShares),
            SubscriptionPercentage = totalShares > 0
                ? Math.Round((decimal)soldShares / totalShares * 100m, 2)
                : 0m,
            TargetGrossProfit = investment.TargetGrossProfit,
            ActualGrossProfit = investment.ActualGrossProfit,
            OperationalExpensePercentage = investment.OperationalExpensePercentage,
            OperationalExpenseAmount = investment.OperationalExpenseAmount,
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
            Documents = investment.Documents.Select(ToDto).ToList()
        };
    }
}
