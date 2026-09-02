using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Investments.Services;
using UnityMicroFund.API.Areas.Tasks.Services;
using UnityMicroFund.API.Areas.Transactions.DTOs;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.Email;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Infrastructure.Logging;
using UnityMicroFund.API.Models;

namespace UnityMicroFund.API.Areas.Transactions.Services;

public class TransactionService : ITransactionService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;
    private readonly IWalletService _walletService;

    public TransactionService(AppDbContext context, IEmailService emailService, IAuditService auditService, INotificationService notificationService, IWalletService walletService)
    {
        _context = context;
        _emailService = emailService;
        _auditService = auditService;
        _notificationService = notificationService;
        _walletService = walletService;
    }

    private IQueryable<Transaction> BuildFilteredQuery(TransactionFilterDto filter, Guid? userId = null, bool isAdmin = false)
    {
        var query = _context.Transactions
            .Include(t => t.TransferBy)
            .Include(t => t.CreatedBy)
            .Include(t => t.ApprovedByUser)
            .Include(t => t.Account)
            .Include(t => t.MemberTransactionMaps)
                .ThenInclude(m => m.Member)
            .AsQueryable();

        if (!isAdmin && userId.HasValue)
        {
            query = query.Where(t => t.CreatedById == userId.Value || t.MemberTransactionMaps.Any(m => m.MemberId == userId.Value));
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(t =>
                t.TransactionId.ToLower().Contains(search) ||
                (t.TransferFrom != null && t.TransferFrom.ToLower().Contains(search)) ||
                t.TransferTo.ToLower().Contains(search) ||
                (t.Remarks != null && t.Remarks.ToLower().Contains(search)) ||
                (t.Account != null && t.Account.Name.ToLower().Contains(search)) ||
                t.MemberTransactionMaps.Any(m => m.Member != null && m.Member.Name.ToLower().Contains(search)));
        }

        if (filter.AccountId.HasValue)
        {
            query = query.Where(t => t.AccountId == filter.AccountId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<TransactionStatus>(filter.Status, true, out var status))
        {
            query = query.Where(t => t.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.ApprovalStatus) && Enum.TryParse<TransactionApprovalStatus>(filter.ApprovalStatus, true, out var approvalStatus))
        {
            query = query.Where(t => t.ApprovalStatus == approvalStatus);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt <= filter.ToDate.Value);
        }

        if (filter.MemberId.HasValue)
        {
            query = query.Where(t => t.MemberTransactionMaps.Any(m => m.MemberId == filter.MemberId.Value));
        }

        return query;
    }

    public async Task<IEnumerable<TransactionResponseDto>> GetTransactionsAsync(TransactionFilterDto filter, Guid? userId = null, bool isAdmin = false)
    {
        var query = BuildFilteredQuery(filter, userId, isAdmin);

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return transactions.Select(MapToDto);
    }

    public async Task<TransactionSummaryDto> GetTransactionSummaryAsync(TransactionFilterDto filter, Guid? userId = null, bool isAdmin = false)
    {
        var query = BuildFilteredQuery(filter, userId, isAdmin);

        var totalFunded = await query
            .Where(t => t.Status == TransactionStatus.Fund && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        var totalRefunded = await query
            .Where(t => t.Status == TransactionStatus.Refund && t.ApprovalStatus == TransactionApprovalStatus.Approved)
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        var pendingCount = await query
            .Where(t => t.ApprovalStatus == TransactionApprovalStatus.Pending)
            .CountAsync();

        return new TransactionSummaryDto
        {
            TotalFunded = totalFunded,
            TotalRefunded = totalRefunded,
            PendingCount = pendingCount
        };
    }

    public async Task<byte[]> ExportTransactionsToExcelAsync(TransactionFilterDto filter, Guid? userId = null, bool isAdmin = false)
    {
        var query = BuildFilteredQuery(filter, userId, isAdmin);

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.TransactionId,
                MemberName = t.MemberTransactionMaps.Select(m => m.Member != null ? m.Member.Name : null).FirstOrDefault(),
                t.TransferFrom,
                t.TransferTo,
                t.Amount,
                AccountName = t.Account != null ? t.Account.Name : null,
                Status = t.Status.ToString(),
                ApprovalStatus = t.ApprovalStatus.ToString(),
                ReceiptType = t.ReceiptType ?? "",
                CreatedByName = t.CreatedBy != null ? t.CreatedBy.Name : null,
                t.CreatedAt,
                ApprovedByName = t.ApprovedByUser != null ? t.ApprovedByUser.Name : null,
                t.ApprovedAt
            })
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Transactions");

        var headers = new[] { "Transaction ID", "Member", "Transfer From", "Transfer To", "Amount",
            "Account", "Type", "Approval Status", "Receipt Type", "Created By", "Created At",
            "Approved By", "Approved At" };

        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
            ws.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.FromArgb(102, 126, 234);
            ws.Cell(1, i + 1).Style.Font.FontColor = XLColor.White;
        }

        int row = 2;
        foreach (var t in transactions)
        {
            ws.Cell(row, 1).Value = t.TransactionId;
            ws.Cell(row, 2).Value = t.MemberName ?? t.CreatedByName ?? "";
            ws.Cell(row, 3).Value = t.TransferFrom ?? "";
            ws.Cell(row, 4).Value = t.TransferTo;
            ws.Cell(row, 5).Value = t.Amount;
            ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0.00";
            ws.Cell(row, 6).Value = t.AccountName ?? "";
            ws.Cell(row, 7).Value = t.Status;
            ws.Cell(row, 8).Value = t.ApprovalStatus;
            ws.Cell(row, 9).Value = t.ReceiptType;
            ws.Cell(row, 10).Value = t.CreatedByName ?? "";
            ws.Cell(row, 11).Value = t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");
            ws.Cell(row, 12).Value = t.ApprovedByName ?? "";
            ws.Cell(row, 13).Value = t.ApprovedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "";
            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<byte[]> ExportTransactionsToCsvAsync(TransactionFilterDto filter, Guid? userId = null, bool isAdmin = false)
    {
        var query = BuildFilteredQuery(filter, userId, isAdmin);

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.TransactionId,
                MemberName = t.MemberTransactionMaps.Select(m => m.Member != null ? m.Member.Name : null).FirstOrDefault(),
                t.TransferFrom,
                t.TransferTo,
                t.Amount,
                AccountName = t.Account != null ? t.Account.Name : null,
                Status = t.Status.ToString(),
                ApprovalStatus = t.ApprovalStatus.ToString(),
                ReceiptType = t.ReceiptType ?? "",
                CreatedByName = t.CreatedBy != null ? t.CreatedBy.Name : null,
                t.CreatedAt,
                ApprovedByName = t.ApprovedByUser != null ? t.ApprovedByUser.Name : null,
                t.ApprovedAt
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Transaction ID,Member,Transfer From,Transfer To,Amount,Account,Type,Approval Status,Receipt Type,Created By,Created At,Approved By,Approved At");

        foreach (var t in transactions)
        {
            sb.AppendLine(
                $"{EscapeCsv(t.TransactionId)}," +
                $"{EscapeCsv(t.MemberName ?? t.CreatedByName ?? "")}," +
                $"{EscapeCsv(t.TransferFrom ?? "")}," +
                $"{EscapeCsv(t.TransferTo)}," +
                $"{t.Amount.ToString("F2", CultureInfo.InvariantCulture)}," +
                $"{EscapeCsv(t.AccountName ?? "")}," +
                $"{EscapeCsv(t.Status)}," +
                $"{EscapeCsv(t.ApprovalStatus)}," +
                $"{EscapeCsv(t.ReceiptType)}," +
                $"{EscapeCsv(t.CreatedByName ?? "")}," +
                $"{EscapeCsv(t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"))}," +
                $"{EscapeCsv(t.ApprovedByName ?? "")}," +
                $"{EscapeCsv(t.ApprovedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "")}"
            );
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    public async Task<TransactionResponseDto?> GetTransactionByIdAsync(Guid id)
    {
        var transaction = await _context.Transactions
            .Include(t => t.TransferBy)
            .Include(t => t.CreatedBy)
            .Include(t => t.ApprovedByUser)
            .Include(t => t.Account)
            .FirstOrDefaultAsync(t => t.Id == id);

        return transaction == null ? null : MapToDto(transaction);
    }

    public async Task<TransactionResponseDto> CreateTransactionAsync(CreateTransactionDto dto, Guid userId)
    {
        if (!Enum.TryParse<TransactionStatus>(dto.Status, true, out var status))
        {
            throw new ArgumentException("Invalid transaction status. Must be 'Fund' or 'Refund'");
        }

        var requiresAccount = dto.ReceiptType is "DBBL" or "UCB" or "EBL" or "PBL";
        if (requiresAccount && !dto.AccountId.HasValue)
        {
            throw new ArgumentException("Account is required for bank transactions");
        }

        if (dto.AccountId.HasValue)
        {
            var accountExists = await _context.Accounts.AnyAsync(a => a.Id == dto.AccountId.Value && a.IsActive);
            if (!accountExists)
            {
                throw new ArgumentException("Invalid or inactive account");
            }
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new ArgumentException("User not found");
        }

        var member = await _context.Members.FirstOrDefaultAsync(m => m.UserId == userId);
        if (member == null && user.Role != Models.UserRole.Admin)
        {
            throw new InvalidOperationException("Only approved members or administrators can create transactions");
        }

        if (member != null && !member.IsActive)
        {
            throw new InvalidOperationException("Your member account is inactive");
        }

        var memberExists = await _context.Members.AnyAsync(m => m.Id == dto.MemberId && m.IsActive);
        if (!memberExists)
        {
            throw new ArgumentException("Invalid or inactive member");
        }

        var transaction = new Transaction
        {
            TransactionId = string.IsNullOrWhiteSpace(dto.TransactionId) ? await GenerateTransactionIdAsync() : dto.TransactionId,
            TransferFrom = dto.TransferFrom,
            TransferTo = dto.TransferTo,
            Amount = dto.Amount,
            Status = status,
            Remarks = dto.Remarks,
            TransferById = userId,
            CreatedById = userId,
            AccountId = dto.AccountId,
            ApprovalStatus = TransactionApprovalStatus.Pending,
            ReceiptType = dto.ReceiptType,
            TransactionDate = dto.TransactionDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        var memberTransactionMap = new MemberTransactionMap
        {
            MemberId = dto.MemberId,
            TransactionId = transaction.Id,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.MemberTransactionMaps.Add(memberTransactionMap);
        await _context.SaveChangesAsync();

        var targetMember = await _context.Members.FindAsync(dto.MemberId);
        var accountName = dto.AccountId.HasValue
            ? (await _context.Accounts.FindAsync(dto.AccountId.Value))?.Name ?? "N/A"
            : "N/A";
        var admins = await _context.Users.Where(u => u.Role == Models.UserRole.Admin && u.IsActive).ToListAsync();
        foreach (var admin in admins)
        {
            await _notificationService.CreateNotificationAsync(
                "New Transaction",
                $"User {targetMember?.Name ?? "Unknown"} created a {transaction.Status.ToString().ToLower()} transaction of ৳{transaction.Amount:N2}. Transaction ID: {transaction.TransactionId}",
                NotificationType.TransactionCreated,
                admin.Id,
                userId,
                relatedUserId: userId,
                relatedMemberId: dto.MemberId
            );

            _ = _emailService.SendTransactionCreatedEmailAsync(
                admin.Email,
                admin.Name,
                targetMember?.Name ?? "Unknown",
                transaction.Amount,
                transaction.Status.ToString(),
                accountName,
                transaction.Remarks ?? "",
                transaction.TransactionId,
                transaction.CreatedAt
            );
        }

        await _auditService.LogAsync("Transaction", "CREATE", null, new
        {
            transaction.Id,
            transaction.TransactionId,
            transaction.Amount,
            transaction.Status,
            transaction.TransferTo,
            MemberId = dto.MemberId
        });

        return (await GetTransactionByIdAsync(transaction.Id))!;
    }

    public async Task<TransactionResponseDto?> UpdateTransactionAsync(Guid id, UpdateTransactionDto dto, Guid userId, bool isAdmin = false)
    {
        var transaction = await _context.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (transaction == null) return null;

        if (transaction.ApprovalStatus != TransactionApprovalStatus.Pending)
        {
            throw new InvalidOperationException("Cannot update a transaction that has already been processed");
        }

        var isOwner = transaction.CreatedById == userId;
        if (!isOwner && !isAdmin)
        {
            throw new UnauthorizedException("You can only edit your own pending transactions");
        }

        var oldValues = new
        {
            transaction.TransferTo,
            transaction.Amount,
            transaction.Status,
            transaction.Remarks,
            transaction.AccountId,
            transaction.ReceiptType,
            transaction.TransferFrom,
            transaction.TransactionDate,
            transaction.TransactionId
        };

        var tx = await _context.Transactions.FindAsync(id);

        if (!string.IsNullOrWhiteSpace(dto.TransferTo)) tx!.TransferTo = dto.TransferTo;
        if (dto.Amount.HasValue) tx!.Amount = dto.Amount.Value;
        if (!string.IsNullOrWhiteSpace(dto.Status) && Enum.TryParse<TransactionStatus>(dto.Status, true, out var status))
        {
            tx!.Status = status;
        }
        if (dto.Remarks != null) tx!.Remarks = dto.Remarks;
        if (dto.AccountId.HasValue) tx!.AccountId = dto.AccountId.Value;
        if (!string.IsNullOrWhiteSpace(dto.ReceiptType)) tx!.ReceiptType = dto.ReceiptType;
        if (!string.IsNullOrWhiteSpace(dto.TransferFrom)) tx!.TransferFrom = dto.TransferFrom;
        if (!string.IsNullOrWhiteSpace(dto.TransactionDate) && DateTime.TryParse(dto.TransactionDate, out var parsedDate))
        {
            tx!.TransactionDate = parsedDate;
        }
        if (!string.IsNullOrWhiteSpace(dto.ReferenceNumber))
        {
            tx!.TransactionId = dto.ReferenceNumber;
        }

        tx!.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("Transaction", "UPDATE", oldValues, new
        {
            tx.Id,
            tx.TransactionId,
            tx.Amount,
            tx.Status,
            tx.TransferTo
        });

        return await GetTransactionByIdAsync(id);
    }

    public async Task<TransactionResponseDto?> ApproveTransactionAsync(Guid id, ApproveTransactionDto dto, Guid approvedByUserId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Account)
            .Include(t => t.CreatedBy)
            .Include(t => t.MemberTransactionMaps)
                .ThenInclude(m => m.Member)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transaction == null) return null;

        if (transaction.ApprovalStatus != TransactionApprovalStatus.Pending)
        {
            throw new InvalidOperationException("Transaction has already been processed");
        }

        var approver = await _context.Users.FindAsync(approvedByUserId);
        if (approver == null)
        {
            throw new UnauthorizedException("Approver user not found");
        }

        if (approver.Role != Models.UserRole.Admin)
        {
            throw new UnauthorizedException("Only admin users can approve transactions");
        }

        if (transaction.CreatedById == approvedByUserId)
        {
            throw new InvalidOperationException("You cannot approve your own transaction. Please ask another admin to approve.");
        }

        var oldApprovalStatus = transaction.ApprovalStatus;

        transaction.ApprovalStatus = dto.IsApproved ? TransactionApprovalStatus.Approved : TransactionApprovalStatus.Rejected;
        transaction.ApprovedBy = approvedByUserId;
        transaction.ApprovedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Remarks))
        {
            transaction.Remarks = string.IsNullOrWhiteSpace(transaction.Remarks)
                ? dto.Remarks
                : $"{transaction.Remarks}\n{dto.Remarks}";
        }

        if (!dto.IsApproved && !string.IsNullOrWhiteSpace(dto.Remarks))
        {
            transaction.RejectionReason = dto.Remarks;
        }

        if (dto.IsApproved && transaction.Account != null)
        {
            if (transaction.Status == TransactionStatus.Fund)
            {
                transaction.Account.Balance += transaction.Amount;
            }
            else
            {
                transaction.Account.Balance -= transaction.Amount;
            }
            transaction.Account.UpdatedAt = DateTime.UtcNow;
        }

        if (dto.IsApproved)
        {
            // Mirror the account movement into the member's wallet. Fund money is a
            // credit (Deposit); refunded money is a debit (Withdrawal). The unique
            // index on WalletEntry.TransactionId guarantees the same transaction can
            // never be credited twice.
            var member = transaction.MemberTransactionMaps
                .Select(m => m.Member)
                .FirstOrDefault(m => m != null);

            if (member != null)
            {
                var alreadyCredited = await _context.WalletEntries
                    .AnyAsync(w => w.TransactionId == transaction.Id);

                if (!alreadyCredited)
                {
                    var operatorName = approver.Name ?? approver.Email ?? "system";
                    if (transaction.Status == TransactionStatus.Fund)
                    {
                        _walletService.AddEntry(
                            member.Id, WalletEntryType.Deposit, transaction.Amount,
                            $"Fund credited - {transaction.TransactionId}",
                            operatorName, transactionId: transaction.Id);
                    }
                    else
                    {
                        _walletService.AddEntry(
                            member.Id, WalletEntryType.Withdrawal, -transaction.Amount,
                            $"Fund refunded - {transaction.TransactionId}",
                            operatorName, transactionId: transaction.Id);
                    }
                }
            }
        }

        transaction.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("Transaction", dto.IsApproved ? "APPROVE" : "REJECT", new
        {
            ApprovalStatus = oldApprovalStatus.ToString()
        }, new
        {
            transaction.Id,
            transaction.TransactionId,
            NewApprovalStatus = transaction.ApprovalStatus.ToString(),
            ApprovedBy = approvedByUserId
        });

        if (transaction.CreatedBy != null && !string.IsNullOrEmpty(transaction.CreatedBy.Email))
        {
            var statusText = dto.IsApproved ? "Approved" : "Rejected";
            await _emailService.SendTransactionApprovedEmailAsync(
                transaction.CreatedBy.Email,
                transaction.CreatedBy.Name,
                transaction.TransferFrom ?? "Unknown",
                transaction.Amount,
                transaction.Account?.Name ?? "N/A",
                statusText
            );
        }

        return await GetTransactionByIdAsync(id);
    }

    public async Task<bool> DeleteTransactionAsync(Guid id)
    {
        var transaction = await _context.Transactions.FindAsync(id);
        if (transaction == null) return false;

        if (transaction.ApprovalStatus == TransactionApprovalStatus.Approved)
        {
            throw new InvalidOperationException("Cannot delete an approved transaction");
        }

        var deletedId = transaction.TransactionId;
        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("Transaction", "DELETE", new
        {
            transaction.Id,
            TransactionId = deletedId
        }, null);

        return true;
    }

    public async Task<string> GenerateTransactionIdAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"TXN-{year}-";

        var lastTransaction = await _context.Transactions
            .Where(t => t.TransactionId.StartsWith(prefix))
            .OrderByDescending(t => t.TransactionId)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastTransaction != null)
        {
            var lastNumberStr = lastTransaction.TransactionId.Replace(prefix, "");
            if (int.TryParse(lastNumberStr, out var lastNumber))
            {
                nextNumber = lastNumber + 1;
            }
            else
            {
                return $"{prefix}{nextNumber:D6}";
            }
        }

        if (nextNumber < 1)
        {
            nextNumber = 1;
        }

        return $"{prefix}{nextNumber:D6}";
    }

    public async Task<bool> UpdateReceiptUrlAsync(Guid transactionId, string receiptUrl)
    {
        var transaction = await _context.Transactions.FindAsync(transactionId);
        if (transaction == null) return false;

        transaction.ReceiptUrl = receiptUrl;
        transaction.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private TransactionResponseDto MapToDto(Transaction t)
    {
        var memberMap = t.MemberTransactionMaps?.FirstOrDefault();
        
        return new TransactionResponseDto
        {
            Id = t.Id,
            TransactionId = t.TransactionId,
            TransferFrom = t.TransferFrom,
            TransferTo = t.TransferTo,
            Amount = t.Amount,
            Status = t.Status.ToString(),
            ApprovalStatus = t.ApprovalStatus.ToString(),
            Remarks = t.Remarks,
            ApprovedBy = t.ApprovedBy,
            ApprovedByName = t.ApprovedByUser?.Name,
            ApprovedAt = t.ApprovedAt,
            TransferById = t.TransferById,
            TransferByName = t.TransferBy?.Name ?? "Unknown",
            CreatedById = t.CreatedById,
            CreatedByName = t.CreatedBy?.Name ?? "Unknown",
            AccountId = t.AccountId,
            AccountName = t.Account?.Name ?? "Unknown",
            MemberId = memberMap?.MemberId,
            MemberName = memberMap?.Member?.Name,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            ReceiptUrl = t.ReceiptUrl,
            ReceiptType = t.ReceiptType,
            TransactionDate = t.TransactionDate,
            RejectionReason = t.RejectionReason
        };
    }
}
