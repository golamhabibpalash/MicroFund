using System.ComponentModel.DataAnnotations;

namespace UnityMicroFund.API.Models;

public enum NotificationType
{
    RegistrationApproval,
    PaymentApproved,
    InvestmentUpdate,
    SystemAlert
}

public class Notification
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Title { get; set; } = string.Empty;
    
    public string Message { get; set; } = string.Empty;
    
    public NotificationType Type { get; set; }
    
    public Guid? RelatedUserId { get; set; }
    
    public Guid? RelatedMemberId { get; set; }
    
    public Guid CreatedByUserId { get; set; }
    
    public Guid TargetUserId { get; set; }
    
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? ReadAt { get; set; }
}

public class RegistrationRequest
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public string UserEmail { get; set; } = string.Empty;
    
    public string UserName { get; set; } = string.Empty;
    
    public Guid? MemberId { get; set; }
    
    public string RequestType { get; set; } = "Registration";
    
    public string Status { get; set; } = "Pending";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? ProcessedAt { get; set; }
    
    public Guid? ProcessedByUserId { get; set; }
}