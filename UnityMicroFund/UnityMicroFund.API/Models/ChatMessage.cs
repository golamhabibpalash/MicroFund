using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

[Table("chat_messages")]
public class ChatMessage
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ChatRoomId { get; set; }

    [ForeignKey(nameof(ChatRoomId))]
    public virtual ChatRoom? ChatRoom { get; set; }

    [Required]
    public Guid SenderId { get; set; }

    [ForeignKey(nameof(SenderId))]
    public virtual Member? Sender { get; set; }

    [Required]
    [MaxLength(4000)]
    public string Content { get; set; } = string.Empty;

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }
}