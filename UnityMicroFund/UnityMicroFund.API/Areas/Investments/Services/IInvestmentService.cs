using UnityMicroFund.API.Areas.Investments.DTOs;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Investments.Services;

public interface IInvestmentService
{
    Task<IEnumerable<InvestmentResponseDto>> GetInvestmentsAsync(InvestmentType? type = null);
    Task<InvestmentResponseDto?> GetInvestmentByIdAsync(Guid id);
    Task<InvestmentResponseDto> CreateInvestmentAsync(CreateInvestmentDto dto);
    Task<InvestmentResponseDto?> UpdateInvestmentAsync(Guid id, UpdateInvestmentDto dto);
    Task<bool> DeleteInvestmentAsync(Guid id);
}
