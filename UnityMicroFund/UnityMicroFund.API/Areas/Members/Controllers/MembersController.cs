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

    [HttpGet]
    public async Task<IActionResult> GetMembers(
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        var members = await _memberService.GetMembersAsync(search, isActive);
        
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
