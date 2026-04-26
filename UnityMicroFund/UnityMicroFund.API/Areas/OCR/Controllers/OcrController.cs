using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.OCR.Services;

namespace UnityMicroFund.API.Areas.OCR.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OcrController : ControllerBase
{
    private readonly IOcrService _ocrService;
    private readonly ILogger<OcrController> _logger;

    public OcrController(IOcrService ocrService, ILogger<OcrController> logger)
    {
        _ocrService = ocrService;
        _logger = logger;
    }

    [HttpPost("scan")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB max
    public async Task<IActionResult> ScanReceipt(IFormFile file, [FromForm] string receiptType)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        // Validate file type
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Invalid file type. Allowed: JPG, JPEG, PNG" });
        }

        // Validate file size (max 10MB)
        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new { message = "File too large. Max size: 10MB" });
        }

        try
        {
            _logger.LogInformation("Processing OCR for receipt type: {ReceiptType}", receiptType);
            var result = await _ocrService.ProcessReceiptAsync(file, receiptType ?? "");
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OCR processing failed");
            return StatusCode(500, new { message = "OCR processing failed", error = ex.Message });
        }
    }
}