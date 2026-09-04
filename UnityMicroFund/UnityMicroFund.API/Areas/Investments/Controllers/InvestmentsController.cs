using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Areas.Investments.Services;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvestmentsController : ControllerBase
{
    private const long MaxFileSize = 10 * 1024 * 1024;

    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".pdf" };

    private static readonly string[] AllowedContentTypes =
    {
        "image/jpeg", "image/jpg", "image/png", "application/pdf"
    };

    private readonly IInvestmentService _investmentService;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IInvestmentLifecycleService _lifecycleService;
    private readonly IInterimProfitService _interimProfitService;
    private readonly IProjectCostService _projectCostService;
    private readonly UnityMicroFund.API.Data.AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public InvestmentsController(
        IInvestmentService investmentService,
        ISubscriptionService subscriptionService,
        IInvestmentLifecycleService lifecycleService,
        IInterimProfitService interimProfitService,
        IProjectCostService projectCostService,
        UnityMicroFund.API.Data.AppDbContext context,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _investmentService = investmentService;
        _subscriptionService = subscriptionService;
        _lifecycleService = lifecycleService;
        _interimProfitService = interimProfitService;
        _projectCostService = projectCostService;
        _context = context;
        _configuration = configuration;
        _environment = environment;
    }

    /// <summary>
    /// Buys shares. Members buy for themselves; Admin/Manager may buy on a member's
    /// behalf by supplying MemberId.
    /// </summary>
    [HttpPost("{id}/subscribe")]
    public async Task<IActionResult> Subscribe(
        Guid id,
        [FromBody] SubscribeToInvestmentDto dto,
        CancellationToken cancellationToken)
    {
        var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Manager");
        Guid memberId;

        if (dto.MemberId.HasValue && isPrivileged)
        {
            memberId = dto.MemberId.Value;
        }
        else
        {
            var resolved = await ResolveCurrentMemberIdAsync(cancellationToken);
            if (resolved == null)
            {
                return NotFound(new { message = "No member profile is linked to this account." });
            }
            memberId = resolved.Value;
        }

        var result = await _subscriptionService.SubscribeAsync(
            id, memberId, dto.Shares, dto.AgreementAccepted, GetCurrentUserName(), cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id}/subscriptions")]
    public async Task<IActionResult> GetSubscriptions(Guid id, CancellationToken cancellationToken)
        => Ok(await _subscriptionService.GetSubscriptionsAsync(id, cancellationToken));

    [HttpPost("{id}/status")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ChangeStatus(
        Guid id, [FromBody] ChangeInvestmentStatusDto dto, CancellationToken cancellationToken)
        => Ok(await _lifecycleService.ChangeStatusAsync(id, dto.Status, dto.Reason, GetCurrentUserName(), cancellationToken));

    [HttpPost("{id}/complete")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Complete(
        Guid id, [FromBody] CompleteInvestmentDto dto, CancellationToken cancellationToken)
        => Ok(await _lifecycleService.CompleteAsync(id, dto, GetCurrentUserName(), cancellationToken));

    [HttpPost("{id}/distribute-profit")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DistributeProfit(Guid id, CancellationToken cancellationToken)
        => Ok(await _lifecycleService.DistributeProfitAsync(id, GetCurrentUserName(), cancellationToken));

    [HttpGet("{id}/settlement")]
    public async Task<IActionResult> GetSettlement(Guid id, CancellationToken cancellationToken)
        => Ok(await _lifecycleService.GetSettlementAsync(id, cancellationToken));

    [HttpGet("{id}/interim-profits")]
    public async Task<IActionResult> GetInterimProfits(Guid id, CancellationToken cancellationToken)
        => Ok(await _interimProfitService.GetForInvestmentAsync(id, cancellationToken));

    [HttpPost("{id}/interim-profits")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateInterimProfit(
        Guid id, [FromBody] CreateInterimProfitDto dto, CancellationToken cancellationToken)
        => Ok(await _interimProfitService.CreateAsync(id, dto, GetCurrentUserName(), cancellationToken));

    [HttpDelete("{id}/interim-profits/{profitId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteInterimProfit(Guid id, Guid profitId, CancellationToken cancellationToken)
        => await _interimProfitService.DeleteAsync(id, profitId, cancellationToken)
            ? NoContent()
            : NotFound(new { message = "Interim profit record not found" });

    [HttpGet("{id}/project-costs")]
    public async Task<IActionResult> GetProjectCosts(Guid id, CancellationToken cancellationToken)
        => Ok(await _projectCostService.GetForInvestmentAsync(id, cancellationToken));

    [HttpPost("{id}/project-costs")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateProjectCost(
        Guid id, [FromBody] CreateProjectCostDto dto, CancellationToken cancellationToken)
        => Ok(await _projectCostService.CreateAsync(id, dto, GetCurrentUserName(), cancellationToken));

    [HttpPut("{id}/project-costs/{costId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateProjectCost(
        Guid id, Guid costId, [FromBody] UpdateProjectCostDto dto, CancellationToken cancellationToken)
    {
        var updated = await _projectCostService.UpdateAsync(id, costId, dto, GetCurrentUserName(), cancellationToken);
        return updated == null
            ? NotFound(new { message = "Project cost not found" })
            : Ok(updated);
    }

    [HttpDelete("{id}/project-costs/{costId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProjectCost(Guid id, Guid costId, CancellationToken cancellationToken)
        => await _projectCostService.DeleteAsync(id, costId, cancellationToken)
            ? NoContent()
            : NotFound(new { message = "Project cost not found" });

    [HttpPost("{id}/disburse")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Disburse(
        Guid id, [FromBody] DisburseDto? dto, CancellationToken cancellationToken)
        => Ok(await _lifecycleService.DisburseAsync(id, dto?.MemberId, GetCurrentUserName(), cancellationToken));

    private async Task<Guid?> ResolveCurrentMemberIdAsync(CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);

        if (Guid.TryParse(userIdRaw, out var userId))
        {
            var byUser = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .FirstOrDefaultAsync(
                    _context.Members.AsNoTracking().Where(m => m.UserId == userId).Select(m => (Guid?)m.Id),
                    cancellationToken);

            if (byUser.HasValue) return byUser;
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            return await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .FirstOrDefaultAsync(
                    _context.Members.AsNoTracking().Where(m => m.Email == email).Select(m => (Guid?)m.Id),
                    cancellationToken);
        }

        return null;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetInvestments(
        [FromQuery] InvestmentType? type = null,
        CancellationToken cancellationToken = default)
    {
        var investments = await _investmentService.GetInvestmentsAsync(type, cancellationToken);
        return Ok(investments);
    }

    /// <summary>
    /// Published investment feed for members - only circulated projects are shown.
    /// Draft/Cancelled projects are never exposed to the investing membership.
    /// </summary>
    [HttpGet("published")]
    public async Task<IActionResult> GetPublishedInvestments(
        [FromQuery] InvestmentType? type = null,
        CancellationToken cancellationToken = default)
    {
        var investments = await _investmentService.GetPublishedInvestmentsAsync(type, cancellationToken);
        return Ok(investments);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvestment(Guid id, CancellationToken cancellationToken)
    {
        var investment = await _investmentService.GetInvestmentByIdAsync(id, cancellationToken);
        if (investment == null)
        {
            return NotFound(new { message = "Investment not found" });
        }
        return Ok(investment);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateInvestment(
        [FromBody] CreateInvestmentDto dto,
        CancellationToken cancellationToken)
    {
        var investment = await _investmentService.CreateInvestmentAsync(dto, GetCurrentUserName(), cancellationToken);
        return CreatedAtAction(nameof(GetInvestment), new { id = investment.Id }, investment);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateInvestment(
        Guid id,
        [FromBody] UpdateInvestmentDto dto,
        CancellationToken cancellationToken)
    {
        var investment = await _investmentService.UpdateInvestmentAsync(id, dto, GetCurrentUserName(), cancellationToken);
        if (investment == null)
        {
            return NotFound(new { message = "Investment not found" });
        }
        return Ok(investment);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteInvestment(Guid id, CancellationToken cancellationToken)
    {
        var removedFileUrls = await _investmentService.DeleteInvestmentAsync(id, cancellationToken);
        if (removedFileUrls == null)
        {
            return NotFound(new { message = "Investment not found" });
        }

        foreach (var fileUrl in removedFileUrls)
        {
            TryDeleteFile(fileUrl);
        }

        return NoContent();
    }

    [HttpPost("{id}/documents")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UploadDocument(Guid id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        if (file.Length > MaxFileSize)
        {
            return BadRequest(new { message = "File size exceeds the 10MB limit" });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Invalid file type. Allowed: jpg, jpeg, png, pdf" });
        }

        // Check the declared content type as well as the extension - an extension
        // alone is trivially renamed.
        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "Invalid file type. Allowed: jpg, jpeg, png, pdf" });
        }

        var uploadsFolder = GetDocumentsPath();
        Directory.CreateDirectory(uploadsFolder);

        var storedName = $"{id}_{DateTime.UtcNow:yyyyMMddHHmmssfff}{extension}";
        var filePath = Path.Combine(uploadsFolder, storedName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var document = await _investmentService.AddDocumentAsync(id, new InvestmentDocumentDto
        {
            FileName = Path.GetFileName(file.FileName),
            FileUrl = $"/assets/investment/{storedName}",
            ContentType = file.ContentType,
            FileSizeBytes = file.Length,
            UploadedBy = GetCurrentUserName()
        }, cancellationToken);

        if (document == null)
        {
            // The investment vanished between upload and save - do not leave the file behind.
            TryDeleteFile($"/assets/investment/{storedName}");
            return NotFound(new { message = "Investment not found" });
        }

        return Ok(document);
    }

    [HttpDelete("{id}/documents/{documentId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> DeleteDocument(Guid id, Guid documentId, CancellationToken cancellationToken)
    {
        var fileUrl = await _investmentService.DeleteDocumentAsync(id, documentId, cancellationToken);
        if (fileUrl == null)
        {
            return NotFound(new { message = "Document not found" });
        }

        TryDeleteFile(fileUrl);
        return NoContent();
    }

    private string GetDocumentsPath() =>
        _configuration["Uploads:InvestmentDocumentsPath"]
        ?? Path.Combine(_environment.ContentRootPath, "..", "uploads", "investment");

    private void TryDeleteFile(string fileUrl)
    {
        try
        {
            var fileName = Path.GetFileName(fileUrl);
            if (string.IsNullOrWhiteSpace(fileName)) return;

            var filePath = Path.Combine(GetDocumentsPath(), fileName);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }
        catch (IOException)
        {
            // The database record is already gone; a stale file on disk is not worth
            // failing the request over.
        }
    }

    private string? GetCurrentUserName() =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue(ClaimTypes.Email)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
}
