using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Profile.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Auth.Services;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _context;

    public ProfileService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.Email == user.Email);

        if (member == null)
        {
            return new UserProfileDto
            {
                UserId = user.Id,
                Name = user.Name,
                Email = user.Email,
                ProfileImageUrl = null,
                IsActive = user.IsActive
            };
        }

        var totalPool = await _context.Contributions
            .Where(c => c.Status == ContributionStatus.Paid)
            .SumAsync(c => c.Amount);

        var accountBalance = await _context.Accounts
            .Where(a => a.IsActive)
            .SumAsync(a => a.Balance);

        totalPool += accountBalance;

        var totalContributions = await _context.Contributions
            .Where(c => c.MemberId == member.Id && c.Status == ContributionStatus.Paid)
            .SumAsync(c => c.Amount);

        // If member has no contributions but has account activity, show account balance as contribution
        if (totalContributions == 0)
        {
            totalContributions = accountBalance;
        }

        var sharePercentage = totalPool > 0 ? (totalContributions / totalPool) * 100 : 0;
        var shareValue = await _context.MemberInvestments
            .Where(mi => mi.MemberId == member.Id)
            .SumAsync(mi => mi.ShareValue);

        return new UserProfileDto
        {
            UserId = user.Id,
            Name = member.Name,
            Email = user.Email,
            ProfileImageUrl = member.ProfileImageUrl,
            Phone = member.Phone,
            AlternatePhone = member.AlternatePhone,
            Address = member.Address,
            Occupation = member.Occupation,
            EmployerName = member.EmployerName,
            DateOfBirth = member.DateOfBirth.ToString("yyyy-MM-dd"),
            Gender = member.Gender.ToString(),
            Nationality = member.Nationality,
            MonthlyAmount = member.MonthlyAmount,
            JoinDate = member.JoinDate.ToString("yyyy-MM-dd"),
            EmergencyContact = new EmergencyContactDto
            {
                Name = member.EmergencyContactName,
                Phone = member.EmergencyContactPhone,
                Relation = member.EmergencyContactRelation
            },
            Nominee = new NomineeDto
            {
                Name = member.NomineeName,
                Relation = member.NomineeRelation,
                Phone = member.NomineePhone
            },
            BankInfo = new BankInfoDto
            {
                BankName = member.BankName,
                AccountHolderName = member.AccountHolderName,
                AccountNumber = member.AccountNumber,
                RoutingNumber = member.RoutingNumber,
                SwiftCode = member.SwiftCode
            },
            TotalContributions = totalContributions,
            TotalInstallmentsPaid = await _context.Contributions
                .CountAsync(c => c.MemberId == member.Id && c.Status == ContributionStatus.Paid),
            CurrentShareValue = shareValue,
            SharePercentage = sharePercentage,
            IsActive = member.IsActive
        };
    }

    public async Task<UserProfileDto?> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.Email == user.Email);

        if (member != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.Name)) member.Name = dto.Name;
            if (!string.IsNullOrWhiteSpace(dto.Phone)) member.Phone = dto.Phone;
            if (!string.IsNullOrWhiteSpace(dto.AlternatePhone)) member.AlternatePhone = dto.AlternatePhone;
            if (!string.IsNullOrWhiteSpace(dto.Address)) member.Address = dto.Address;
            if (!string.IsNullOrWhiteSpace(dto.Occupation)) member.Occupation = dto.Occupation;
            if (!string.IsNullOrWhiteSpace(dto.EmployerName)) member.EmployerName = dto.EmployerName;
            if (!string.IsNullOrWhiteSpace(dto.DateOfBirth) && DateTime.TryParse(dto.DateOfBirth, out var dob)) member.DateOfBirth = dob;
            if (!string.IsNullOrWhiteSpace(dto.Gender) && Enum.TryParse<Gender>(dto.Gender, true, out var gender)) member.Gender = gender;
            if (!string.IsNullOrWhiteSpace(dto.Nationality)) member.Nationality = dto.Nationality;
            if (dto.MonthlyAmount.HasValue) member.MonthlyAmount = dto.MonthlyAmount.Value;

            if (dto.EmergencyContact != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.EmergencyContact.Name)) member.EmergencyContactName = dto.EmergencyContact.Name;
                if (!string.IsNullOrWhiteSpace(dto.EmergencyContact.Phone)) member.EmergencyContactPhone = dto.EmergencyContact.Phone;
                if (!string.IsNullOrWhiteSpace(dto.EmergencyContact.Relation)) member.EmergencyContactRelation = dto.EmergencyContact.Relation;
            }

            if (dto.Nominee != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.Nominee.Name)) member.NomineeName = dto.Nominee.Name;
                if (!string.IsNullOrWhiteSpace(dto.Nominee.Relation)) member.NomineeRelation = dto.Nominee.Relation;
                if (!string.IsNullOrWhiteSpace(dto.Nominee.Phone)) member.NomineePhone = dto.Nominee.Phone;
            }

            if (dto.BankInfo != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.BankInfo.BankName)) member.BankName = dto.BankInfo.BankName;
                if (!string.IsNullOrWhiteSpace(dto.BankInfo.AccountHolderName)) member.AccountHolderName = dto.BankInfo.AccountHolderName;
                if (!string.IsNullOrWhiteSpace(dto.BankInfo.AccountNumber)) member.AccountNumber = dto.BankInfo.AccountNumber;
                if (!string.IsNullOrWhiteSpace(dto.BankInfo.RoutingNumber)) member.RoutingNumber = dto.BankInfo.RoutingNumber;
                if (!string.IsNullOrWhiteSpace(dto.BankInfo.SwiftCode)) member.SwiftCode = dto.BankInfo.SwiftCode;
            }

            member.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(dto.Name)) user.Name = dto.Name;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetProfileAsync(userId);
    }

    public async Task<bool> UpdateProfileImageAsync(Guid userId, string? imageUrl)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.Email == user.Email);

        if (member != null)
        {
            member.ProfileImageUrl = imageUrl;
            member.UpdatedAt = DateTime.UtcNow;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }
}