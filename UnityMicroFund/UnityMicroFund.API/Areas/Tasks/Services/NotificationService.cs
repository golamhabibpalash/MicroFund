using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Tasks.Services;

public interface INotificationService
{
    Task<Notification> CreateNotificationAsync(string title, string message, NotificationType type, Guid targetUserId, Guid createdByUserId, Guid? relatedUserId = null, Guid? relatedMemberId = null);
    Task<List<Notification>> GetNotificationsForUserAsync(Guid userId, int count = 20);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task MarkAsReadAsync(Guid notificationId);
    Task MarkAllAsReadAsync(Guid userId);
    Task<RegistrationRequest> CreateRegistrationRequestAsync(Guid userId, string userEmail, string userName, Guid? memberId = null);
    Task<List<RegistrationRequest>> GetPendingRegistrationRequestsAsync();
    Task<bool> ApproveRegistrationAsync(Guid requestId, Guid approvedByUserId);
    Task<bool> RejectRegistrationAsync(Guid requestId, Guid rejectedByUserId);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Notification> CreateNotificationAsync(string title, string message, NotificationType type, Guid targetUserId, Guid createdByUserId, Guid? relatedUserId = null, Guid? relatedMemberId = null)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            Title = title,
            Message = message,
            Type = type,
            TargetUserId = targetUserId,
            CreatedByUserId = createdByUserId,
            RelatedUserId = relatedUserId,
            RelatedMemberId = relatedMemberId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        return notification;
    }

    public async Task<List<Notification>> GetNotificationsForUserAsync(Guid userId, int count = 20)
    {
        return await _context.Notifications
            .Where(n => n.TargetUserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _context.Notifications
            .Where(n => n.TargetUserId == userId && !n.IsRead)
            .CountAsync();
    }

    public async Task MarkAsReadAsync(Guid notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification != null)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.TargetUserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<RegistrationRequest> CreateRegistrationRequestAsync(Guid userId, string userEmail, string userName, Guid? memberId = null)
    {
        var request = new RegistrationRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            UserEmail = userEmail,
            UserName = userName,
            MemberId = memberId,
            RequestType = "Registration",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.RegistrationRequests.Add(request);
        await _context.SaveChangesAsync();

        return request;
    }

    public async Task<List<RegistrationRequest>> GetPendingRegistrationRequestsAsync()
    {
        return await _context.RegistrationRequests
            .Where(r => r.Status == "Pending")
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> ApproveRegistrationAsync(Guid requestId, Guid approvedByUserId)
    {
        var request = await _context.RegistrationRequests.FindAsync(requestId);
        if (request == null) return false;

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return false;

        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;

        request.Status = "Approved";
        request.ProcessedAt = DateTime.UtcNow;
        request.ProcessedByUserId = approvedByUserId;

        await _context.SaveChangesAsync();

        var admins = await _context.Users
            .Where(u => u.Role == UserRole.Admin && u.IsActive)
            .ToListAsync();

        foreach (var admin in admins)
        {
            await CreateNotificationAsync(
                "Registration Approved",
                $"Registration for {user.Name} has been approved.",
                NotificationType.RegistrationApproval,
                admin.Id,
                approvedByUserId,
                request.UserId,
                request.MemberId
            );
        }

        return true;
    }

    public async Task<bool> RejectRegistrationAsync(Guid requestId, Guid rejectedByUserId)
    {
        var request = await _context.RegistrationRequests.FindAsync(requestId);
        if (request == null) return false;

        request.Status = "Rejected";
        request.ProcessedAt = DateTime.UtcNow;
        request.ProcessedByUserId = rejectedByUserId;

        await _context.SaveChangesAsync();

        return true;
    }
}