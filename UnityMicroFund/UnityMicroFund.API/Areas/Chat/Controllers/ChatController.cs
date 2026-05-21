using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Chat.DTOs;
using UnityMicroFund.API.Areas.Chat.Hubs;
using UnityMicroFund.API.Areas.Chat.Services;

namespace UnityMicroFund.API.Areas.Chat.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpGet("online")]
    public IActionResult GetOnlineUsers()
        => Ok(OnlineTracker.OnlineUserIds);

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        var memberId = await GetCurrentMemberIdAsync();
        if (memberId == Guid.Empty)
            return Unauthorized(new { message = "No member record linked to your account" });

        var rooms = await _chatService.GetRoomsForMemberAsync(memberId);
        return Ok(rooms);
    }

    [HttpGet("rooms/{roomId:guid}")]
    public async Task<IActionResult> GetRoom(Guid roomId)
    {
        var memberId = await GetCurrentMemberIdAsync();
        if (memberId == Guid.Empty)
            return Unauthorized(new { message = "No member record linked to your account" });

        var room = await _chatService.GetRoomAsync(roomId, memberId);
        if (room == null)
            return NotFound(new { message = "Chat room not found" });

        return Ok(room);
    }

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateChatRoomDto dto)
    {
        var memberId = await GetCurrentMemberIdAsync();
        if (memberId == Guid.Empty)
            return Unauthorized(new { message = "No member record linked to your account" });

        try
        {
            var room = await _chatService.CreateRoomAsync(dto, memberId);
            return CreatedAtAction(nameof(GetRoom), new { roomId = room.Id }, room);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("rooms/{roomId:guid}/messages")]
    public async Task<IActionResult> GetMessages(
        Guid roomId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var memberId = await GetCurrentMemberIdAsync();
        if (memberId == Guid.Empty)
            return Unauthorized(new { message = "No member record linked to your account" });

        var messages = await _chatService.GetMessagesAsync(roomId, memberId, skip, take);
        return Ok(messages);
    }

    [HttpPost("rooms/{roomId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid roomId)
    {
        var memberId = await GetCurrentMemberIdAsync();
        if (memberId == Guid.Empty)
            return Unauthorized(new { message = "No member record linked to your account" });

        await _chatService.MarkAsReadAsync(roomId, memberId);
        return Ok();
    }

    [HttpPost("direct/{targetMemberId:guid}")]
    public async Task<IActionResult> GetOrCreateDirectChat(Guid targetMemberId)
    {
        var memberId = await GetCurrentMemberIdAsync();
        if (memberId == Guid.Empty)
            return Unauthorized(new { message = "No member record linked to your account" });

        var rooms = await _chatService.GetOrCreateIndividualChatAsync(memberId, targetMemberId);
        if (rooms.Count == 0)
            return NotFound(new { message = "Member not found" });

        return Ok(rooms.First());
    }

    private async Task<Guid> GetCurrentMemberIdAsync()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Guid.Empty;

        return await _chatService.GetMemberIdByUserIdAsync(userId);
    }
}
