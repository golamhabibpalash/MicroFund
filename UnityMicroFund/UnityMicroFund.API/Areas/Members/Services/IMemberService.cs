using UnityMicroFund.API.Areas.Members.DTOs;

namespace UnityMicroFund.API.Areas.Members.Services;

public interface IMemberService
{
    Task<IEnumerable<MemberResponseDto>> GetMembersAsync(string? search = null, bool? isActive = null);
    Task<MemberResponseDto?> GetMemberByIdAsync(Guid id);
    Task<MemberResponseDto> CreateMemberAsync(CreateMemberDto dto);
    Task<MemberResponseDto?> UpdateMemberAsync(Guid id, UpdateMemberDto dto);
    Task<bool> DeleteMemberAsync(Guid id);
}
