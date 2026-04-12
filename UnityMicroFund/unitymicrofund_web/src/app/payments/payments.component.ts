import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService, Account, Transaction, CreateTransactionRequest } from '../core/services/transaction';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            <span class="stat-value">{{ totalFunded | currency }}</span>
            <span class="stat-label">Total Funded</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #e74c3c;">
            <span class="material-icons">money_off</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalRefunded | currency }}</span>
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
                <th>Status</th>
                <th>Approval</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of transactions">
                <td class="ref-no">{{ tx.refNo }}</td>
                <td>{{ tx.transferFor }}</td>
                <td class="amount">{{ tx.amount | currency }}</td>
                <td>{{ tx.accountName }}</td>
                <td>
                  <span class="tx-type" [class.fund]="tx.status === 'Fund'" [class.refund]="tx.status === 'Refund'">
                    {{ tx.status }}
                  </span>
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
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Create New Transaction</h3>
          <button class="close-btn" (click)="closeModal()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <form (ngSubmit)="createTransaction()">
          <div class="form-group">
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
                   placeholder="e.g., Monthly Investment" required />
          </div>
          <div class="form-group">
            <label for="amount">Amount *</label>
            <input type="number" id="amount" [(ngModel)]="newTransaction.amount" name="amount" 
                   placeholder="0.00" step="0.01" min="0.01" required />
          </div>
          <div class="form-group">
            <label for="status">Transaction Type *</label>
            <select id="status" [(ngModel)]="newTransaction.status" name="status" required>
              <option value="Fund">Fund (Add to Account)</option>
              <option value="Refund">Refund (Deduct from Account)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="remarks">Remarks</label>
            <textarea id="remarks" [(ngModel)]="newTransaction.remarks" name="remarks" 
                      placeholder="Optional notes..." rows="3"></textarea>
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
              <span class="value amount">{{ selectedTransaction.amount | currency }}</span>
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
              <span class="value amount">{{ selectedTransaction.amount | currency }}</span>
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
  `]
})
export class PaymentsComponent implements OnInit {
  accounts: Account[] = [];
  transactions: Transaction[] = [];
  showModal = false;
  showApproveModal = false;
  showViewModal = false;
  isSubmitting = false;
  selectedTransaction: Transaction | null = null;
  approvalRemarks = '';
  
  totalFunded = 0;
  totalRefunded = 0;
  pendingCount = 0;

  newTransaction: CreateTransactionRequest = {
    transferFor: '',
    amount: 0,
    status: 'Fund',
    remarks: '',
    accountId: ''
  };

  constructor(
    private transactionService: TransactionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadAccounts();
    this.loadTransactions();
  }

  loadAccounts() {
    this.transactionService.getAccounts().subscribe({
      next: (accounts) => this.accounts = accounts.filter(a => a.isActive),
      error: (err) => console.error('Failed to load accounts:', err)
    });
  }

  loadTransactions() {
    this.transactionService.getTransactions().subscribe({
      next: (transactions) => {
        this.transactions = transactions;
        this.calculateStats();
      },
      error: (err) => console.error('Failed to load transactions:', err)
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
  }

  resetForm() {
    this.newTransaction = {
      transferFor: '',
      amount: 0,
      status: 'Fund',
      remarks: '',
      accountId: ''
    };
  }

  createTransaction() {
    if (!this.newTransaction.accountId || !this.newTransaction.transferFor || !this.newTransaction.amount) {
      alert('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;
    console.log('Creating transaction with data:', this.newTransaction);
    
    this.transactionService.createTransaction(this.newTransaction).subscribe({
      next: (result) => {
        console.log('Transaction created successfully:', result);
        this.isSubmitting = false;
        alert('Transaction created successfully! It will be reviewed by an admin.');
        this.showModal = false;
        this.resetForm();
        this.cdr.detectChanges();
        this.loadTransactions();
      },
      error: (err) => {
        console.error('Failed to create transaction:', err);
        this.isSubmitting = false;
        alert('Failed to create transaction. Please try again.');
        this.cdr.detectChanges();
      }
    });
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
        console.log('Transaction approved');
        this.isSubmitting = false;
        alert('Transaction approved successfully!');
        this.closeApproveModal();
        this.loadTransactions();
      },
      error: (err) => {
        console.error('Failed to approve transaction:', err);
        this.isSubmitting = false;
        alert('Failed to approve transaction. Please try again.');
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
        console.log('Transaction rejected');
        this.isSubmitting = false;
        alert('Transaction rejected.');
        this.closeApproveModal();
        this.loadTransactions();
      },
      error: (err) => {
        console.error('Failed to reject transaction:', err);
        this.isSubmitting = false;
        alert('Failed to reject transaction. Please try again.');
      }
    });
  }
}
