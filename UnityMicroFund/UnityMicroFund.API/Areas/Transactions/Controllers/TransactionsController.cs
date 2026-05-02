using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Transactions.DTOs;
using UnityMicroFund.API.Areas.Transactions.Services;

namespace UnityMicroFund.API.Areas.Transactions.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    private readonly IWebHostEnvironment _environment;
    private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".pdf" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB

    public TransactionsController(ITransactionService transactionService, IWebHostEnvironment environment)
    {
        _transactionService = transactionService;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions([FromQuery] TransactionFilterDto filter)
    {
        var transactions = await _transactionService.GetTransactionsAsync(filter);
        return Ok(transactions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTransaction(Guid id)
    {
        var transaction = await _transactionService.GetTransactionByIdAsync(id);
        if (transaction == null)
        {
            return NotFound(new { message = "Transaction not found" });
        }
        return Ok(transaction);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
            var transaction = await _transactionService.CreateTransactionAsync(dto, userId);
            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTransaction(Guid id, [FromBody] UpdateTransactionDto dto)
    {
        try
        {
            var transaction = await _transactionService.UpdateTransactionAsync(id, dto);
            if (transaction == null)
            {
                return NotFound(new { message = "Transaction not found" });
            }
            return Ok(transaction);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/approve")]
    [Authorize]
    public async Task<IActionResult> ApproveTransaction(Guid id, [FromBody] ApproveTransactionDto dto)
    {
        try
        {
            var approvedByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
            var transaction = await _transactionService.ApproveTransactionAsync(id, dto, approvedByUserId);
            if (transaction == null)
            {
                return NotFound(new { message = "Transaction not found" });
            }
            return Ok(transaction);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(Guid id)
    {
        try
        {
            var result = await _transactionService.DeleteTransactionAsync(id);
            if (!result)
            {
                return NotFound(new { message = "Transaction not found" });
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/receipt")]
    public async Task<IActionResult> UploadReceipt(Guid id, IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            if (file.Length > MaxFileSize)
            {
                return BadRequest(new { message = "File size exceeds 10MB limit" });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Invalid file type. Allowed: jpg, jpeg, png, pdf" });
            }

            var transaction = await _transactionService.GetTransactionByIdAsync(id);
            if (transaction == null)
            {
                return NotFound(new { message = "Transaction not found" });
            }

            var uploadsFolder = Path.Combine(_environment.ContentRootPath, "..", "uploads", "receipts");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{transaction.TransferFrom}_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var receiptUrl = $"/uploads/receipts/{fileName}";
            await _transactionService.UpdateReceiptUrlAsync(id, receiptUrl);

            return Ok(new { receiptUrl });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to upload receipt: {ex.Message}" });
        }
    }

    [HttpGet("receipt-types")]
    public IActionResult GetReceiptTypes()
    {
        var receiptTypes = new[]
        {
            new { id = "DBBL", name = "DBBL (Dutch-Bangla Bank)", icon = "account_balance" },
            new { id = "UCB", name = "UCB (United Credit Bank)", icon = "account_balance" },
            new { id = "EBL", name = "EBL (Eastern Bank)", icon = "account_balance" },
            new { id = "SBL", name = "SBL (Sonali Bank)", icon = "account_balance" },
            new { id = "bKash", name = "bKash", icon = "phone_android" },
            new { id = "Rocket", name = "Rocket", icon = "phone_android" },
            new { id = "Nagad", name = "Nagad", icon = "phone_android" },
            new { id = "BankTransfer", name = "Bank Transfer", icon = "swap_horiz" },
            new { id = "Cash", name = "Cash", icon = "payments" },
            new { id = "Check", name = "Check", icon = "receipt_long" },
            new { id = "Other", name = "Other", icon = "more_horiz" }
        };
        return Ok(receiptTypes);
    }
}
