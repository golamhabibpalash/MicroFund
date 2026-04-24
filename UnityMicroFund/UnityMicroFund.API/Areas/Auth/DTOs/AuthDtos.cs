using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Auth.DTOs;

public class RegisterDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Role { get; set; }
}

public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RefreshTokenDto
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class GoogleLoginDto
{
    public string Token { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserDto User { get; set; } = null!;
    public string? Message { get; set; }
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class RegisterWithMemberDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Role { get; set; }
    
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Nationality { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? AlternatePhone { get; set; }
    public string Address { get; set; } = string.Empty;
    public string Occupation { get; set; } = string.Empty;
    public string? EmployerName { get; set; }
    public string? EmergencyContactName { get; set; }
    public string EmergencyContactPhone { get; set; } = string.Empty;
    public string? EmergencyContactRelation { get; set; }
    public string NomineeName { get; set; } = string.Empty;
    public string? NomineeRelation { get; set; }
    public string? NomineePhone { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string RoutingNumber { get; set; } = string.Empty;
    public string? SwiftCode { get; set; }
    public decimal MonthlyAmount { get; set; }
    public bool AcceptTerms { get; set; }
}

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
