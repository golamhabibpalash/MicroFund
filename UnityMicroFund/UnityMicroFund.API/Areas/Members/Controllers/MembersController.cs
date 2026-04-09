using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Members.DTOs;
using UnityMicroFund.API.Areas.Members.Services;

namespace UnityMicroFund.API.Areas.Members.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly IMemberService _memberService;

    public MembersController(IMemberService memberService)
    {
        _memberService = memberService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetMembers(
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        var members = await _memberService.GetMembersAsync(search, isActive);
        return Ok(members);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMember(Guid id)
    {
        var member = await _memberService.GetMemberByIdAsync(id);
        if (member == null)
        {
            return NotFound(new { message = "Member not found" });
        }
        return Ok(member);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> CreateMember([FromBody] CreateMemberDto dto)
    {
        try
        {
            var member = await _memberService.CreateMemberAsync(dto);
            return CreatedAtAction(nameof(GetMember), new { id = member.Id }, member);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateMember(Guid id, [FromBody] UpdateMemberDto dto)
    {
        var member = await _memberService.UpdateMemberAsync(id, dto);
        if (member == null)
        {
            return NotFound(new { message = "Member not found" });
        }
        return Ok(member);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteMember(Guid id)
    {
        var result = await _memberService.DeleteMemberAsync(id);
        if (!result)
        {
            return NotFound(new { message = "Member not found" });
        }
        return NoContent();
    }
}
