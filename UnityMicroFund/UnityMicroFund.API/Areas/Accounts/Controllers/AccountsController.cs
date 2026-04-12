using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Accounts.DTOs;
using UnityMicroFund.API.Areas.Accounts.Services;

namespace UnityMicroFund.API.Areas.Accounts.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        Console.WriteLine($"GetAccounts called - search: {search}, isActive: {isActive}");
        var accounts = await _accountService.GetAccountsAsync(search, isActive);
        Console.WriteLine($"Returning {accounts.Count()} accounts");
        return Ok(accounts);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAccount(Guid id)
    {
        var account = await _accountService.GetAccountByIdAsync(id);
        if (account == null)
        {
            return NotFound(new { message = "Account not found" });
        }
        return Ok(account);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "Account name is required" });
            }

            if (string.IsNullOrWhiteSpace(dto.AccountType))
            {
                return BadRequest(new { message = "Account type is required" });
            }

            var userId = User.Identity?.Name ?? "system";
            var account = await _accountService.CreateAccountAsync(dto, userId);
            return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, account);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to create account: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateAccount(Guid id, [FromBody] UpdateAccountDto dto)
    {
        try
        {
            var account = await _accountService.UpdateAccountAsync(id, dto);
            if (account == null)
            {
                return NotFound(new { message = "Account not found" });
            }
            return Ok(account);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to update account: {ex.Message}" });
        }
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteAccount(Guid id)
    {
        try
        {
            var result = await _accountService.DeleteAccountAsync(id);
            if (!result)
            {
                return NotFound(new { message = "Account not found" });
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to delete account: {ex.Message}" });
        }
    }
}
