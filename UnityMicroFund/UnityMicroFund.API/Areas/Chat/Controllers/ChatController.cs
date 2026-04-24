using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Chat.DTOs;
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

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        var memberId = GetCurrentMemberId();
        if (memberId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid member" });
        }
        
        var rooms = await _chatService.GetRoomsForMemberAsync(memberId);
        return Ok(rooms);
    }

    [HttpGet("rooms/{roomId}")]
    public async Task<IActionResult> GetRoom(Guid roomId)
    {
        var memberId = GetCurrentMemberId();
        if (memberId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid member" });
        }
        
        var room = await _chatService.GetRoomAsync(roomId, memberId);
        if (room == null)
        {
            return NotFound(new { message = "Chat room not found" });
        }
        return Ok(room);
    }

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateChatRoomDto dto)
    {
        var memberId = GetCurrentMemberId();
        if (memberId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid member" });
        }
        
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

    [HttpGet("rooms/{roomId}/messages")]
    public async Task<IActionResult> GetMessages(
        Guid roomId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var memberId = GetCurrentMemberId();
        if (memberId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid member" });
        }
        
        var messages = await _chatService.GetMessagesAsync(roomId, memberId, skip, take);
        return Ok(messages);
    }

    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
    {
        var memberId = GetCurrentMemberId();
        if (memberId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid member" });
        }
        
        try
        {
            var message = await _chatService.SendMessageAsync(dto, memberId);
            return Ok(message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("rooms/{roomId}/read")]
    public async Task<IActionResult> MarkAsRead(Guid roomId)
    {
        var memberId = GetCurrentMemberId();
        if (memberId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid member" });
        }
        
        await _chatService.MarkAsReadAsync(roomId, memberId);
        return Ok(new { message = "Marked as read" });
    }

    [HttpPost("direct/{memberId}")]
    public async Task<IActionResult> GetOrCreateDirectChat(Guid memberId)
    {
        var currentMemberId = GetCurrentMemberId();
        if (currentMemberId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid member" });
        }
        
        var rooms = await _chatService.GetOrCreateIndividualChatAsync(currentMemberId, memberId);
        if (rooms.Count == 0)
        {
            return NotFound(new { message = "Member not found" });
        }
        return Ok(rooms.First());
    }

    private Guid GetCurrentMemberId()
    {
        var memberIdClaim = User.FindFirst("member_id")?.Value;
        return Guid.TryParse(memberIdClaim, out var memberId) ? memberId : Guid.Empty;
    }
}
