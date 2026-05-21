using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Members.DTOs;
using UnityMicroFund.API.Areas.Members.Services;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Members.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly IMemberService _memberService;
    private readonly AppDbContext _context;

    public MembersController(IMemberService memberService, AppDbContext context)
    {
        _memberService = memberService;
        _context = context;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUserMember()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var userId);

        Member? member = null;

        if (!string.IsNullOrEmpty(userEmail))
        {
            member = await _context.Members
                .FirstOrDefaultAsync(m => m.IsActive &&
                    m.Email != null &&
                    m.Email.ToLower() == userEmail.ToLower());
        }

        if (member == null && userId != Guid.Empty)
        {
            member = await _context.Members
                .FirstOrDefaultAsync(m => m.IsActive && m.UserId == userId);
        }

        if (member == null)
            return NotFound(new { message = "No member record is linked to your account. Please contact your administrator." });

        return Ok(new { id = member.Id, name = member.Name, email = member.Email });
    }

    [HttpGet]
    public async Task<IActionResult> GetMembers(
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? email = null)
    {
        var members = await _memberService.GetMembersAsync(search, isActive);
        
        if (userId.HasValue)
        {
            members = members.Where(m => m.UserId == userId.Value);
        }
        
        if (!string.IsNullOrEmpty(email))
        {
            members = members.Where(m => m.Email != null && m.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
        }
        
        var membersList = members.ToList();
        
        var totalPool = await _context.Contributions
            .Where(c => c.Status == ContributionStatus.Paid)
            .SumAsync(c => c.Amount);
        
        var memberTotals = await _context.Contributions
            .Where(c => c.Status == ContributionStatus.Paid)
            .GroupBy(c => c.MemberId)
            .Select(g => new { MemberId = g.Key, Total = g.Sum(c => c.Amount), Count = g.Count() })
            .ToDictionaryAsync(x => x.MemberId, x => new { x.Total, x.Count });
        
        var result = membersList.Select(m =>
        {
            if (memberTotals.TryGetValue(m.Id, out var totals))
            {
                m.TotalContributions = totals.Total;
                m.TotalInstallmentsPaid = totals.Count;
                m.SharePercentage = totalPool > 0 ? (totals.Total / totalPool) * 100 : 0;
            }
            return m;
        }).ToList();
        
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
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
