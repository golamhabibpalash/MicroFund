namespace UnityMicroFund.API.Areas.Chat.DTOs;

public class CreateChatRoomDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public List<Guid> MemberIds { get; set; } = new();
}

public class ChatRoomDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ChatMemberDto> Members { get; set; } = new();
    public int UnreadCount { get; set; }
    public ChatMessageDto? LastMessage { get; set; }
}

public class ChatMemberDto
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class ChatMessageDto
{
    public Guid Id { get; set; }
    public Guid ChatRoomId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string? SenderImageUrl { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SendMessageDto
{
    public Guid ChatRoomId { get; set; }
    public string Content { get; set; } = string.Empty;
}