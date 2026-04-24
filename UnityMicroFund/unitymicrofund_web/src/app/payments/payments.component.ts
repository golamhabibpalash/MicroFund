import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { TransactionService, Account, Transaction, CreateTransactionRequest, ReceiptType } from '../core/services/transaction';
import { ToastService } from '../core/services/toast.service';
import { filter } from 'rxjs/operators';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';
import { createWorker } from 'tesseract.js';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, BdtCurrencyPipe],
  template: `
    <div class="payments-wrapper">
      <!-- Header -->
      <header class="top-header">
        <h1>Transactions</h1>
        <button class="btn-primary" (click)="openTransactionModal()">
          <span class="material-icons">add</span>
          New Transaction
        </button>
      </header>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #27ae60;">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalFunded | bdtCurrency }}</span>
            <span class="stat-label">Total Funded</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #e74c3c;">
            <span class="material-icons">money_off</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalRefunded | bdtCurrency }}</span>
            <span class="stat-label">Total Refunded</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #f39c12;">
            <span class="material-icons">pending</span>
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
        <div class="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Ref No</th>
                <th>Transfer For</th>
                <th>Amount</th>
                <th>Account</th>
                <th>Type</th>
                <th>Approval</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of transactions">
                <td class="ref-no">{{ tx.refNo }}</td>
                <td>{{ tx.transferFor }}</td>
                <td class="amount">{{ tx.amount | bdtCurrency }}</td>
                <td>{{ tx.accountName }}</td>
                <td>
                  <span class="receipt-type" *ngIf="tx.receiptType">{{ tx.receiptType }}</span>
                  <span class="receipt-type empty" *ngIf="!tx.receiptType">-</span>
                </td>
                <td>
                  <span class="status" [class.pending]="tx.approvalStatus === 'Pending'"
                        [class.approved]="tx.approvalStatus === 'Approved'"
                        [class.rejected]="tx.approvalStatus === 'Rejected'">
                    {{ tx.approvalStatus }}
                  </span>
                </td>
                <td>{{ tx.createdAt | date:'short' }}</td>
                <td class="actions">
                  <button *ngIf="tx.approvalStatus === 'Pending'" 
                          class="btn-approve" 
                          (click)="openApproveModal(tx)"
                          title="Approve/Reject">
                    <span class="material-icons">check_circle</span>
                  </button>
                  <button *ngIf="tx.approvalStatus !== 'Pending'"
                          class="btn-view"
                          (click)="viewTransaction(tx)"
                          title="View Details">
                    <span class="material-icons">visibility</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="transactions.length === 0">
                <td colspan="8" class="empty-row">No transactions found</td>
              </tr>
            </tbody>
          </table>
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
                <label for="refNo">Transaction ID</label>
                <input type="text" id="refNo" [(ngModel)]="newTransaction.refNo" name="refNo" 
                       [placeholder]="selectedReceiptType === 'DBBL' || selectedReceiptType === 'UCB' || selectedReceiptType === 'EBL' ? 'From receipt' : 'Optional'" />
                <small class="hint" *ngIf="selectedReceiptType === 'DBBL'">DBBL Transaction ID from receipt</small>
                <small class="hint" *ngIf="selectedReceiptType === 'UCB'">UCB Transaction ID from receipt</small>
                <small class="hint" *ngIf="selectedReceiptType === 'EBL'">EBL Transaction ID from receipt</small>
              </div>
              <div class="form-group">
                <label for="receiptTypeField">Receipt Type</label>
                <select id="receiptTypeField" [(ngModel)]="newTransaction.receiptType" name="receiptType">
                  <option value="">Select Receipt Type</option>
                  <option *ngFor="let type of receiptTypes" [value]="type.id">
                    {{ type.name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" *ngIf="selectedReceiptType === 'DBBL' || selectedReceiptType === 'UCB' || selectedReceiptType === 'EBL'">
                <label for="transactionDate">Transaction Date</label>
                <input type="date" id="transactionDate" [(ngModel)]="transactionDate" name="transactionDate" />
              </div>
              <div class="form-group" *ngIf="!(selectedReceiptType === 'DBBL' || selectedReceiptType === 'UCB' || selectedReceiptType === 'EBL')">
                <label for="accountId">Account *</label>
                <select id="accountId" [(ngModel)]="newTransaction.accountId" name="accountId" required>
                  <option value="">Select Account</option>
                  <option *ngFor="let account of accounts" [value]="account.id">
                    {{ account.name }} ({{ account.accountType }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="status">Transaction Type *</label>
                <select id="status" [(ngModel)]="newTransaction.status" name="status" required>
                  <option value="Fund">Fund (Add to Account)</option>
                  <option value="Refund">Refund (Deduct from Account)</option>
                </select>
              </div>
            </div>
            <div class="form-group" *ngIf="selectedReceiptType === 'DBBL' || selectedReceiptType === 'UCB' || selectedReceiptType === 'EBL'">
              <label for="accountId">Account *</label>
              <select id="accountId" [(ngModel)]="newTransaction.accountId" name="accountId" required>
                <option value="">Select Account</option>
                <option *ngFor="let account of accounts" [value]="account.id">
                  {{ account.name }} ({{ account.accountType }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="transferFor">Transfer For *</label>
              <input type="text" id="transferFor" [(ngModel)]="newTransaction.transferFor" name="transferFor" 
                     placeholder="e.g., Monthly Investment, bKash Payment, Business Fund" required />
            </div>
            <div class="form-group">
              <label for="amount">Amount (BDT) *</label>
              <div class="amount-input">
                <span class="currency-symbol">৳</span>
                <input type="number" id="amount" [(ngModel)]="newTransaction.amount" name="amount" 
                       placeholder="0.00" step="0.01" min="0.01" required />
              </div>
            </div>
            <div class="form-group">
              <label for="remarks">Remarks</label>
              <textarea id="remarks" [(ngModel)]="newTransaction.remarks" name="remarks" 
                        placeholder="Optional notes about this transaction..." rows="3"></textarea>
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
              <span class="label">Ref No:</span>
              <span class="value">{{ selectedTransaction.refNo }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Transfer For:</span>
              <span class="value">{{ selectedTransaction.transferFor }}</span>
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
              <span class="label">Ref No:</span>
              <span class="value">{{ selectedTransaction.refNo }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Transfer For:</span>
              <span class="value">{{ selectedTransaction.transferFor }}</span>
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
      max-width: 1200px;
    }

    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .top-header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #1a1a2e;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      padding: 12px 24px;
      background: #f5f6fa;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #eee;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .stat-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a2e;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
    }

    .content-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a2e;
    }

    .transactions-table {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    th {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
    }

    td {
      font-size: 14px;
      color: #333;
    }

    .ref-no {
      font-family: monospace;
      color: #667eea;
    }

    .tx-type {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .tx-type.fund {
      background: #e8f5e9;
      color: #27ae60;
    }

    .tx-type.refund {
      background: #ffebee;
      color: #e74c3c;
    }

    .receipt-type {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: #e3f2fd;
      color: #1976d2;
    }

    .receipt-type.empty {
      background: #f5f5f5;
      color: #999;
    }

    .status {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .status.pending {
      background: #fff3e0;
      color: #f39c12;
    }

    .status.approved {
      background: #e8f5e9;
      color: #27ae60;
    }

    .status.rejected {
      background: #ffebee;
      color: #e74c3c;
    }

    .empty-row {
      text-align: center;
      color: #999;
      padding: 40px;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #666;
    }

    form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .material-icons {
      font-size: 20px;
    }

    td.actions {
      display: flex;
      gap: 8px;
    }

    .btn-approve, .btn-view {
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 6px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
    }

    .btn-approve:hover {
      background: #e8f5e9;
      border-color: #27ae60;
      color: #27ae60;
    }

    .btn-view:hover {
      background: #e3f2fd;
      border-color: #2196f3;
      color: #2196f3;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #666;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #eee;
      background: #f9f9f9;
    }

    .btn-approve-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    .btn-approve-action:hover {
      background: #219a52;
    }

    .btn-reject {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    .btn-reject:hover {
      background: #c0392b;
    }

    .transaction-details {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      font-weight: 500;
      color: #666;
    }

    .detail-row .value {
      color: #333;
    }

    .detail-row .value.amount {
      font-weight: 700;
      color: #667eea;
      font-size: 16px;
    }

    .receipt-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #667eea;
      text-decoration: none;
      font-size: 13px;
    }

    .receipt-link:hover {
      text-decoration: underline;
    }

    .receipt-link .material-icons {
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 992px) {
      .top-header { flex-direction: column; align-items: flex-start; gap: 16px; }
      .header-actions { width: 100%; }
      .stats-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .top-header h1 { font-size: 20px; }
      .search-box { width: 100%; margin-bottom: 12px; }
      .header-actions { flex-wrap: wrap; gap: 8px; }
      .btn { padding: 8px 12px; font-size: 13px; }
      .table-container { overflow-x: auto; }
      .transactions-table { min-width: 600px; }
      .modal-content { margin: 12px; max-width: calc(100% - 24px); }
    }
    @media (max-width: 576px) {
      .stats-card { padding: 16px; }
      .stats-card .stat-value { font-size: 20px; }
      .stat-label { font-size: 12px; }
      .form-grid { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 1fr; }
    }

    /* OCR Section Styles */
    .modal-large {
      max-width: 700px;
    }

    .modal-body-content {
      padding: 0;
    }

    .ocr-section {
      background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
      padding: 24px;
      border-bottom: 1px solid #eee;
    }

    .ocr-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .ocr-icon {
      color: #667eea;
      font-size: 32px;
    }

    .ocr-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
    }

    .ocr-info p {
      margin: 0;
      font-size: 13px;
      color: #666;
    }

    .ocr-upload {
      background: white;
      border: 2px dashed #667eea;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .ocr-upload:hover {
      border-color: #764ba2;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .ocr-upload.has-preview {
      border-style: solid;
    }

    .upload-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .upload-area:hover {
      background: #f8f9ff;
    }

    .upload-area .material-icons {
      font-size: 48px;
      color: #667eea;
      margin-bottom: 12px;
    }

    .upload-area p {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .file-types {
      font-size: 12px;
      color: #999;
    }

    .preview-area {
      padding: 16px;
    }

    .receipt-preview {
      width: 100%;
      max-height: 200px;
      object-fit: contain;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .preview-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-rescan, .btn-scan {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-rescan {
      background: #f5f6fa;
      color: #666;
    }

    .btn-rescan:hover {
      background: #eee;
    }

    .btn-scan {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-scan:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-scan:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .ocr-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 12px;
      background: #fffde7;
      border-radius: 8px;
      font-size: 12px;
      color: #666;
    }

    .ocr-hint .material-icons {
      font-size: 18px;
      color: #f39c12;
    }

    .transaction-form {
      padding: 24px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .amount-input {
      position: relative;
      display: flex;
      align-items: center;
    }

    .currency-symbol {
      position: absolute;
      left: 12px;
      font-size: 16px;
      font-weight: 600;
      color: #667eea;
    }

    .amount-input input {
      padding-left: 32px;
    }

    .receipt-type-selector {
      margin-bottom: 16px;
    }

    .receipt-type-selector label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }

    .receipt-type-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .type-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .type-chip .material-icons {
      font-size: 16px;
      color: #666;
    }

    .type-chip:hover {
      border-color: #667eea;
      background: #f8f9ff;
    }

    .type-chip.selected {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
    }

    .type-chip.selected .material-icons {
      color: white;
    }

    .hint {
      display: block;
      font-size: 11px;
      color: #999;
      margin-top: 4px;
    }

    .file-upload-section {
      background: #f9f9f9;
      border: 1px dashed #ddd;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .file-upload-section .material-icons {
      font-size: 32px;
      color: #667eea;
      margin-bottom: 8px;
    }

    .file-upload-section p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #333;
    }

    .file-upload-section input {
      display: none;
    }

    .upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #f5f6fa;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .upload-btn:hover {
      background: #eee;
      border-color: #667eea;
    }

    .selected-file {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
      font-size: 12px;
      color: #27ae60;
    }

    .selected-file .material-icons {
      font-size: 16px;
    }
  `]
})
export class PaymentsComponent implements OnInit {
  accounts: Account[] = [];
  transactions: Transaction[] = [];
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
  ocrPreviewUrl: string | null = null;
  selectedReceiptType = '';
  receiptFile: File | null = null;
  transactionDate = '';
  
  totalFunded = 0;
  totalRefunded = 0;
  pendingCount = 0;

  newTransaction: CreateTransactionRequest = {
    transferFor: '',
    amount: 0,
    status: 'Fund',
    remarks: '',
    accountId: '',
    receiptType: '',
    refNo: ''
  };

  constructor(
    private transactionService: TransactionService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadReceiptTypes();
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (event.url.includes('/payments')) {
        this.loadData();
      }
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
          { id: 'bKash', name: 'bKash', icon: 'phone_android' },
          { id: 'Rocket', name: 'Rocket', icon: 'phone_android' },
          { id: 'Nagad', name: 'Nagad', icon: 'phone_android' },
          { id: 'BankTransfer', name: 'Bank Transfer', icon: 'swap_horiz' },
          { id: 'Cash', name: 'Cash', icon: 'payments' },
          { id: 'Check', name: 'Check', icon: 'receipt_long' },
          { id: 'Other', name: 'Other', icon: 'more_horiz' }
        ];
        this.cdr.detectChanges();
      }
    });
  }

  loadData() {
    this.isLoading = true;
    this.loadAccounts();
    this.loadTransactions();
  }

  loadAccounts() {
    this.transactionService.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts.filter(a => a.isActive);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTransactions() {
    this.transactionService.getTransactions().subscribe({
      next: (transactions) => {
        this.transactions = transactions;
        this.calculateStats();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats() {
    this.totalFunded = this.transactions
      .filter(t => t.status === 'Fund' && t.approvalStatus === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);
    
    this.totalRefunded = this.transactions
      .filter(t => t.status === 'Refund' && t.approvalStatus === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);
    
    this.pendingCount = this.transactions.filter(t => t.approvalStatus === 'Pending').length;
  }

  openTransactionModal() {
    this.showModal = true;
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
    if (!this.ocrPreviewUrl) return;

    this.isOcrProcessing = true;
    this.ocrProgress = 0;

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.ocrProgress = Math.round(m.progress * 100);
            this.cdr.detectChanges();
          }
        }
      });

      const { data: { text } } = await worker.recognize(this.ocrPreviewUrl);
      await worker.terminate();

      this.parseReceiptText(text);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to process receipt. Please fill the form manually.');
    } finally {
      this.isOcrProcessing = false;
      this.ocrProgress = 0;
      this.cdr.detectChanges();
    }
  }

  parseReceiptText(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Amount patterns: ৳1234.56, Tk 1234.56, 1,234.56, 1234.56
    const amountPatterns = [
      /[৳Tk]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g
    ];

    // Common transaction type keywords
    const transactionTypes = [
      'cash in', 'cash out', 'send money', 'receive money', 'mobile load',
      'bKash', 'rocket', 'dbbl', 'nagad', 'bank', 'transfer', 'payment',
      'deposit', 'withdraw', 'refund', 'fund', 'investment', 'contribution'
    ];

    // Transaction ID patterns (for DBBL and other banks)
    const transactionIdPatterns = [
      /(?:transaction\s*id|txn\s*id|ref\s*no|sl\s*no|trx\s*id|receipt\s*no|voucher)[^\d]*(\d{6,20})/gi,
      /(?:id|ref|trx|sl)[^\d]*(\d{6,20})/gi,
      /(\d{10,20})/g
    ];

    // Date patterns
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
      /(\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/i
    ];

    let extractedAmount = 0;
    let extractedPurpose = '';
    let extractedDate = '';
    let extractedRefNo = '';

    // Extract Transaction ID based on receipt type
    if (this.selectedReceiptType === 'DBBL' || this.selectedReceiptType === 'UCB' || this.selectedReceiptType === 'EBL') {
      for (const pattern of transactionIdPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedRefNo = match[1] || match[0];
          break;
        }
      }
    }

    // Extract amount - look for the largest number (likely the transaction amount)
    for (const pattern of amountPatterns) {
      const matches = text.matchAll(pattern);
      const amounts: number[] = [];
      for (const match of matches) {
        const numStr = match[1].replace(/,/g, '');
        const num = parseFloat(numStr);
        if (num > 0 && num < 10000000) { // Reasonable amount range
          amounts.push(num);
        }
      }
      if (amounts.length > 0) {
        // Usually the largest amount is the transaction amount
        extractedAmount = Math.max(...amounts);
        break;
      }
    }

    // Extract purpose/transfer for
    const textLower = text.toLowerCase();
    for (const type of transactionTypes) {
      if (textLower.includes(type)) {
        const idx = textLower.indexOf(type);
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + type.length + 30);
        const context = text.substring(start, end).trim();
        extractedPurpose = context.replace(/\s+/g, ' ');
        break;
      }
    }

    // If no specific purpose found, use first non-empty line
    if (!extractedPurpose && lines.length > 0) {
      extractedPurpose = lines.slice(0, 3).join(' - ');
    }

    // Extract date
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedDate = match[1];
        break;
      }
    }

    // Parse and convert extracted date to input format (YYYY-MM-DD)
    if (extractedDate) {
      const parsedDate = this.parseReceiptDate(extractedDate);
      if (parsedDate) {
        this.transactionDate = parsedDate;
        this.newTransaction.transactionDate = parsedDate;
      }
    }

    // Apply extracted values
    if (extractedAmount > 0) {
      this.newTransaction.amount = extractedAmount;
    }

    if (extractedPurpose) {
      this.newTransaction.transferFor = extractedPurpose;
    }

    if (extractedRefNo) {
      this.newTransaction.refNo = extractedRefNo;
    }

    if (extractedDate) {
      this.newTransaction.remarks = (this.newTransaction.remarks || '') + 
        (this.newTransaction.remarks ? '\n' : '') + 
        `Receipt Date: ${extractedDate}`;
    }

    setTimeout(() => {
      this.cdr.detectChanges();
      const dateInput = document.getElementById('transactionDate') as HTMLInputElement;
      if (dateInput && this.transactionDate) {
        dateInput.value = this.transactionDate;
      }
    }, 100);

    this.toastService.success('Receipt scanned! Please verify the details before submitting.');
  }

  parseReceiptDate(dateStr: string): string | null {
    try {
      const months: { [key: string]: string } = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      // Format: dd-MMM-yyyy (e.g., 24-Apr-2026) - DBBL format
      const dbblFormat = /^(\d{1,2})[-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-](\d{4})$/i;
      let match = dateStr.match(dbblFormat);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(months[match[2].toLowerCase()]);
        const year = parseInt(match[3]);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Format: DD Mon YYYY (e.g., 24 April 2026)
      const dbblAltFormat = /^(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/i;
      match = dateStr.match(dbblAltFormat);
      if (match) {
        const day = parseInt(match[1]);
        const monthName = match[2].toLowerCase();
        const month = months[monthName.substring(0, 3)] || months[monthName];
        const year = parseInt(match[3]);
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
      }

      // Format: dd Mon yyyy (e.g., 24 Apr 2026)
      const shortMonthFormat = /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})$/i;
      match = dateStr.match(shortMonthFormat);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(months[match[2].toLowerCase()]);
        const year = parseInt(match[3]);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Format: YYYY-MM-DD
      const isoFormat = /^(\d{4})[-](\d{1,2})[-](\d{1,2})$/;
      match = dateStr.match(isoFormat);
      if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
      }

      // Format: MM/DD/YYYY
      const usFormat = /^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/;
      match = dateStr.match(usFormat);
      if (match) {
        return `${match[3]}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`;
      }

      // Format: DD/MD/YYYY
      const euFormat = /^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/;
      match = dateStr.match(euFormat);
      if (match) {
        return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
      }

    } catch (e) {
      console.error('Date parsing error:', e);
    }
    return null;
  }

  resetForm() {
    this.newTransaction = {
      transferFor: '',
      amount: 0,
      status: 'Fund',
      remarks: '',
      accountId: '',
      receiptType: '',
      refNo: ''
    };
    this.receiptFile = null;
    this.ocrPreviewUrl = null;
    this.selectedReceiptType = '';
    this.transactionDate = '';
  }

  createTransaction() {
    if (!this.newTransaction.accountId || !this.newTransaction.transferFor || !this.newTransaction.amount) {
      this.toastService.warning('Please fill in all required fields');
      return;
    }

    const transactionData: CreateTransactionRequest = {
      ...this.newTransaction,
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
      error: () => {
        this.isSubmitting = false;
        this.toastService.error('Failed to create transaction. Please try again.');
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
}
