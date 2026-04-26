namespace UnityMicroFund.API.Areas.OCR.Services;

using UnityMicroFund.API.Areas.OCR.DTOs;

public interface IOcrService
{
    Task<OcrScanResponse> ProcessReceiptAsync(IFormFile file, string receiptType);
}

public class OcrResult
{
    public string RawText { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string TransactionId { get; set; } = string.Empty;
    public string TransactionDate { get; set; } = string.Empty;
    public string TransferFor { get; set; } = string.Empty;
    public string ReferenceNo { get; set; } = string.Empty;
    public List<string> ExtractedLines { get; set; } = new();
    public bool Success { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
}