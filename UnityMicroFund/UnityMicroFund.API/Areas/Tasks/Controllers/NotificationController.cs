using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Tasks.Services;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Tasks.Controllers;

public class RejectRequestDto
{
    public string? Reason { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    public NotificationController(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] int count = 20)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var notifications = await _notificationService.GetNotificationsForUserAsync(userId.Value, count);
        return Ok(notifications);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var count = await _notificationService.GetUnreadCountAsync(userId.Value);
        return Ok(new { count });
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        await _notificationService.MarkAsReadAsync(id);
        return Ok();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        await _notificationService.MarkAllAsReadAsync(userId.Value);
        return Ok();
    }

    [HttpGet("registration-requests")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetRegistrationRequests([FromQuery] string? status = "Pending")
    {
        var requests = await _notificationService.GetRegistrationRequestsAsync(status);
        return Ok(requests);
    }

    [HttpPost("registration-requests/{id}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ApproveRegistration(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _notificationService.ApproveRegistrationAsync(id, userId.Value);
        if (!result) return BadRequest();
        return Ok();
    }

    [HttpPost("registration-requests/{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RejectRegistration(Guid id, [FromBody] RejectRequestDto? dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _notificationService.RejectRegistrationAsync(id, userId.Value, dto?.Reason);
        if (!result) return BadRequest();
        return Ok();
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst("UserId")?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}