using System.ComponentModel.DataAnnotations;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Transactions.DTOs;

public class CreateTransactionDto
{
    [Required]
    [MaxLength(200)]
    public string TransferFor { get; set; } = string.Empty;

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }

    [Required]
    public string Status { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [Required]
    public Guid AccountId { get; set; }

    public string? ReceiptType { get; set; }

    public string? RefNo { get; set; }

    public DateTime? TransactionDate { get; set; }
}

public class UpdateTransactionDto
{
    [MaxLength(200)]
    public string? TransferFor { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal? Amount { get; set; }

    public string? Status { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public Guid? AccountId { get; set; }
}

public class ApproveTransactionDto
{
    [Required]
    public bool IsApproved { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}

public class TransactionResponseDto
{
    public Guid Id { get; set; }
    public string RefNo { get; set; } = string.Empty;
    public string TransferFor { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ApprovalStatus { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid TransferById { get; set; }
    public string TransferByName { get; set; } = string.Empty;
    public Guid CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public Guid AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? ReceiptType { get; set; }
    public DateTime? TransactionDate { get; set; }
}

public class TransactionFilterDto
{
    public string? Search { get; set; }
    public Guid? AccountId { get; set; }
    public string? Status { get; set; }
    public string? ApprovalStatus { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
