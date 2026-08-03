using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public interface IInvestmentService
{
    Task<IEnumerable<InvestmentResponseDto>> GetInvestmentsAsync(InvestmentType? type = null, CancellationToken cancellationToken = default);
    Task<InvestmentResponseDto?> GetInvestmentByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<InvestmentResponseDto> CreateInvestmentAsync(CreateInvestmentDto dto, string? createdBy, CancellationToken cancellationToken = default);
    Task<InvestmentResponseDto?> UpdateInvestmentAsync(Guid id, UpdateInvestmentDto dto, string? modifiedBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes the investment and its dependants. Returns the stored file URLs of any
    /// attached documents so the caller can remove them from disk; the rows themselves
    /// go via cascade. Returns null when the investment does not exist.
    /// </summary>
    Task<IReadOnlyList<string>?> DeleteInvestmentAsync(Guid id, CancellationToken cancellationToken = default);

    Task<InvestmentDocumentDto?> AddDocumentAsync(Guid investmentId, InvestmentDocumentDto document, CancellationToken cancellationToken = default);

    /// <summary>Returns the deleted document's file URL, or null when not found.</summary>
    Task<string?> DeleteDocumentAsync(Guid investmentId, Guid documentId, CancellationToken cancellationToken = default);
}
