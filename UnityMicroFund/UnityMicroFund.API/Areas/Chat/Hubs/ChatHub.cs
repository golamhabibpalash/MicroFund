using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using UnityMicroFund.API.Areas.Chat.DTOs;
using UnityMicroFund.API.Areas.Chat.Services;

namespace UnityMicroFund.API.Areas.Chat.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;

    public ChatHub(IChatService chatService)
    {
        _chatService = chatService;
    }

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }

    public async Task SendMessage(SendMessageDto dto)
    {
        var senderId = GetCurrentMemberId();
        var message = await _chatService.SendMessageAsync(dto, senderId);

        await Clients.Group(dto.ChatRoomId.ToString()).SendAsync("ReceiveMessage", message);
    }

    public async Task MarkRead(string roomId)
    {
        var memberId = GetCurrentMemberId();
        await _chatService.MarkAsReadAsync(Guid.Parse(roomId), memberId);
    }

    public override async Task OnConnectedAsync()
    {
        var memberId = GetCurrentMemberId();
        var rooms = await _chatService.GetRoomsForMemberAsync(memberId);

        foreach (var room in rooms)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, room.Id.ToString());
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }

    private Guid GetCurrentMemberId()
    {
        var memberIdClaim = Context.User?.FindFirst("member_id")?.Value;
        return Guid.TryParse(memberIdClaim, out var memberId) ? memberId : Guid.Empty;
    }
}