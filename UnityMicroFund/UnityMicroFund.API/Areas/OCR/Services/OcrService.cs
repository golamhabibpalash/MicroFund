namespace UnityMicroFund.API.Areas.OCR.Services;

using System.Diagnostics;
using System.Runtime.InteropServices;
using UnityMicroFund.API.Areas.OCR.DTOs;

public class OcrService : IOcrService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<OcrService> _logger;

    public OcrService(IWebHostEnvironment environment, ILogger<OcrService> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public async Task<OcrScanResponse> ProcessReceiptAsync(IFormFile file, string receiptType)
    {
        var result = new OcrScanResponse();

        try
        {
            var tempPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}");
            using (var stream = new FileStream(tempPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            try
            {
                var text = await PerformOcr(tempPath);
                result.RawText = text;
                result.ExtractedLines = text.Split('\n').Select(l => l.Trim()).Where(l => !string.IsNullOrEmpty(l)).ToList();

                if (receiptType == "UCB")
                {
                    ParseUcbReceipt(text, result);
                }
                else if (receiptType == "DBBL")
                {
                    ParseDbblReceipt(text, result);
                }
                else if (receiptType == "EBL")
                {
                    ParseEblReceipt(text, result);
                }
                else if (receiptType == "SBL")
                {
                    ParseSblReceipt(text, result);
                }
                else
                {
                    ParseGenericReceipt(text, result);
                }

                result.Success = true;
            }
            finally
            {
                if (File.Exists(tempPath))
                {
                    File.Delete(tempPath);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OCR processing failed");
            result.Success = false;
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    private async Task<string> PerformOcr(string imagePath)
    {
        string[] tesseractPaths;

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            tesseractPaths = new[]
            {
                @"C:\Program Files\Tesseract-OCR\tesseract.exe",
                @"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Tesseract-OCR\tesseract.exe"),
                "tesseract"
            };
        }
        else
        {
            tesseractPaths = new[]
            {
                "/opt/homebrew/bin/tesseract",
                "/usr/local/bin/tesseract",
                "tesseract"
            };
        }

        string? tesseractCmd = null;
        foreach (var cmd in tesseractPaths)
        {
            if (cmd == "tesseract" || File.Exists(cmd))
            {
                tesseractCmd = cmd;
                break;
            }
        }

        if (string.IsNullOrEmpty(tesseractCmd))
        {
            throw new Exception("Tesseract not found. Please install Tesseract OCR");
        }

        // Output to temp file
        var outputPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}");

        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = tesseractCmd,
                Arguments = $"\"{imagePath}\" \"{outputPath}\" -l eng",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            _logger.LogInformation("Running tesseract: {Cmd} {Args}", tesseractCmd, startInfo.Arguments);

            using var process = Process.Start(startInfo);
            if (process != null)
            {
                await process.WaitForExitAsync();

                var error = await process.StandardError.ReadToEndAsync();
                if (!string.IsNullOrEmpty(error))
                {
                    _logger.LogWarning("Tesseract stderr: {Error}", error);
                }
            }

            // Read the output text file
            var resultFile = outputPath + ".txt";
            if (File.Exists(resultFile))
            {
                var text = File.ReadAllText(resultFile);
                File.Delete(resultFile);
                return text;
            }
            else
            {
                throw new Exception("Tesseract failed to generate output");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OCR execution failed");
            throw;
        }
    }

    private void ParseUcbReceipt(string text, OcrScanResponse result)
    {
        var textLower = text.ToLower();

        decimal extractedAmount = 0;
        string? extractedDate = null;
        string? refNo = null;
        string? purpose = null;
        string? transactionId = null;

        if (extractedAmount == 0)
        {
            extractedAmount = Convert.ToDecimal(System.Text.RegularExpressions.Regex.Matches(text, @"(?<=Amount Paid\s)\d+(\.\d+)?(?=\sBDT)")[0].Value);
        }
        if (string.IsNullOrEmpty(transactionId))
        {
            transactionId = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=Transaction ID\s)[A-Z0-9]+")[0].Value;
        }

        var dateMatch = System.Text.RegularExpressions.Regex.Match(text, @"(\d{1,2}[-]\d{1,2}[-]\d{2,4})", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (dateMatch.Success)
        {
            extractedDate = ParseDate(dateMatch.Groups[1].Value);
        }

        var refPatterns = new[]
        {
            @"reference\s*no[:\s]*([a-z0-9]+)",
            @"ref\s*no[:\s]*([a-z0-9]+)",
            @"trx\s*id[:\s]*([a-z0-9]+)"
        };

        foreach (var pattern in refPatterns)
        {
            var match = System.Text.RegularExpressions.Regex.Match(text, pattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                refNo = match.Groups[1].Value;
                break;
            }
        }

        var purposeKeywords = new[] { "cash deposit", "cash withdraw", "fund transfer", "payment", "send money", "receive" };
        foreach (var keyword in purposeKeywords)
        {
            if (textLower.Contains(keyword))
            {
                var idx = textLower.IndexOf(keyword);
                var start = Math.Max(0, idx - 30);
                var end = Math.Min(text.Length, idx + keyword.Length + 30);
                purpose = text.Substring(start, end - start).Trim();
                break;
            }
        }

        result.Amount = extractedAmount;
        result.TransactionDate = extractedDate ?? string.Empty;
        result.TransferFrom = refNo ?? string.Empty;
        result.TransferTo = purpose ?? string.Empty;
        result.TransactionId = transactionId ?? string.Empty;
    }

    private void ParseDbblReceipt(string text, OcrScanResponse result)
    {
        decimal extractedAmount = 0;
        string? extractedDate = null;
        string? TransferFrom = null;
        string? TransferTo = null;
        string? transactionId = null;
        string? remarks = null;

        if (extractedAmount == 0)
        {
            extractedAmount = Convert.ToDecimal(System.Text.RegularExpressions.Regex.Matches(text, @"(?<=Total Payment BDT\s)[\d,]+(\.\d+)?")[0].Value.Replace(",", "").Split('.')[0]);
        }

        if (string.IsNullOrEmpty(transactionId))
        {
            transactionId = System.Text.RegularExpressions.Regex.Matches(text, @"LID[A-Z0-9]+")[0].Value;
        }

        var dateMatch = System.Text.RegularExpressions.Regex.Match(text, @"(\d{1,2}[-](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-]\d{2,4})", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (dateMatch.Success)
        {
            extractedDate = ParseDate(dateMatch.Groups[1].Value);
        }

        if (string.IsNullOrEmpty(TransferFrom))
        {
            var nexusId = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=NexusPay ID\s)\d+")[0].Value;
            TransferFrom = !string.IsNullOrEmpty(nexusId) ? $"{nexusId}" : null;
        }
        if (string.IsNullOrEmpty(TransferTo))
        {
            var account = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=Card/Account\s)\d+")[0].Value;
            TransferTo = !string.IsNullOrEmpty(account) ? $"{account}" : null;
        }

        var rValue = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=\()[A-Za-z]+(?=\))")[0].Value;
        if (string.IsNullOrEmpty(remarks) && !string.IsNullOrEmpty(rValue))
        {
            remarks = "Transfer with : " + rValue;
        }

        result.Amount = extractedAmount;
        result.TransactionDate = extractedDate ?? string.Empty;
        result.TransferFrom = TransferFrom ?? string.Empty;
        result.TransferTo = TransferTo ?? string.Empty;
        result.Remarks = remarks ?? string.Empty;
        result.TransactionId = transactionId ?? string.Empty;
    }

    private void ParseSblReceiptApply(string text, OcrScanResponse result)
    {
        var textLower = text.ToLower();

        decimal extractedAmount = 0;
        string? extractedDate = null;
        string? TransferFrom = null;
        string? TransferTo = null;
        string? transactionId = null;

        if (extractedAmount == 0)
        {
            extractedAmount = Convert.ToDecimal(System.Text.RegularExpressions.Regex.Matches(text, @"(?<=Amount Paid\s)\d+(\.\d+)?(?=\sBDT)")[0].Value);
        }
        if (string.IsNullOrEmpty(transactionId))
        {
            transactionId = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=Transaction ID\s)[A-Z0-9]+")[0].Value;
        }

        var dateMatch = System.Text.RegularExpressions.Regex.Match(text, @"(\d{1,2}[-]\d{1,2}[-]\d{2,4})", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (dateMatch.Success)
        {
            extractedDate = ParseDate(dateMatch.Groups[1].Value);
        }

        var refPatterns = new[]
        {
            @"reference\s*no[:\s]*([a-z0-9]+)",
            @"ref\s*no[:\s]*([a-z0-9]+)",
            @"trx\s*id[:\s]*([a-z0-9]+)"
        };

        foreach (var pattern in refPatterns)
        {
            var match = System.Text.RegularExpressions.Regex.Match(text, pattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                TransferFrom = match.Groups[1].Value;
                break;
            }
        }

        var purposeKeywords = new[] { "cash deposit", "cash withdraw", "fund transfer", "payment", "send money", "receive" };
        foreach (var keyword in purposeKeywords)
        {
            if (textLower.Contains(keyword))
            {
                var idx = textLower.IndexOf(keyword);
                var start = Math.Max(0, idx - 30);
                var end = Math.Min(text.Length, idx + keyword.Length + 30);
                TransferTo = text.Substring(start, end - start).Trim();
                break;
            }
        }

        result.Amount = extractedAmount;
        result.TransactionDate = extractedDate ?? string.Empty;
        result.TransferFrom = TransferFrom ?? string.Empty;
        result.TransferTo = TransferTo ?? string.Empty;
        result.TransactionId = transactionId ?? string.Empty;
    }
    private void ParseEblReceipt(string text, OcrScanResponse result)
    {

        decimal extractedAmount = 0;
        string? extractedDate = null;
        string? TransferFrom = null;
        string? TransferTo = null;
        string? transactionId = null;
        string? remarks = null;

        if (extractedAmount == 0)
        {
            extractedAmount = Convert.ToDecimal(System.Text.RegularExpressions.Regex.Matches(text, @"(?<=BDT\s)[\d,]+(\.\d+)?")[0].Value
                 .Replace(",", "").Split('.')[0]);
        }

        if (string.IsNullOrEmpty(transactionId))
        {
            transactionId = System.Text.RegularExpressions.Regex.Matches(text, @"LID[A-Z0-9]+")[0].Value;
        }

        var dateMatch = System.Text.RegularExpressions.Regex.Match(text, @"(\d{1,2}[-](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-]\d{2,4})", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (dateMatch.Success)
        {
            extractedDate = ParseDate(dateMatch.Groups[1].Value);
        }

        if (string.IsNullOrEmpty(TransferFrom))
        {
            var nexusId = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=NexusPay ID\s)\d+")[0].Value;
            TransferFrom = !string.IsNullOrEmpty(nexusId) ? $"{nexusId}" : null;
        }
        if (string.IsNullOrEmpty(TransferTo))
        {
            var account = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=Card/Account\s)\d+")[0].Value;
            TransferTo = !string.IsNullOrEmpty(account) ? $"{account}" : null;
        }

        var rValue = System.Text.RegularExpressions.Regex.Matches(text, @"(?<=\()[A-Za-z]+(?=\))")[0].Value;
        if (string.IsNullOrEmpty(remarks) && !string.IsNullOrEmpty(rValue))
        {
            remarks = "Transfer with : " + rValue;
        }

        result.Amount = extractedAmount;
        result.TransactionDate = extractedDate ?? string.Empty;
        result.TransferFrom = TransferFrom ?? string.Empty;
        result.TransferTo = TransferTo ?? string.Empty;
        result.Remarks = remarks ?? string.Empty;
        result.TransactionId = transactionId ?? string.Empty;
    }
    private void ParseSblReceipt(string text, OcrScanResponse result)
    {
        ParseSblReceiptApply(text, result);
    }

    private void ParseGenericReceipt(string text, OcrScanResponse result)
    {
        var numbers = System.Text.RegularExpressions.Regex.Matches(text, @"(\d+)")
            .Select(m => decimal.Parse(m.Value))
            .Where(n => n > 100 && n < 10000000)
            .ToList();

        if (numbers.Any())
        {
            result.Amount = numbers.Max();
        }
    }

    private string? ParseDate(string dateStr)
    {
        try
        {
            var months = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "jan", "01" }, { "feb", "02" }, { "mar", "03" }, { "apr", "04" },
                { "may", "05" }, { "jun", "06" }, { "jul", "07" }, { "aug", "08" },
                { "sep", "09" }, { "oct", "10" }, { "nov", "11" }, { "dec", "12" }
            };

            var match = System.Text.RegularExpressions.Regex.Match(dateStr, @"(\d{1,2})[-](\d{1,2})[-](\d{2,4})");
            if (match.Success)
            {
                var day = match.Groups[1].Value.PadLeft(2, '0');
                var month = match.Groups[2].Value.PadLeft(2, '0');
                var year = match.Groups[3].Value;
                if (year.Length == 2) year = "20" + year;
                return $"{year}-{month}-{day}";
            }

            match = System.Text.RegularExpressions.Regex.Match(dateStr, @"(\d{1,2})[-]([a-z]+)[-](\d{2,4})", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var day = match.Groups[1].Value.PadLeft(2, '0');
                var monthKey = match.Groups[2].Value.ToLower();
                var month = months.GetValueOrDefault(monthKey.Substring(0, 3), "01");
                var year = match.Groups[3].Value;
                return $"{year}-{month}-{day}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Date parsing failed for: {DateStr}", dateStr);
        }

        return null;
    }
}