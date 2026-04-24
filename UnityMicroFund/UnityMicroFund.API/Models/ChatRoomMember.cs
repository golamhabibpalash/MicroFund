using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

[Table("chat_room_members")]
public class ChatRoomMember
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ChatRoomId { get; set; }

    [ForeignKey(nameof(ChatRoomId))]
    public virtual ChatRoom? ChatRoom { get; set; }

    [Required]
    public Guid MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }

    public DateTime JoinedAt { get; set; }

    public DateTime? LastReadAt { get; set; }
}