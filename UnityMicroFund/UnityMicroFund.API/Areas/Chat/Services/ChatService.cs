using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Chat.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Chat.Services;

public interface IChatService
{
    Task<List<ChatRoomDto>> GetRoomsForMemberAsync(Guid memberId);
    Task<ChatRoomDto?> GetRoomAsync(Guid roomId, Guid memberId);
    Task<ChatRoomDto> CreateRoomAsync(CreateChatRoomDto dto, Guid createdBy);
    Task<ChatMessageDto> SendMessageAsync(SendMessageDto dto, Guid senderId);
    Task<List<ChatMessageDto>> GetMessagesAsync(Guid roomId, Guid memberId, int skip = 0, int take = 50);
    Task MarkAsReadAsync(Guid roomId, Guid memberId);
    Task<List<ChatRoomDto>> GetOrCreateIndividualChatAsync(Guid member1Id, Guid member2Id);
}

public class ChatService : IChatService
{
    private readonly AppDbContext _context;

    public ChatService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ChatRoomDto>> GetRoomsForMemberAsync(Guid memberId)
    {
        var roomIds = await _context.ChatRoomMembers
            .Where(m => m.MemberId == memberId)
            .Select(m => m.ChatRoomId)
            .ToListAsync();

        var rooms = await _context.ChatRooms
            .Include(r => r.Members).ThenInclude(m => m.Member)
            .Include(r => r.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .Where(r => roomIds.Contains(r.Id))
            .OrderByDescending(r => r.Messages.Max(m => m.CreatedAt))
            .ToListAsync();

        return rooms.Select(r => MapToDto(r, memberId)).ToList();
    }

    public async Task<ChatRoomDto?> GetRoomAsync(Guid roomId, Guid memberId)
    {
        var room = await _context.ChatRooms
            .Include(r => r.Members).ThenInclude(m => m.Member)
            .Include(r => r.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (room == null) return null;

        var isMember = room.Members.Any(m => m.MemberId == memberId);
        if (!isMember) return null;

        return MapToDto(room, memberId);
    }

    public async Task<ChatRoomDto> CreateRoomAsync(CreateChatRoomDto dto, Guid createdBy)
    {
        var now = DateTime.UtcNow;
        var room = new ChatRoom
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Type = ChatRoomType.Group,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            CreatedBy = createdBy,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.ChatRooms.Add(room);

        var members = new List<ChatRoomMember>
        {
            new ChatRoomMember
            {
                Id = Guid.NewGuid(),
                ChatRoomId = room.Id,
                MemberId = createdBy,
                JoinedAt = now
            }
        };

        foreach (var memberId in dto.MemberIds)
        {
            if (memberId != createdBy)
            {
                members.Add(new ChatRoomMember
                {
                    Id = Guid.NewGuid(),
                    ChatRoomId = room.Id,
                    MemberId = memberId,
                    JoinedAt = now
                });
            }
        }

        _context.ChatRoomMembers.AddRange(members);
        await _context.SaveChangesAsync();

        return await GetRoomAsync(room.Id, createdBy) ?? throw new Exception("Failed to create chat room");
    }

    public async Task<ChatMessageDto> SendMessageAsync(SendMessageDto dto, Guid senderId)
    {
        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatRoomId = dto.ChatRoomId,
            SenderId = senderId,
            Content = dto.Content,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.ChatMessages.Add(message);

        var room = await _context.ChatRooms.FindAsync(dto.ChatRoomId);
        if (room != null)
        {
            room.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        var sender = await _context.Members.FindAsync(senderId);
        return new ChatMessageDto
        {
            Id = message.Id,
            ChatRoomId = message.ChatRoomId,
            SenderId = senderId,
            SenderName = sender?.Name ?? "Unknown",
            SenderImageUrl = sender?.ProfileImageUrl,
            Content = message.Content,
            IsRead = message.IsRead,
            CreatedAt = message.CreatedAt
        };
    }

    public async Task<List<ChatMessageDto>> GetMessagesAsync(Guid roomId, Guid memberId, int skip = 0, int take = 50)
    {
        var isMember = await _context.ChatRoomMembers
            .AnyAsync(m => m.ChatRoomId == roomId && m.MemberId == memberId);

        if (!isMember) return new List<ChatMessageDto>();

        var messages = await _context.ChatMessages
            .Include(m => m.Sender)
            .Where(m => m.ChatRoomId == roomId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return messages.Select(m => new ChatMessageDto
        {
            Id = m.Id,
            ChatRoomId = m.ChatRoomId,
            SenderId = m.SenderId,
            SenderName = m.Sender?.Name ?? "Unknown",
            SenderImageUrl = m.Sender?.ProfileImageUrl,
            Content = m.Content,
            IsRead = m.IsRead,
            CreatedAt = m.CreatedAt
        }).ToList();
    }

    public async Task MarkAsReadAsync(Guid roomId, Guid memberId)
    {
        var member = await _context.ChatRoomMembers
            .FirstOrDefaultAsync(m => m.ChatRoomId == roomId && m.MemberId == memberId);

        if (member != null)
        {
            member.LastReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<ChatRoomDto>> GetOrCreateIndividualChatAsync(Guid member1Id, Guid member2Id)
    {
        var existingRoom = await _context.ChatRooms
            .Include(r => r.Members)
            .Where(r => r.Type == ChatRoomType.Individual)
            .Where(r => r.Members.Any(m => m.MemberId == member1Id))
            .Where(r => r.Members.Any(m => m.MemberId == member2Id))
            .FirstOrDefaultAsync();

        if (existingRoom != null)
        {
            var dto = await GetRoomAsync(existingRoom.Id, member1Id);
            return dto != null ? new List<ChatRoomDto> { dto } : new List<ChatRoomDto>();
        }

        var member1 = await _context.Members.FindAsync(member1Id);
        var member2 = await _context.Members.FindAsync(member2Id);

        if (member1 == null || member2 == null)
            return new List<ChatRoomDto>();

        var now = DateTime.UtcNow;
        var room = new ChatRoom
        {
            Id = Guid.NewGuid(),
            Name = $"{member1.Name}, {member2.Name}",
            Type = ChatRoomType.Individual,
            CreatedBy = member1Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.ChatRooms.Add(room);
        _context.ChatRoomMembers.AddRange(
            new ChatRoomMember
            {
                Id = Guid.NewGuid(),
                ChatRoomId = room.Id,
                MemberId = member1Id,
                JoinedAt = now
            },
            new ChatRoomMember
            {
                Id = Guid.NewGuid(),
                ChatRoomId = room.Id,
                MemberId = member2Id,
                JoinedAt = now
            }
        );

        await _context.SaveChangesAsync();

        var result = await GetRoomAsync(room.Id, member1Id);
        return result != null ? new List<ChatRoomDto> { result } : new List<ChatRoomDto>();
    }

    private ChatRoomDto MapToDto(ChatRoom room, Guid currentMemberId)
    {
        var unreadCount = 0;
        var member = room.Members.FirstOrDefault(m => m.MemberId == currentMemberId);
        if (member != null && member.LastReadAt.HasValue)
        {
            unreadCount = room.Messages.Count(m => m.CreatedAt > member.LastReadAt);
        }

        var lastMessage = room.Messages.FirstOrDefault();
        ChatMessageDto? lastMessageDto = null;
        if (lastMessage != null)
        {
            lastMessageDto = new ChatMessageDto
            {
                Id = lastMessage.Id,
                ChatRoomId = lastMessage.ChatRoomId,
                SenderId = lastMessage.SenderId,
                SenderName = lastMessage.Sender?.Name ?? "Unknown",
                Content = lastMessage.Content,
                CreatedAt = lastMessage.CreatedAt
            };
        }

        return new ChatRoomDto
        {
            Id = room.Id,
            Name = room.Name,
            Type = room.Type.ToString(),
            Description = room.Description,
            ImageUrl = room.ImageUrl,
            CreatedBy = room.CreatedBy,
            CreatedAt = room.CreatedAt,
            UnreadCount = unreadCount,
            LastMessage = lastMessageDto,
            Members = room.Members.Select(m => new ChatMemberDto
            {
                Id = m.Id,
                MemberId = m.MemberId,
                MemberName = m.Member?.Name ?? "Unknown",
                ProfileImageUrl = m.Member?.ProfileImageUrl,
                JoinedAt = m.JoinedAt
            }).ToList()
        };
    }
}