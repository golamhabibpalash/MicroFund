using System.Security.Claims;
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

    // Every room operation checks membership: room IDs reach the client, and without
    // this any authenticated user could listen to or post into rooms (including private
    // one-to-one chats) they do not belong to.
    public async Task JoinRoom(string roomId)
    {
        if (!Guid.TryParse(roomId, out var id) || !await _chatService.IsRoomMemberAsync(id, GetCachedMemberId()))
            throw new HubException("You are not a member of this chat room.");

        await Groups.AddToGroupAsync(Context.ConnectionId, id.ToString());
    }

    public async Task LeaveRoom(string roomId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

    public async Task SendMessage(SendMessageDto dto)
    {
        var memberId = GetCachedMemberId();
        if (!await _chatService.IsRoomMemberAsync(dto.ChatRoomId, memberId))
            throw new HubException("You are not a member of this chat room.");

        var message = await _chatService.SendMessageAsync(dto, memberId);
        await Clients.Group(dto.ChatRoomId.ToString()).SendAsync("ReceiveMessage", message);
    }

    public async Task MarkRead(string roomId)
    {
        if (!Guid.TryParse(roomId, out var id)) return;
        await _chatService.MarkAsReadAsync(id, GetCachedMemberId());
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();

        // Resolve Member.Id once and cache it for this connection's lifetime
        if (Guid.TryParse(userId, out var userGuid))
        {
            var memberId = await _chatService.GetMemberIdByUserIdAsync(userGuid);
            Context.Items["memberId"] = memberId;

            if (memberId != Guid.Empty)
            {
                var rooms = await _chatService.GetRoomsForMemberAsync(memberId);
                foreach (var room in rooms)
                    await Groups.AddToGroupAsync(Context.ConnectionId, room.Id.ToString());
            }
        }

        // Track presence and broadcast
        OnlineTracker.Connect(Context.ConnectionId, userId);
        await Clients.Others.SendAsync("UserOnline", userId);

        // Give the new client the current online list immediately
        await Clients.Caller.SendAsync("OnlineList", OnlineTracker.OnlineUserIds);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();

        if (OnlineTracker.Disconnect(Context.ConnectionId, out _) && !string.IsNullOrEmpty(userId))
            await Clients.Others.SendAsync("UserOffline", userId);

        await base.OnDisconnectedAsync(exception);
    }

    private string GetCurrentUserId()
        => Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;

    private Guid GetCachedMemberId()
    {
        if (Context.Items.TryGetValue("memberId", out var cached) && cached is Guid guid)
            return guid;
        return Guid.Empty;
    }
}
