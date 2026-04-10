namespace UnityMicroFund.API.Areas.Profile.DTOs;

public class UserProfileDto
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public string? Address { get; set; }
    public string? Occupation { get; set; }
    public string? EmployerName { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Nationality { get; set; }
    public decimal MonthlyAmount { get; set; }
    public string? JoinDate { get; set; }
    public EmergencyContactDto? EmergencyContact { get; set; }
    public NomineeDto? Nominee { get; set; }
    public BankInfoDto? BankInfo { get; set; }
    public decimal TotalContributions { get; set; }
    public int TotalInstallmentsPaid { get; set; }
    public decimal CurrentShareValue { get; set; }
    public decimal SharePercentage { get; set; }
    public bool IsActive { get; set; }
}

public class EmergencyContactDto
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Relation { get; set; }
}

public class NomineeDto
{
    public string? Name { get; set; }
    public string? Relation { get; set; }
    public string? Phone { get; set; }
}

public class BankInfoDto
{
    public string? BankName { get; set; }
    public string? AccountHolderName { get; set; }
    public string? AccountNumber { get; set; }
    public string? RoutingNumber { get; set; }
    public string? SwiftCode { get; set; }
}

public class UpdateProfileDto
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public string? Address { get; set; }
    public string? Occupation { get; set; }
    public string? EmployerName { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Nationality { get; set; }
    public decimal? MonthlyAmount { get; set; }
    public EmergencyContactDto? EmergencyContact { get; set; }
    public NomineeDto? Nominee { get; set; }
    public BankInfoDto? BankInfo { get; set; }
}

public class UpdateProfileImageDto
{
    public string? ImageUrl { get; set; }
}