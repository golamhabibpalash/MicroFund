using UnityMicroFund.API.Areas.Transactions.DTOs;

namespace UnityMicroFund.API.Areas.Transactions.Services;

public interface ITransactionService
{
    Task<IEnumerable<TransactionResponseDto>> GetTransactionsAsync(TransactionFilterDto filter);
    Task<TransactionResponseDto?> GetTransactionByIdAsync(Guid id);
    Task<TransactionResponseDto> CreateTransactionAsync(CreateTransactionDto dto, Guid userId);
    Task<TransactionResponseDto?> UpdateTransactionAsync(Guid id, UpdateTransactionDto dto);
    Task<TransactionResponseDto?> ApproveTransactionAsync(Guid id, ApproveTransactionDto dto, Guid approvedByUserId);
    Task<bool> DeleteTransactionAsync(Guid id);
    Task<string> GenerateRefNoAsync();
}
