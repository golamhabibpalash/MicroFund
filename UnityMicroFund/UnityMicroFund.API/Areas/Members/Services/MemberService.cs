using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Members.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Members.Services;

public class MemberService : IMemberService
{
    private readonly AppDbContext _context;

    public MemberService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MemberResponseDto>> GetMembersAsync(string? search = null, bool? isActive = null)
    {
        var query = _context.Members.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(m => m.Name.Contains(search) || m.Phone.Contains(search) || m.Email != null && m.Email.Contains(search));
        }

        if (isActive.HasValue)
        {
            query = query.Where(m => m.IsActive == isActive.Value);
        }

        var members = await query
            .Include(m => m.Contributions)
            .Include(m => m.MemberInvestments)
            .OrderBy(m => m.Name)
            .ToListAsync();

        var totalPool = await _context.Contributions
            .Where(c => c.Status == ContributionStatus.Paid)
            .SumAsync(c => c.Amount);

        return members.Select(m =>
        {
            var totalContributions = m.Contributions
                .Where(c => c.Status == ContributionStatus.Paid)
                .Sum(c => c.Amount);
            var installmentsPaid = m.Contributions.Count(c => c.Status == ContributionStatus.Paid);
            var sharePercentage = totalPool > 0 ? (totalContributions / totalPool) * 100 : 0;
            var shareValue = m.MemberInvestments.Sum(mi => mi.ShareValue);

            return MapToDto(m);
        });
    }

    public async Task<MemberResponseDto?> GetMemberByIdAsync(Guid id)
    {
        var member = await _context.Members
            .Include(m => m.Contributions)
            .Include(m => m.MemberInvestments)
                .ThenInclude(mi => mi.Investment)
            .FirstOrDefaultAsync(m => m.Id == id);

        return member == null ? null : MapToDto(member);
    }

    public async Task<MemberResponseDto> CreateMemberAsync(CreateMemberDto dto)
    {
        if (!dto.AcceptTerms)
        {
            throw new ArgumentException("You must accept the terms and conditions");
        }

        if (await _context.Members.AnyAsync(m => m.Phone == dto.Phone))
        {
            throw new ArgumentException("A member with this phone number already exists");
        }

        if (!Enum.TryParse<Gender>(dto.Gender, true, out var gender))
        {
            throw new ArgumentException("Invalid gender value");
        }

        var member = new Member
        {
            Name = dto.Name,
            DateOfBirth = dto.DateOfBirth,
            Gender = gender,
            Nationality = dto.Nationality,
            Phone = dto.Phone,
            AlternatePhone = dto.AlternatePhone,
            Email = dto.Email,
            Address = dto.Address,
            Occupation = dto.Occupation,
            EmployerName = dto.EmployerName,
            EmergencyContactName = dto.EmergencyContactName,
            EmergencyContactPhone = dto.EmergencyContactPhone,
            EmergencyContactRelation = dto.EmergencyContactRelation,
            NomineeName = dto.NomineeName,
            NomineeRelation = dto.NomineeRelation,
            NomineePhone = dto.NomineePhone,
            BankName = dto.BankName,
            AccountHolderName = dto.AccountHolderName,
            AccountNumber = dto.AccountNumber,
            RoutingNumber = dto.RoutingNumber,
            SwiftCode = dto.SwiftCode,
            ProfileImageUrl = dto.ProfileImageUrl,
            DocumentUrl = dto.DocumentUrl,
            SignatureUrl = dto.SignatureUrl,
            MonthlyAmount = dto.MonthlyAmount,
            JoinDate = dto.JoinDate,
            AcceptTerms = dto.AcceptTerms,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Members.Add(member);
        await _context.SaveChangesAsync();

        return MapToDto(member);
    }

    public async Task<MemberResponseDto?> UpdateMemberAsync(Guid id, UpdateMemberDto dto)
    {
        var member = await _context.Members.FindAsync(id);
        if (member == null) return null;

        if (!string.IsNullOrWhiteSpace(dto.Name)) member.Name = dto.Name;
        if (dto.DateOfBirth.HasValue) member.DateOfBirth = dto.DateOfBirth.Value;
        if (!string.IsNullOrWhiteSpace(dto.Gender) && Enum.TryParse<Gender>(dto.Gender, true, out var gender)) member.Gender = gender;
        if (!string.IsNullOrWhiteSpace(dto.Nationality)) member.Nationality = dto.Nationality;
        if (!string.IsNullOrWhiteSpace(dto.Phone)) member.Phone = dto.Phone;
        if (!string.IsNullOrWhiteSpace(dto.AlternatePhone)) member.AlternatePhone = dto.AlternatePhone;
        if (!string.IsNullOrWhiteSpace(dto.Email)) member.Email = dto.Email;
        if (!string.IsNullOrWhiteSpace(dto.Address)) member.Address = dto.Address;
        if (!string.IsNullOrWhiteSpace(dto.Occupation)) member.Occupation = dto.Occupation;
        if (!string.IsNullOrWhiteSpace(dto.EmployerName)) member.EmployerName = dto.EmployerName;
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactName)) member.EmergencyContactName = dto.EmergencyContactName;
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactPhone)) member.EmergencyContactPhone = dto.EmergencyContactPhone;
        if (!string.IsNullOrWhiteSpace(dto.EmergencyContactRelation)) member.EmergencyContactRelation = dto.EmergencyContactRelation;
        if (!string.IsNullOrWhiteSpace(dto.NomineeName)) member.NomineeName = dto.NomineeName;
        if (!string.IsNullOrWhiteSpace(dto.NomineeRelation)) member.NomineeRelation = dto.NomineeRelation;
        if (!string.IsNullOrWhiteSpace(dto.NomineePhone)) member.NomineePhone = dto.NomineePhone;
        if (!string.IsNullOrWhiteSpace(dto.BankName)) member.BankName = dto.BankName;
        if (!string.IsNullOrWhiteSpace(dto.AccountHolderName)) member.AccountHolderName = dto.AccountHolderName;
        if (!string.IsNullOrWhiteSpace(dto.AccountNumber)) member.AccountNumber = dto.AccountNumber;
        if (!string.IsNullOrWhiteSpace(dto.RoutingNumber)) member.RoutingNumber = dto.RoutingNumber;
        if (!string.IsNullOrWhiteSpace(dto.SwiftCode)) member.SwiftCode = dto.SwiftCode;
        if (!string.IsNullOrWhiteSpace(dto.ProfileImageUrl)) member.ProfileImageUrl = dto.ProfileImageUrl;
        if (!string.IsNullOrWhiteSpace(dto.DocumentUrl)) member.DocumentUrl = dto.DocumentUrl;
        if (!string.IsNullOrWhiteSpace(dto.SignatureUrl)) member.SignatureUrl = dto.SignatureUrl;
        if (dto.MonthlyAmount.HasValue) member.MonthlyAmount = dto.MonthlyAmount.Value;
        if (dto.JoinDate.HasValue) member.JoinDate = dto.JoinDate.Value;
        if (dto.IsActive.HasValue) member.IsActive = dto.IsActive.Value;

        member.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMemberByIdAsync(id);
    }

    public async Task<bool> DeleteMemberAsync(Guid id)
    {
        var member = await _context.Members.FindAsync(id);
        if (member == null) return false;

        _context.Members.Remove(member);
        await _context.SaveChangesAsync();
        return true;
    }

    private MemberResponseDto MapToDto(Member m)
    {
        var totalPool = _context.Contributions
            .Where(c => c.Status == ContributionStatus.Paid)
            .Sum(c => c.Amount);
        var totalContributions = m.Contributions
            .Where(c => c.Status == ContributionStatus.Paid)
            .Sum(c => c.Amount);
        var sharePercentage = totalPool > 0 ? (totalContributions / totalPool) * 100 : 0;
        var shareValue = m.MemberInvestments.Sum(mi => mi.ShareValue);

        return new MemberResponseDto
        {
            Id = m.Id,
            Name = m.Name,
            DateOfBirth = m.DateOfBirth,
            Gender = m.Gender.ToString(),
            Nationality = m.Nationality,
            Phone = m.Phone,
            AlternatePhone = m.AlternatePhone,
            Email = m.Email,
            Address = m.Address,
            Occupation = m.Occupation,
            EmployerName = m.EmployerName,
            EmergencyContactName = m.EmergencyContactName,
            EmergencyContactPhone = m.EmergencyContactPhone,
            EmergencyContactRelation = m.EmergencyContactRelation,
            NomineeName = m.NomineeName,
            NomineeRelation = m.NomineeRelation,
            NomineePhone = m.NomineePhone,
            BankName = m.BankName,
            AccountHolderName = m.AccountHolderName,
            AccountNumber = m.AccountNumber,
            RoutingNumber = m.RoutingNumber,
            SwiftCode = m.SwiftCode,
            ProfileImageUrl = m.ProfileImageUrl,
            DocumentUrl = m.DocumentUrl,
            SignatureUrl = m.SignatureUrl,
            MonthlyAmount = m.MonthlyAmount,
            JoinDate = m.JoinDate,
            MemberId = m.MemberId,
            IsActive = m.IsActive,
            CreatedAt = m.CreatedAt,
            TotalContributions = totalContributions,
            TotalInstallmentsPaid = m.Contributions.Count(c => c.Status == ContributionStatus.Paid),
            CurrentShareValue = shareValue,
            SharePercentage = sharePercentage
        };
    }
}
