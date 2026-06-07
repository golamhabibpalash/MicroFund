import { Component, OnInit, ChangeDetectorRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { filter } from 'rxjs/operators';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TransactionService, Account, Transaction, CreateTransactionRequest, ReceiptType, OcrScanResult, TransactionFilter } from '../core/services/transaction';
import { ToastService } from '../core/services/toast.service';
import { UserService } from '../core/services/user';
import { ParamBusConfigService, ParamBusConfig } from '../core/services/param-bus-config.service';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';

interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, BdtCurrencyPipe],
  template: `
    <div class="payments-wrapper">
      <!-- Header -->
      <header class="top-header">
        <h1>Transactions</h1>
        <div class="header-actions">
          <div class="export-dropdown">
            <button class="btn-export" (click)="$event.stopPropagation(); toggleExportMenu()">
              <span class="material-icons">file_download</span>
              Export
              <span class="material-icons dropdown-arrow">arrow_drop_down</span>
            </button>
            <div class="export-menu" *ngIf="showExportMenu" (click)="$event.stopPropagation()">
              <button class="export-option" (click)="exportToExcel()">
                <span class="material-icons">table_chart</span>
                Export as Excel
              </button>
              <button class="export-option" (click)="exportToCsv()">
                <span class="material-icons">description</span>
                Export as CSV
              </button>
              <button class="export-option" (click)="exportToPdf()">
                <span class="material-icons">picture_as_pdf</span>
                Export as PDF
              </button>
            </div>
          </div>
          <button class="btn-primary" (click)="openTransactionModal()">
            <span class="material-icons">add</span>
            New Transaction
          </button>
        </div>
      </header>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-funded">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalFunded | bdtCurrency }}</span>
            <span class="stat-label">Total Funded</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-refunded">
            <span class="material-icons">money_off</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalRefunded | bdtCurrency }}</span>
            <span class="stat-label">Total Refunded</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-pending">
            <span class="material-icons">pending_actions</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">Pending</span>
          </div>
        </div>
      </div>

      <!-- Transactions List -->
      <div class="content-section">
        <div class="section-header">
          <h2>All Transactions</h2>
        </div>
        <div class="filter-bar">
          <div class="filter-row filter-row-top">
            <div class="search-box">
              <span class="material-icons">search</span>
              <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange()" placeholder="Search transactions..." />
            </div>
            <div class="date-filter">
              <span class="material-icons">date_range</span>
              <input type="date" [(ngModel)]="filterFromDate" (ngModelChange)="applyFilters()" placeholder="From" />
              <span class="date-divider">—</span>
              <input type="date" [(ngModel)]="filterToDate" (ngModelChange)="applyFilters()" placeholder="To" />
            </div>
            <button class="btn-clear" *ngIf="hasActiveFilters()" (click)="clearFilters()">
              <span class="material-icons">close</span>
              Clear
            </button>
          </div>
          <div class="filter-row filter-row-bottom">
            <div class="filter-group">
              <select *ngIf="isAdmin" [(ngModel)]="filterMemberId" (ngModelChange)="applyFilters()">
                <option value="">All Members</option>
                <option *ngFor="let member of members" [value]="member.id">
                  {{ member.name }}
                </option>
              </select>
              <select [(ngModel)]="filterAccountId" (ngModelChange)="applyFilters()">
                <option value="">All Accounts</option>
                <option *ngFor="let account of accounts" [value]="account.id">
                  {{ account.name }}
                </option>
              </select>
              <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()">
                <option value="">All Types</option>
                <option value="Fund">Fund</option>
                <option value="Refund">Refund</option>
              </select>
              <select [(ngModel)]="filterApprovalStatus" (ngModelChange)="applyFilters()">
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="sortable" (click)="sort('transactionId')">
                  Transaction
                  <span class="sort-icon material-icons" *ngIf="sortColumn === 'transactionId'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th class="sortable" (click)="sort('memberName')">
                  Member
                  <span class="sort-icon material-icons" *ngIf="sortColumn === 'memberName'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th>From / To</th>
                <th class="sortable" (click)="sort('amount')">
                  Amount
                  <span class="sort-icon material-icons" *ngIf="sortColumn === 'amount'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th>Account</th>
                <th class="sortable" (click)="sort('approvalStatus')">
                  Status
                  <span class="sort-icon material-icons" *ngIf="sortColumn === 'approvalStatus'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th class="sortable" (click)="sort('createdAt')">
                  Date
                  <span class="sort-icon material-icons" *ngIf="sortColumn === 'createdAt'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th class="actions-col">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of paginatedTransactions">
                <td class="cell-id">{{ tx.transactionId }}</td>
                <td class="cell-member">{{ tx.memberName || tx.createdByName || '-' }}</td>
                <td class="cell-transfer">
                  <span class="transfer-label">From:</span> {{ tx.transferFrom || '-' }}<br>
                  <span class="transfer-label">To:</span> {{ tx.transferTo }}
                </td>
                <td class="cell-amount">{{ tx.amount | bdtCurrency }}</td>
                <td class="cell-account">{{ tx.accountName }}</td>
                <td>
                  <span class="badge" [class.badge-pending]="tx.approvalStatus === 'Pending'"
                        [class.badge-success]="tx.approvalStatus === 'Approved'"
                        [class.badge-danger]="tx.approvalStatus === 'Rejected'">
                    {{ tx.approvalStatus }}
                  </span>
                </td>
                <td class="cell-date">{{ tx.createdAt | date:'MMM d, yyyy' }}</td>
                <td class="cell-actions">
                  <button *ngIf="tx.approvalStatus === 'Pending'" 
                          class="btn-icon btn-icon-approve" 
                          (click)="openApproveModal(tx)"
                          title="Approve / Reject">
                    <span class="material-icons">gavel</span>
                  </button>
                  <button *ngIf="tx.approvalStatus !== 'Pending'"
                          class="btn-icon btn-icon-view"
                          (click)="viewTransaction(tx)"
                          title="View Details">
                    <span class="material-icons">visibility</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="paginatedTransactions.length === 0">
                <td colspan="8" class="empty-row">No transactions found</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="pagination" *ngIf="filteredTransactions.length > 0">
          <div class="page-info">
            Showing {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredTransactions.length) }} of {{ filteredTransactions.length }}
          </div>
          <div class="pagination-right">
            <div class="page-size-select">
              <label>Rows:</label>
              <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
            </div>
            <div class="page-buttons">
              <button class="btn-page" (click)="goToPage(1)" [disabled]="currentPage === 1" title="First">
                <span class="material-icons">first_page</span>
              </button>
              <button class="btn-page" (click)="previousPage()" [disabled]="currentPage === 1" title="Previous">
                <span class="material-icons">chevron_left</span>
              </button>
              <button *ngFor="let page of visiblePages" 
                      class="btn-page" 
                      [class.active]="page === currentPage"
                      (click)="goToPage(page)"
                      [disabled]="page === -1">
                {{ page === -1 ? '...' : page }}
              </button>
              <button class="btn-page" (click)="nextPage()" [disabled]="currentPage === totalPages" title="Next">
                <span class="material-icons">chevron_right</span>
              </button>
              <button class="btn-page" (click)="goToPage(totalPages)" [disabled]="currentPage === totalPages" title="Last">
                <span class="material-icons">last_page</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaction Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal-content modal-large" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Create New Transaction</h3>
          <button class="close-btn" (click)="closeModal()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body-content">
          <!-- OCR Upload Section -->
          <div class="ocr-section">
            <div class="ocr-header">
              <span class="material-icons ocr-icon">document_scanner</span>
              <div class="ocr-info">
                <h4>Scan Receipt with OCR</h4>
                <p>Upload a transaction receipt to auto-fill fields</p>
              </div>
            </div>
            
            <div class="receipt-type-selector">
              <label>Select Receipt Type:</label>
              <div class="receipt-type-chips">
                <button *ngFor="let type of receiptTypes" 
                        type="button"
                        class="type-chip"
                        [class.selected]="selectedReceiptType === type.id"
                        (click)="selectReceiptType(type.id)">
                  <span class="material-icons">{{ type.icon }}</span>
                  {{ type.name }}
                </button>
              </div>
            </div>

            <div class="ocr-upload" [class.has-preview]="ocrPreviewUrl">
              <input type="file" id="receipt-upload" accept="image/*" (change)="onReceiptSelected($event)" hidden #fileInput>
              <div class="upload-area" *ngIf="!ocrPreviewUrl" (click)="fileInput.click()">
                <span class="material-icons">cloud_upload</span>
                <p>Click to upload receipt image</p>
                <span class="file-types">Supports: JPG, PNG, JPEG</span>
              </div>
              <div class="preview-area" *ngIf="ocrPreviewUrl">
                <img [src]="ocrPreviewUrl" alt="Receipt preview" class="receipt-preview">
                <div class="preview-actions">
                  <button type="button" class="btn-rescan" (click)="fileInput.click()">
                    <span class="material-icons">refresh</span>
                    Change Image
                  </button>
                  <button type="button" class="btn-scan" (click)="processOcr()" [disabled]="isOcrProcessing || !selectedReceiptType">
                    <span class="material-icons" *ngIf="!isOcrProcessing">qr_code_scanner</span>
                    <span class="material-icons spinning" *ngIf="isOcrProcessing">sync</span>
                    {{ isOcrProcessing ? 'Scanning ' + ocrProgress + '%' : 'Scan Receipt' }}
                  </button>
                </div>
              </div>
            </div>
            <div class="ocr-hint" *ngIf="!ocrPreviewUrl">
              <span class="material-icons">lightbulb</span>
              <span>Tip: Select receipt type first, then upload and scan for best results</span>
            </div>
          </div>

          <!-- Form Section -->
          <form (ngSubmit)="createTransaction()" class="transaction-form">
            <div class="form-row">
              <div class="form-group">
                <label for="transactionId">Transaction ID</label>
                <input type="text" id="transactionId" [(ngModel)]="transactionId" name="transactionId" 
                       [placeholder]="selectedReceiptType === 'DBBL' || selectedReceiptType === 'UCB' || selectedReceiptType === 'EBL' || selectedReceiptType === 'PBL' ? 'From receipt' : 'Auto-generated'" />
                <small class="hint" *ngIf="selectedReceiptType === 'DBBL'">DBBL Transaction ID from receipt</small>
                <small class="hint" *ngIf="selectedReceiptType === 'UCB'">UCB Transaction ID from receipt</small>
                <small class="hint" *ngIf="selectedReceiptType === 'EBL'">EBL Transaction ID from receipt</small>
                <small class="hint" *ngIf="selectedReceiptType === 'PBL'">PBL Transaction ID from receipt</small>
              </div>
              <div class="form-group">
                <label for="transactionDate">Transaction Date</label>
                <input type="date" id="transactionDate" [(ngModel)]="transactionDate" name="transactionDate"
                       class="form-control" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="receiptTypeField">Receipt Type</label>
                <select id="receiptTypeField" [(ngModel)]="newTransaction.receiptType" name="receiptType">
                  <option value="">Select Receipt Type</option>
                  <option *ngFor="let type of receiptTypes" [value]="type.id">
                    {{ type.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="amount">Amount (BDT) *</label>
                <div class="amount-input">
                  <span class="currency-symbol">৳</span>
                  <input type="number" id="amount" [(ngModel)]="newTransaction.amount" name="amount" 
                         placeholder="0.00" step="0.01" min="0.01" required />
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="memberId">Member *</label>
                <select *ngIf="isAdmin" id="memberId" [(ngModel)]="newTransaction.memberId" name="memberId" required>
                  <option value="">Select Member</option>
                  <option *ngFor="let member of members" [value]="member.id">
                    {{ member.name }} ({{ member.phone }})
                  </option>
                </select>
                <div *ngIf="!isAdmin" class="readonly-input" [style.color]="memberLoadFailed ? '#e74c3c' : '#333'" style="padding: 0.75rem; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 0.5rem;">
                  {{ memberLoadFailed ? 'No member record — contact administrator' : (loggedInMemberName || 'Loading...') }}
                </div>
                <input type="hidden" [ngModel]="newTransaction.memberId" name="memberIdNonAdmin" *ngIf="!isAdmin" />
              </div>
              <div class="form-group">
                <label for="transferFromInput">Transfer From</label>
                <input type="text" id="transferFromInput" [(ngModel)]="newTransaction.transferFrom" name="transferFromInput" 
                       placeholder="e.g., Sender name, Account, Phone" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" *ngIf="selectedReceiptType === 'DBBL' || selectedReceiptType === 'UCB' || selectedReceiptType === 'EBL' || selectedReceiptType === 'PBL'">
                <label for="accountId">Account *</label>
                <select id="accountId" [(ngModel)]="newTransaction.accountId" name="accountId" required>
                  <option value="">Select Account</option>
                  <option *ngFor="let account of accounts" [value]="account.id">
                    {{ account.name }} ({{ account.accountType }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="transferTo">Transfer To *</label>
                <input type="text" id="transferTo" [(ngModel)]="newTransaction.transferTo" name="transferTo" 
                       placeholder="e.g., Monthly Investment, bKash Payment, Business Fund" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group full-width">
                <label for="remarks">Remarks</label>
                <textarea id="remarks" [(ngModel)]="newTransaction.remarks" name="remarks" 
                          placeholder="Optional notes about this transaction..." rows="3"></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="isSubmitting">
                {{ isSubmitting ? 'Creating...' : 'Create Transaction' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Approve/Reject Modal -->
    <div class="modal-overlay" *ngIf="showApproveModal" (click)="closeApproveModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Approve Transaction</h3>
          <button class="close-btn" (click)="closeApproveModal()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="transaction-details" *ngIf="selectedTransaction">
            <div class="detail-row">
              <span class="label">Transfer From:</span>
              <span class="value">{{ selectedTransaction.transferFrom }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Transfer To:</span>
              <span class="value">{{ selectedTransaction.transferTo }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount:</span>
              <span class="value amount">{{ selectedTransaction.amount | bdtCurrency }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value">
                <span class="tx-type" [class.fund]="selectedTransaction.status === 'Fund'" [class.refund]="selectedTransaction.status === 'Refund'">
                  {{ selectedTransaction.status }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Created By:</span>
              <span class="value">{{ selectedTransaction.createdByName }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Created At:</span>
              <span class="value">{{ selectedTransaction.createdAt | date:'medium' }}</span>
            </div>
          </div>
          <div class="form-group">
            <label for="approvalRemarks">Remarks (Optional)</label>
            <textarea id="approvalRemarks" [(ngModel)]="approvalRemarks" name="approvalRemarks" 
                      placeholder="Add remarks for this decision..." rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-reject" (click)="rejectTransaction()">
            <span class="material-icons">cancel</span>
            Reject
          </button>
          <button type="button" class="btn-approve-action" (click)="approveTransaction()">
            <span class="material-icons">check_circle</span>
            Approve
          </button>
        </div>
      </div>
    </div>

    <!-- View Transaction Modal -->
    <div class="modal-overlay" *ngIf="showViewModal" (click)="closeViewModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Transaction Details</h3>
          <button class="close-btn" (click)="closeViewModal()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body" *ngIf="selectedTransaction">
          <div class="transaction-details">
            <div class="detail-row">
              <span class="label">Transfer From:</span>
              <span class="value">{{ selectedTransaction.transferFrom }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Transfer To:</span>
              <span class="value">{{ selectedTransaction.transferTo }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount:</span>
              <span class="value amount">{{ selectedTransaction.amount | bdtCurrency }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Type:</span>
              <span class="value">
                <span class="tx-type" [class.fund]="selectedTransaction.status === 'Fund'" [class.refund]="selectedTransaction.status === 'Refund'">
                  {{ selectedTransaction.status }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value">
                <span class="status" [class.pending]="selectedTransaction.approvalStatus === 'Pending'"
                      [class.approved]="selectedTransaction.approvalStatus === 'Approved'"
                      [class.rejected]="selectedTransaction.approvalStatus === 'Rejected'">
                  {{ selectedTransaction.approvalStatus }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Receipt Type:</span>
              <span class="value">{{ selectedTransaction.receiptType || 'N/A' }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTransaction.transactionDate">
              <span class="label">Transaction Date:</span>
              <span class="value">{{ selectedTransaction.transactionDate | date:'mediumDate' }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTransaction.receiptUrl">
              <span class="label">Receipt:</span>
              <span class="value">
                <a [href]="selectedTransaction.receiptUrl" target="_blank" class="receipt-link">
                  <span class="material-icons">receipt</span>
                  View Receipt
                </a>
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Account:</span>
              <span class="value">{{ selectedTransaction.accountName }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Created By:</span>
              <span class="value">{{ selectedTransaction.createdByName }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Created At:</span>
              <span class="value">{{ selectedTransaction.createdAt | date:'medium' }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTransaction.approvedByName">
              <span class="label">Approved By:</span>
              <span class="value">{{ selectedTransaction.approvedByName }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTransaction.approvedAt">
              <span class="label">Approved At:</span>
              <span class="value">{{ selectedTransaction.approvedAt | date:'medium' }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTransaction.remarks">
              <span class="label">Remarks:</span>
              <span class="value">{{ selectedTransaction.remarks }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payments-wrapper {
      width: 100%;
      box-sizing: border-box;
    }

    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
    }

    .top-header h1 {
      font-size: var(--text-2xl);
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .export-dropdown {
      position: relative;
    }

    .btn-export {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--color-surface);
      color: var(--text-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-export:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .btn-export .material-icons {
      font-size: 18px;
    }

    .btn-export:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .export-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-dropdown);
      z-index: var(--z-dropdown);
      min-width: 200px;
      overflow: hidden;
    }

    .export-option {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 16px;
      background: none;
      border: none;
      font-size: var(--text-base);
      color: var(--text-primary);
      cursor: pointer;
      text-align: left;
      transition: background 0.2s;
    }

    .export-option:hover {
      background: var(--color-background-alt);
    }

    .export-option .material-icons {
      font-size: 20px;
      color: var(--color-accent);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-light);
      transition: all var(--transition-base);
    }

    .stat-card:hover {
      border-color: var(--color-border);
      box-shadow: var(--shadow-card-hover);
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .stat-icon .material-icons {
      font-size: 22px;
    }

    .stat-icon-funded {
      background: var(--color-success);
    }

    .stat-icon-refunded {
      background: var(--color-error);
    }

    .stat-icon-pending {
      background: #d97706;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: var(--text-xl);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .stat-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    .content-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
      border: 1px solid var(--color-border-light);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);
    }

    .section-header h2 {
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
      background: var(--color-background-alt);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: var(--space-3);
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .filter-row-top {
      flex: 1;
    }

    .filter-row-bottom {
      flex: 1;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0 var(--space-3);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      min-height: 36px;
      flex: 1 1 260px;
      max-width: 360px;
      transition: all var(--transition-fast);
    }

    .search-box:focus-within {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
    }

    .search-box .material-icons {
      font-size: 18px;
      color: var(--text-light);
      flex-shrink: 0;
    }

    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      font-size: var(--text-sm);
      color: var(--text-primary);
      width: 100%;
      min-width: 120px;
    }

    .search-box input::placeholder {
      color: var(--text-light);
    }

    .filter-group {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      flex-wrap: wrap;
    }

    .filter-group select {
      padding: 0 26px 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      background: var(--color-surface);
      cursor: pointer;
      outline: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 7px center;
      transition: all var(--transition-fast);
      min-height: 36px;
      min-width: 120px;
      max-width: 160px;
    }

    .filter-group select:hover {
      border-color: var(--color-accent);
    }

    .filter-group select:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
    }

    .date-filter {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0 var(--space-3);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      min-height: 36px;
      transition: all var(--transition-fast);
    }

    .date-filter:focus-within {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
    }

    .date-filter .material-icons {
      font-size: 18px;
      color: var(--text-light);
      flex-shrink: 0;
    }

    .date-filter input[type="date"] {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      border: none;
      background: transparent;
      outline: none;
      min-height: 34px;
      width: 110px;
      cursor: pointer;
    }

    .date-filter input[type="date"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.4;
    }

    .date-filter input[type="date"]::-webkit-calendar-picker-indicator:hover {
      opacity: 0.8;
    }

    .date-divider {
      color: var(--text-light);
      font-size: var(--text-sm);
    }

    .btn-clear {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 var(--space-3);
      background: transparent;
      color: var(--color-error);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      min-height: 36px;
      white-space: nowrap;
    }

    .btn-clear:hover {
      background: var(--color-error-bg);
      border-color: var(--color-error);
    }

    .btn-clear .material-icons {
      font-size: 15px;
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: var(--space-4);
      margin-top: var(--space-1);
      border-top: 1px solid var(--color-divider);
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .page-info {
      font-size: var(--text-sm);
      color: var(--text-muted);
    }

    .pagination-right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .page-size-select {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .page-size-select label {
      font-size: var(--text-sm);
      color: var(--text-muted);
      white-space: nowrap;
    }

    .page-size-select select {
      padding: 4px 26px 4px 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      background: var(--color-surface);
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      cursor: pointer;
    }

    .page-buttons {
      display: flex;
      gap: 2px;
    }

    .btn-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-page:hover:not(:disabled) {
      background: var(--color-background-alt);
      border-color: var(--color-border);
    }

    .btn-page.active {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: white;
      font-weight: 600;
    }

    .btn-page:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .btn-page .material-icons {
      font-size: 18px;
    }

    .empty-row {
      text-align: center;
      color: var(--text-muted);
      padding: var(--space-12) var(--space-6) !important;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: var(--text-xs);
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-pending {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }
    .badge-success {
      background: var(--color-success-bg);
      color: var(--color-success);
    }
    .badge-danger {
      background: var(--color-error-bg);
      color: var(--color-error);
    }

    /* Table cell helpers */
    .cell-id {
      font-family: 'Inter', monospace;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--text-primary);
    }
    .cell-member {
      font-weight: 500;
    }
    .cell-transfer {
      font-size: var(--text-sm);
      line-height: 1.5;
    }
    .cell-transfer .transfer-label {
      color: var(--text-light);
      font-size: var(--text-xs);
    }
    .cell-amount {
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
    }
    .cell-account {
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }
    .cell-date {
      color: var(--text-muted);
      font-size: var(--text-sm);
      white-space: nowrap;
    }
    .cell-actions {
      white-space: nowrap;
    }

    /* Icon buttons */
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      background: transparent;
    }
    .btn-icon .material-icons {
      font-size: 18px;
    }
    .btn-icon-approve {
      color: var(--color-accent);
    }
    .btn-icon-approve:hover {
      background: var(--color-accent-subtle);
    }
    .btn-icon-view {
      color: var(--text-muted);
    }
    .btn-icon-view:hover {
      background: var(--color-background-alt);
      color: var(--color-accent);
    }

    /* Sort icon */
    .sort-icon {
      font-size: 14px !important;
      vertical-align: middle;
      margin-left: 2px;
    }

    /* Create Transaction Modal */
    .modal-body-content {
      padding: var(--space-6);
      max-height: calc(90vh - 80px);
      overflow-y: auto;
    }

    .transaction-form {
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
      }

      .form-group {
        display: flex;
        flex-direction: column;

        &.full-width {
          grid-column: 1 / -1;
        }

        label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: var(--space-1-5);
        }

        input, select, textarea {
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--text-primary);
          background: var(--color-surface);
          transition: border-color var(--transition-fast);
          outline: none;
          width: 100%;
          box-sizing: border-box;

          &:focus {
            border-color: var(--color-accent);
            box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
          }
        }

        textarea {
          resize: vertical;
          font-family: inherit;
        }

        small.hint {
          font-size: var(--text-xs);
          color: var(--text-light);
          margin-top: var(--space-1);
        }
      }

      .amount-input {
        position: relative;

        .currency-symbol {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-weight: 600;
          font-size: var(--text-sm);
        }

        input {
          padding-left: 1.75rem;
        }
      }

      .readonly-input {
        padding: 0.625rem 0.75rem;
        background: var(--color-background-alt);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-6);
        padding-top: var(--space-4);
        border-top: 1px solid var(--color-divider);
      }
    }

    .ocr-section {
      background: var(--color-background-alt);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      margin-bottom: var(--space-6);

      .ocr-header {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        margin-bottom: var(--space-4);

        .ocr-icon {
          font-size: 32px;
          color: var(--color-accent);
        }

        .ocr-info {
          h4 {
            margin: 0 0 2px;
            font-size: var(--text-base);
            font-weight: 600;
            color: var(--text-primary);
          }

          p {
            margin: 0;
            font-size: var(--text-sm);
            color: var(--text-muted);
          }
        }
      }
    }

    .receipt-type-selector {
      margin-bottom: var(--space-4);

      label {
        display: block;
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: var(--space-2);
      }

      .receipt-type-chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .type-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0.5rem 1rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        color: var(--text-secondary);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: all var(--transition-fast);

        .material-icons {
          font-size: 18px;
        }

        &:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        &.selected {
          background: var(--color-accent);
          border-color: var(--color-accent);
          color: white;
        }
      }
    }

    .ocr-upload {
      margin-bottom: var(--space-3);

      .upload-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-8) var(--space-4);
        border: 2px dashed var(--color-border);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--transition-fast);
        background: var(--color-surface);

        .material-icons {
          font-size: 40px;
          color: var(--color-accent);
        }

        p {
          margin: 0;
          font-size: var(--text-base);
          color: var(--text-primary);
          font-weight: 500;
        }

        .file-types {
          font-size: var(--text-xs);
          color: var(--text-light);
        }

        &:hover {
          border-color: var(--color-accent);
          background: rgba(13, 148, 136, 0.03);
        }
      }

      &.has-preview .upload-area {
        display: none;
      }

      .preview-area {
        .receipt-preview {
          width: 100%;
          max-height: 200px;
          object-fit: contain;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          margin-bottom: var(--space-3);
        }

        .preview-actions {
          display: flex;
          gap: var(--space-2);
        }
      }
    }

    .ocr-hint {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--text-light);

      .material-icons {
        font-size: 14px;
        color: var(--color-warning);
      }
    }

    .btn-scan {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.5rem 1rem;
      background: var(--color-accent);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 500;
      cursor: pointer;
      transition: opacity var(--transition-fast);

      .material-icons {
        font-size: 18px;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-rescan {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.5rem 1rem;
      background: var(--color-surface);
      color: var(--text-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);

      .material-icons {
        font-size: 18px;
      }

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 992px) {
      .top-header { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
      .header-actions { width: 100%; }
      .stats-grid { grid-template-columns: 1fr; }
      .filter-row-top { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; flex: auto; }
      .date-filter { width: 100%; }
      .date-filter input[type="date"] { width: 100%; flex: 1; }
      .filter-group select { flex: 1; max-width: none; }
      .pagination { flex-direction: column; align-items: flex-start; }
      .pagination-right { width: 100%; justify-content: space-between; }
    }
    @media (max-width: 768px) {
      .top-header h1 { font-size: var(--text-xl); }
      .filter-row-bottom .filter-group { flex-wrap: wrap; }
      .filter-group select { flex: 1 1 auto; min-width: calc(50% - var(--space-2)); }
      .modal-content { margin: var(--space-3); max-width: calc(100% - 24px); }
      .pagination-right { flex-direction: column; align-items: flex-start; gap: var(--space-2); }
    }
    @media (max-width: 576px) {
      .stat-card { padding: var(--space-3) var(--space-4); }
      .stat-value { font-size: var(--text-lg); }
      .filter-group select { min-width: 100%; max-width: none; }
      .date-filter { flex-wrap: wrap; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class PaymentsComponent implements OnInit {
  Math = Math;
  
  accounts: Account[] = [];
  members: Member[] = [];
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];
  receiptTypes: ReceiptType[] = [];
  
  showModal = false;
  showApproveModal = false;
  showViewModal = false;
  isSubmitting = false;
  isLoading = false;
  isUploading = false;
  selectedTransaction: Transaction | null = null;
  approvalRemarks = '';
  isOcrProcessing = false;
  ocrProgress = 0;
  ocrError = '';
  ocrPreviewUrl: string | null = null;
  selectedReceiptType = '';
  receiptFile: File | null = null;
  transactionDate = '';
  transactionId = '';
  
  newTransaction: CreateTransactionRequest = {
    transferTo: '',
    amount: 0,
    status: 'Fund',
    remarks: '',
    accountId: '',
    receiptType: '',
    transferFrom: '',
    memberId: ''
  };
  
  totalFunded = 0;
  totalRefunded = 0;
  pendingCount = 0;

  searchTerm = '';
  filterMemberId = '';
  filterAccountId = '';
  filterStatus = '';
  filterApprovalStatus = '';
  filterFromDate = '';
  filterToDate = '';
  sortColumn = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  private searchSubject = new Subject<void>();
  isAdmin = false;
  loggedInMemberId = '';
  loggedInMemberName = '';
  memberLoadFailed = false;
  primaryFundingAccountId = '';

  showExportMenu = false;
  isExporting = false;

  @HostListener('document:click')
  onDocumentClick() {
    this.showExportMenu = false;
  }

  constructor(
    private http: HttpClient,
    private transactionService: TransactionService,
    private toastService: ToastService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.setupSearchDebounce();
    this.initializeUser();
    this.loadData();
    this.loadReceiptTypes();
    this.loadPrimaryFundingAccount();
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (event.url.includes('/payments')) {
        this.loadData();
      }
    });
  }

  private initializeUser() {
    this.isAdmin = this.userService.isAdmin();
    
    if (!this.isAdmin) {
      this.loadCurrentUserMember();
    }
  }

  private loadCurrentUserMember() {
    this.http.get<{ id: string; name: string; email?: string }>('/api/members/me').subscribe({
      next: (member) => {
        this.loggedInMemberId = member.id;
        this.loggedInMemberName = member.name;
        this.memberLoadFailed = false;
        this.newTransaction.memberId = member.id;
        this.cdr.detectChanges();
      },
      error: () => {
        this.memberLoadFailed = true;
        this.loggedInMemberName = this.userService.getUserName() || '';
        this.cdr.detectChanges();
      }
    });
  }

  private setupSearchDebounce() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.applyFiltersAndSort();
    });
  }

  loadReceiptTypes() {
    this.transactionService.getReceiptTypes().subscribe({
      next: (types) => {
        this.receiptTypes = types;
        this.cdr.detectChanges();
      },
      error: () => {
        this.receiptTypes = [
          { id: 'DBBL', name: 'DBBL (Dutch-Bangla Bank)', icon: 'account_balance' },
          { id: 'UCB', name: 'UCB (United Credit Bank)', icon: 'account_balance' },
          { id: 'EBL', name: 'EBL (Eastern Bank)', icon: 'account_balance' },
          { id: 'PBL', name: 'PBL (Pubaly Bank Limited)', icon: 'account_balance' },
          { id: 'bKash', name: 'bKash', icon: 'phone_android' },
          { id: 'Rocket', name: 'Rocket', icon: 'phone_android' },
          { id: 'Nagad', name: 'Nagad', icon: 'phone_android' },
          { id: 'Cash', name: 'Cash', icon: 'payments' },
          { id: 'Other', name: 'Other', icon: 'more_horiz' }
        ];
        this.cdr.detectChanges();
      }
    });
  }

  loadData() {
    this.isLoading = true;
    this.loadAccounts();
    this.loadMembers();
    this.loadTransactions();
  }

  loadMembers() {
    this.http.get<Member[]>('/api/members?isActive=true').subscribe({
      next: (members) => {
        this.members = members;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  loadAccounts() {
    this.transactionService.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts.filter(a => a.isActive);
        if (!this.isAdmin && this.primaryFundingAccountId) {
          this.newTransaction.accountId = this.primaryFundingAccountId;
        }
        this.isLoading = false;
        this.applyFiltersAndSort();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.applyFiltersAndSort();
        this.cdr.detectChanges();
      }
    });
  }

  loadPrimaryFundingAccount() {
    this.http.get<ParamBusConfig>('/api/paramBusConfig/name/PrimaryFundingAccount').subscribe({
      next: (config) => {
        if (config && config.value) {
          this.primaryFundingAccountId = config.value;
        }
      },
      error: () => {
        // Silently fail - primary funding account is optional
      }
    });
  }

  loadTransactions() {
    this.transactionService.getTransactions().subscribe({
      next: (transactions) => {
        this.transactions = transactions;
        this.applyFiltersAndSort();
        this.calculateStats();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats() {
    this.totalFunded = this.filteredTransactions
      .filter(t => t.status === 'Fund' && t.approvalStatus === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);
    
    this.totalRefunded = this.filteredTransactions
      .filter(t => t.status === 'Refund' && t.approvalStatus === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);
    
    this.pendingCount = this.filteredTransactions.filter(t => t.approvalStatus === 'Pending').length;
  }

  onSearchChange() {
    this.currentPage = 1;
    this.searchSubject.next();
  }

  applyFilters() {
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  hasActiveFilters(): boolean {
    if (!this.isAdmin) return !!this.searchTerm || !!this.filterAccountId || !!this.filterStatus || !!this.filterApprovalStatus || !!this.filterFromDate || !!this.filterToDate;
    return !!(this.searchTerm || this.filterMemberId || this.filterAccountId || this.filterStatus || this.filterApprovalStatus || !!this.filterFromDate || !!this.filterToDate);
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterAccountId = '';
    this.filterStatus = '';
    this.filterApprovalStatus = '';
    this.filterFromDate = '';
    this.filterToDate = '';
    if (this.isAdmin) {
      this.filterMemberId = '';
    }
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort() {
    let result = [...this.transactions];

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        t.transactionId.toLowerCase().includes(search) ||
        (t.memberName && t.memberName.toLowerCase().includes(search)) ||
        (t.transferFrom && t.transferFrom.toLowerCase().includes(search)) ||
        t.transferTo.toLowerCase().includes(search) ||
        t.accountName.toLowerCase().includes(search) ||
        (t.remarks && t.remarks.toLowerCase().includes(search))
      );
    }

    if (this.filterMemberId && this.isAdmin) {
      result = result.filter(t => t.memberId === this.filterMemberId);
    }

    if (this.filterAccountId) {
      result = result.filter(t => t.accountId === this.filterAccountId);
    }

    if (this.filterStatus) {
      result = result.filter(t => t.status === this.filterStatus);
    }

    if (this.filterApprovalStatus) {
      result = result.filter(t => t.approvalStatus === this.filterApprovalStatus);
    }

    if (this.filterFromDate || this.filterToDate) {
      const fromDate = this.filterFromDate ? new Date(this.filterFromDate) : null;
      const toDate = this.filterToDate ? new Date(this.filterToDate) : null;
      toDate?.setHours(23, 59,59,999);
      result = result.filter(t => {
        const txDate = new Date(t.createdAt);
        if (fromDate && txDate < fromDate) return false;
        if (toDate && txDate > toDate) return false;
        return true;
      });
    }

    result.sort((a, b) => {
      let aVal: any = a[this.sortColumn as keyof Transaction];
      let bVal: any = b[this.sortColumn as keyof Transaction];

      if (this.sortColumn === 'amount') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else if (typeof aVal === 'string') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredTransactions = result;
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    this.updatePaginatedTransactions();
    this.calculateStats();
  }

  updatePaginatedTransactions() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedTransactions = this.filteredTransactions.slice(start, end);
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
    this.updatePaginatedTransactions();
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.currentPage > 2) pages.push(-1);
      
      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (this.currentPage < this.totalPages - 1) pages.push(-1);
      pages.push(this.totalPages);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePaginatedTransactions();
    }
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  openTransactionModal() {
    this.showModal = true;
    this.resetForm();
    if (!this.isAdmin) {
      const accountId = this.primaryFundingAccountId || (this.accounts[0]?.id ?? '');
      this.newTransaction.accountId = accountId;
      if (!this.loggedInMemberId) {
        this.loadCurrentUserMember();
      } else {
        this.newTransaction.memberId = this.loggedInMemberId;
      }
    }
  }

  closeModal() {
    this.showModal = false;
    this.resetForm();
    this.resetOcrState();
  }

  resetOcrState() {
    this.ocrPreviewUrl = null;
    this.isOcrProcessing = false;
    this.ocrProgress = 0;
  }

  selectReceiptType(type: string) {
    this.selectedReceiptType = type;
    this.newTransaction.receiptType = type;
  }

  onReceiptSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.receiptFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.ocrPreviewUrl = e.target?.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.receiptFile);
    }
  }

  async processOcr() {
    if (!this.receiptFile || !this.selectedReceiptType) {
      this.toastService.warning('Please select a receipt type and upload an image first.');
      return;
    }

    this.isOcrProcessing = true;
    this.ocrProgress = 0;
    this.ocrError = '';

    try {
      this.transactionService.scanReceipt(this.receiptFile, this.selectedReceiptType).subscribe({
        next: (result) => {
          this.ocrProgress = 100;
          if (result.success) {
            this.applyOcrResult(result);
            this.toastService.success(`Receipt scanned! Amount: ৳${result.amount.toLocaleString()} extracted.`);
          } else {
            this.toastService.error(result.errorMessage || 'Failed to process receipt.');
          }
          this.isOcrProcessing = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.ocrError = err.message || err.statusText || 'Unknown error';
          this.toastService.error('Failed to process receipt. Please fill the form manually.');
          this.isOcrProcessing = false;
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      this.toastService.error('Failed to process receipt. Please fill the form manually.');
      this.isOcrProcessing = false;
      this.ocrProgress = 0;
      this.cdr.detectChanges();
    }
  }

  applyOcrResult(result: OcrScanResult) {
    
    if (result.amount > 0) {
      this.newTransaction.amount = result.amount;
    }

    // Populate Transaction ID field (unique ID like TXN-2026-000001)
    if (result.transactionId) {
      this.transactionId = result.transactionId;
      this.newTransaction.transactionId = result.transactionId;
    }

    // Populate Transfer From field (sender info)
    if (result.transferFrom) {
      this.newTransaction.transferFrom = result.transferFrom;
    }

    if (result.transactionDate) {
      this.transactionDate = result.transactionDate;
      this.newTransaction.transactionDate = result.transactionDate;
      setTimeout(() => {
        const dateInput = document.getElementById('transactionDate') as HTMLInputElement;
        if (dateInput && this.transactionDate) {
          dateInput.value = this.transactionDate;
        }
      }, 100);
    }

    if (result.transferTo) {
      this.newTransaction.transferTo = result.transferTo;
    }

    if (result.remarks) {
      this.newTransaction.remarks = result.remarks;
    }

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 150);
  }
  createTransaction() {
    const t = this.newTransaction;

    if (!this.isAdmin) {
      if (this.memberLoadFailed) {
        this.toastService.warning('Your account is not linked to a member record. Please contact your administrator.');
        return;
      }
      if (!t.memberId && this.loggedInMemberId) {
        t.memberId = this.loggedInMemberId;
      }
      if (!t.memberId) {
        this.toastService.warning('Still loading your member profile. Please wait a moment and try again.');
        return;
      }
    } else if (!t.memberId) {
      this.toastService.warning('Please select a Member');
      return;
    }

    if (!t.transferTo) { this.toastService.warning('Please enter Transfer To'); return; }
    if (!t.amount || t.amount <= 0) { this.toastService.warning('Please enter a valid Amount greater than 0'); return; }

    const receiptType = this.selectedReceiptType;
    const requiresAccount = receiptType === 'DBBL' || receiptType === 'UCB' || receiptType === 'EBL' || receiptType === 'PBL';
    if (requiresAccount && !t.accountId) { this.toastService.warning('Please select an Account'); return; }

    const transactionData: CreateTransactionRequest = {
      ...this.newTransaction,
      accountId: this.newTransaction.accountId || undefined,
      memberId: this.newTransaction.memberId,
      transactionId: this.transactionId || undefined,
      transactionDate: this.transactionDate || undefined
    };

    this.isSubmitting = true;
    
    this.transactionService.createTransaction(transactionData).subscribe({
      next: (transaction) => {
        if (this.receiptFile) {
          this.uploadReceipt(transaction.id, this.receiptFile);
        } else {
          this.isSubmitting = false;
          this.handleTransactionSuccess();
        }
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const errorMessage = err.error?.message || 'Failed to create transaction. Please try again.';
        this.toastService.error(errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  uploadReceipt(transactionId: string, file: File) {
    this.isUploading = true;
    this.transactionService.uploadReceipt(transactionId, file).subscribe({
      next: () => {
        this.isUploading = false;
        this.isSubmitting = false;
        this.handleTransactionSuccess();
      },
      error: () => {
        this.isUploading = false;
        this.isSubmitting = false;
        this.toastService.warning('Transaction created but failed to upload receipt.');
        this.handleTransactionSuccess();
      }
    });
  }

  handleTransactionSuccess() {
    this.toastService.success('Transaction created successfully! It will be reviewed by an admin.');
    this.showModal = false;
    this.resetForm();
    this.resetOcrState();
    this.cdr.detectChanges();
    this.loadTransactions();
  }

  openApproveModal(transaction: Transaction) {
    this.selectedTransaction = transaction;
    this.approvalRemarks = '';
    this.showApproveModal = true;
  }

  closeApproveModal() {
    this.showApproveModal = false;
    this.selectedTransaction = null;
    this.approvalRemarks = '';
  }

  viewTransaction(transaction: Transaction) {
    this.selectedTransaction = transaction;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedTransaction = null;
  }

  approveTransaction() {
    if (!this.selectedTransaction) return;

    this.isSubmitting = true;
    this.transactionService.approveTransaction(
      this.selectedTransaction.id,
      true,
      this.approvalRemarks || undefined
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('Transaction approved successfully!');
        this.closeApproveModal();
        this.loadTransactions();
      },
      error: (err) => {
        this.isSubmitting = false;
        const errorMsg = err.error?.message || (err.status === 403 ? 'You do not have permission to approve transactions.' : 'Failed to approve transaction.');
        this.toastService.error(errorMsg);
      }
    });
  }

  rejectTransaction() {
    if (!this.selectedTransaction) return;

    this.isSubmitting = true;
    this.transactionService.approveTransaction(
      this.selectedTransaction.id,
      false,
      this.approvalRemarks || undefined
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.info('Transaction rejected.');
        this.closeApproveModal();
        this.loadTransactions();
      },
      error: (err) => {
        this.isSubmitting = false;
        const errorMsg = err.error?.message || (err.status === 403 ? 'You do not have permission to reject transactions.' : 'Failed to reject transaction.');
        this.toastService.error(errorMsg);
      }
    });
  }

  resetForm() {
    this.newTransaction = {
      transferTo: '',
      amount: 0,
      status: 'Fund',
      remarks: '',
      accountId: '',
      receiptType: '',
      transferFrom: '',
      memberId: !this.isAdmin ? (this.loggedInMemberId || '') : ''
    };
    this.transactionDate = '';
    this.transactionId = '';
  }

  toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  private buildFilterParams(): TransactionFilter {
    const params: TransactionFilter = {};
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.filterAccountId) params.accountId = this.filterAccountId;
    if (this.isAdmin && this.filterMemberId) params.memberId = this.filterMemberId;
    if (this.filterStatus) params.status = this.filterStatus;
    if (this.filterApprovalStatus) params.approvalStatus = this.filterApprovalStatus;
    if (this.filterFromDate) params.fromDate = this.filterFromDate;
    if (this.filterToDate) params.toDate = this.filterToDate;
    return params;
  }

  exportToExcel() {
    this.isExporting = true;
    this.showExportMenu = false;
    const filter = this.buildFilterParams();
    this.transactionService.exportTransactions(filter, 'excel').subscribe({
      next: (blob) => {
        saveAs(blob, `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.isExporting = false;
        this.toastService.success('Excel export completed');
      },
      error: () => {
        this.isExporting = false;
        this.toastService.error('Failed to export Excel');
      }
    });
  }

  exportToCsv() {
    this.isExporting = true;
    this.showExportMenu = false;
    const filter = this.buildFilterParams();
    this.transactionService.exportTransactions(filter, 'csv').subscribe({
      next: (blob) => {
        saveAs(blob, `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
        this.isExporting = false;
        this.toastService.success('CSV export completed');
      },
      error: () => {
        this.isExporting = false;
        this.toastService.error('Failed to export CSV');
      }
    });
  }

  exportToPdf() {
    this.showExportMenu = false;
    const data = this.filteredTransactions;

    if (data.length === 0) {
      this.toastService.warning('No transactions to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text('Transactions Report', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 22, { align: 'center' });

    const rows = data.map(tx => [
      tx.transactionId,
      tx.memberName || tx.createdByName || '-',
      tx.transferFrom || '-',
      tx.transferTo,
      `৳${tx.amount.toLocaleString()}`,
      tx.accountName,
      tx.approvalStatus,
      new Date(tx.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [['Transaction ID', 'Member', 'From', 'To', 'Amount', 'Account', 'Status', 'Date']],
      body: rows,
      startY: 28,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [102, 126, 234] }
    });

    doc.save(`transactions_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.toastService.success('PDF export completed');
  }
}
