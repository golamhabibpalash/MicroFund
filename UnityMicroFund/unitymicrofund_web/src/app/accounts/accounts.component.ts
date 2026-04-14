import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AccountService, Account, CreateAccountRequest, UpdateAccountRequest } from '../core/services/account';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';

const MOCK_ACCOUNTS: Account[] = [
  {
    id: '1',
    name: 'Master Account',
    description: 'Primary organization account',
    accountType: 'MasterAccount',
    balance: 150000.00,
    bankName: 'First National Bank',
    accountHolderName: 'Unity MicroFund Organization',
    accountNumber: '****1234',
    routingNumber: '021000021',
    swiftCode: 'FNBAUS33',
    branchName: 'Main Branch',
    branchAddress: '123 Financial District, New York, NY 10001',
    bankPhone: '+1-555-123-4567',
    bankEmail: 'info@firstnational.com',
    iban: 'US12345678901234567890',
    isActive: true,
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-04-10T14:30:00Z',
    totalFunded: 250000.00,
    totalRefunded: 50000.00,
    transactionCount: 45
  },
  {
    id: '2',
    name: 'Operating Fund',
    description: 'Day-to-day operational expenses',
    accountType: 'OperatingFund',
    balance: 45000.00,
    bankName: 'Bank of America',
    accountHolderName: 'Unity MicroFund Organization',
    accountNumber: '****5678',
    routingNumber: '026009593',
    swiftCode: 'BOFAUS3N',
    branchName: 'Downtown Branch',
    branchAddress: '456 Main Street, Los Angeles, CA 90001',
    bankPhone: '+1-555-987-6543',
    bankEmail: 'ops@bofa.com',
    iban: 'US09876543210987654321',
    isActive: true,
    createdBy: 'admin',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-04-08T11:15:00Z',
    totalFunded: 80000.00,
    totalRefunded: 35000.00,
    transactionCount: 28
  },
  {
    id: '3',
    name: 'Reserve Fund',
    description: 'Emergency and contingency reserve',
    accountType: 'ReserveFund',
    balance: 75000.00,
    bankName: 'Chase Bank',
    accountHolderName: 'Unity MicroFund Organization',
    accountNumber: '****9012',
    routingNumber: '021000021',
    swiftCode: 'CHASUS33',
    branchName: 'Central Branch',
    branchAddress: '789 Business Park, Chicago, IL 60601',
    bankPhone: '+1-555-456-7890',
    bankEmail: 'reserve@chase.com',
    iban: 'US54321098765432109876',
    isActive: true,
    createdBy: 'admin',
    createdAt: '2024-02-15T14:30:00Z',
    updatedAt: '2024-04-05T16:45:00Z',
    totalFunded: 100000.00,
    totalRefunded: 25000.00,
    transactionCount: 15
  },
  {
    id: '4',
    name: 'Investment Fund',
    description: 'Long-term investment portfolio',
    accountType: 'InvestmentFund',
    balance: 200000.00,
    bankName: 'Goldman Sachs',
    accountHolderName: 'Unity MicroFund Organization',
    accountNumber: '****3456',
    routingNumber: '021000128',
    swiftCode: 'GASUS33',
    branchName: 'Investment Branch',
    branchAddress: '100 Wall Street, New York, NY 10005',
    bankPhone: '+1-555-222-3333',
    bankEmail: 'investments@gs.com',
    iban: 'US98765432101234567890',
    isActive: true,
    createdBy: 'admin',
    createdAt: '2024-03-01T11:00:00Z',
    updatedAt: '2024-04-12T09:00:00Z',
    totalFunded: 300000.00,
    totalRefunded: 100000.00,
    transactionCount: 62
  },
  {
    id: '5',
    name: 'Emergency Fund',
    description: 'Medical and disaster emergencies',
    accountType: 'EmergencyFund',
    balance: 25000.00,
    bankName: 'Wells Fargo',
    accountHolderName: 'Unity MicroFund Organization',
    accountNumber: '****7890',
    routingNumber: '121000248',
    swiftCode: 'WFBIUS6S',
    branchName: 'Emergency Services Branch',
    branchAddress: '200 Health District, Houston, TX 77001',
    bankPhone: '+1-555-777-8888',
    bankEmail: 'emergency@wellsfargo.com',
    iban: 'US11112222333344445555',
    isActive: false,
    createdBy: 'admin',
    createdAt: '2024-01-20T08:00:00Z',
    updatedAt: '2024-03-15T10:30:00Z',
    totalFunded: 50000.00,
    totalRefunded: 25000.00,
    transactionCount: 8
  }
];

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BdtCurrencyPipe],
  template: `
    <div class="accounts-wrapper">
      <header class="top-header">
        <div class="header-left">
          <h1>Accounts Management</h1>
          <button class="btn-refresh" (click)="loadAccounts()" title="Refresh">
            <span class="material-icons">refresh</span>
          </button>
          <div class="view-toggle">
            <button [class.active]="viewMode === 'table'" (click)="viewMode = 'table'" title="Table View">
              <span class="material-icons">table_rows</span>
            </button>
            <button [class.active]="viewMode === 'card'" (click)="viewMode = 'card'" title="Card View">
              <span class="material-icons">grid_view</span>
            </button>
          </div>
        </div>
        <button class="btn-primary" (click)="openModal()">
          <span class="material-icons">add</span>
          Add Account
        </button>
      </header>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #667eea;">
            <span class="material-icons">account_balance</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ accounts.length }}</span>
            <span class="stat-label">Total Accounts</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #27ae60;">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalBalance | bdtCurrency }}</span>
            <span class="stat-label">Total Balance</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #f39c12;">
            <span class="material-icons">check_circle</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ activeAccounts }}</span>
            <span class="stat-label">Active Accounts</span>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <h2>All Accounts</h2>
          <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" placeholder="Search accounts..." [(ngModel)]="searchTerm" (input)="filterAccounts()" />
          </div>
        </div>

        <!-- Table View -->
        <div class="table-container" *ngIf="viewMode === 'table'">
          <table class="accounts-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Type</th>
                <th>Bank</th>
                <th>Account Number</th>
                <th>Balance</th>
                <th>Total Funded</th>
                <th>Total Refunded</th>
                <th>Transactions</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let account of filteredAccounts">
                <td class="name-cell">
                  <strong>{{ account.name }}</strong>
                  <span class="description" *ngIf="account.description">{{ account.description }}</span>
                </td>
                <td>
                  <span class="account-type-badge" [ngClass]="getAccountTypeClass(account.accountType)">
                    {{ formatAccountType(account.accountType) }}
                  </span>
                </td>
                <td>{{ account.bankName || '-' }}</td>
                <td class="mono">{{ account.accountNumber || '-' }}</td>
                <td class="balance">{{ account.balance | bdtCurrency }}</td>
                <td class="funded">{{ account.totalFunded | bdtCurrency }}</td>
                <td class="refunded">{{ account.totalRefunded | bdtCurrency }}</td>
                <td class="transactions">{{ account.transactionCount }}</td>
                <td>
                  <span class="status-badge" [class.active]="account.isActive" [class.inactive]="!account.isActive">
                    {{ account.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="date">{{ account.createdAt | date:'mediumDate' }}</td>
                <td class="actions">
                  <button class="btn-icon" (click)="editAccount(account)" title="Edit">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-icon btn-delete" (click)="confirmDelete(account)" title="Delete">
                    <span class="material-icons">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredAccounts.length === 0">
                <td colspan="11" class="empty-row">
                  <span class="material-icons">account_balance</span>
                  <span>No accounts found</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Card View -->
        <div class="accounts-grid" *ngIf="viewMode === 'card'">
          <div class="account-card" *ngFor="let account of filteredAccounts">
            <div class="card-header">
              <div class="account-type-badge" [ngClass]="getAccountTypeClass(account.accountType)">
                {{ formatAccountType(account.accountType) }}
              </div>
              <span class="status-badge" [class.active]="account.isActive" [class.inactive]="!account.isActive">
                {{ account.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <h3 class="account-name">{{ account.name }}</h3>
            <p class="account-balance">{{ account.balance | bdtCurrency }}</p>
            
            <div class="banking-details" *ngIf="account.bankName">
              <div class="detail-row">
                <span class="material-icons">account_balance</span>
                <span>{{ account.bankName }}</span>
              </div>
              <div class="detail-row" *ngIf="account.accountHolderName">
                <span class="material-icons">person</span>
                <span>{{ account.accountHolderName }}</span>
              </div>
              <div class="detail-row" *ngIf="account.accountNumber">
                <span class="material-icons">credit_card</span>
                <span>{{ account.accountNumber }}</span>
              </div>
            </div>

            <div class="card-stats">
              <div class="mini-stat">
                <span class="label">Funded</span>
                <span class="value funded">{{ account.totalFunded | bdtCurrency }}</span>
              </div>
              <div class="mini-stat">
                <span class="label">Refunded</span>
                <span class="value refunded">{{ account.totalRefunded | bdtCurrency }}</span>
              </div>
              <div class="mini-stat">
                <span class="label">Txns</span>
                <span class="value">{{ account.transactionCount }}</span>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn-icon" (click)="editAccount(account)" title="Edit">
                <span class="material-icons">edit</span>
              </button>
              <button class="btn-icon btn-delete" (click)="confirmDelete(account)" title="Delete">
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>

          <div class="empty-state" *ngIf="filteredAccounts.length === 0">
            <span class="material-icons">account_balance</span>
            <p>No accounts found</p>
            <button class="btn-primary" (click)="openModal()">Create First Account</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Account Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ isEditMode ? 'Edit Account' : 'Add New Account' }}</h3>
          <button class="close-btn" (click)="closeModal()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <form (ngSubmit)="saveAccount()">
          <div class="form-section">
            <h4>Basic Information</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Account Name *</label>
                <input type="text" [(ngModel)]="formData.name" name="name" required />
              </div>
              <div class="form-group">
                <label>Account Type *</label>
                <select [(ngModel)]="formData.accountType" name="accountType" required>
                  <option value="">Select Type</option>
                  <option value="MasterAccount">Master Account</option>
                  <option value="OperatingFund">Operating Fund</option>
                  <option value="ReserveFund">Reserve Fund</option>
                  <option value="InvestmentFund">Investment Fund</option>
                  <option value="EmergencyFund">Emergency Fund</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="formData.description" name="description" rows="2"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Initial Balance</label>
                <input type="number" [(ngModel)]="formData.initialBalance" name="initialBalance" step="0.01" />
              </div>
              <div class="form-group">
                <label>Active Status</label>
                <select [(ngModel)]="formData.isActive" name="isActive">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Banking Information</h4>
            <div class="form-group">
              <label>Bank Name</label>
              <input type="text" [(ngModel)]="formData.bankName" name="bankName" />
            </div>
            <div class="form-group">
              <label>Account Holder Name</label>
              <input type="text" [(ngModel)]="formData.accountHolderName" name="accountHolderName" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Account Number</label>
                <input type="text" [(ngModel)]="formData.accountNumber" name="accountNumber" />
              </div>
              <div class="form-group">
                <label>Routing Number</label>
                <input type="text" [(ngModel)]="formData.routingNumber" name="routingNumber" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>SWIFT Code</label>
                <input type="text" [(ngModel)]="formData.swiftCode" name="swiftCode" />
              </div>
              <div class="form-group">
                <label>IBAN</label>
                <input type="text" [(ngModel)]="formData.iban" name="iban" />
              </div>
            </div>
            <div class="form-group">
              <label>Branch Name</label>
              <input type="text" [(ngModel)]="formData.branchName" name="branchName" />
            </div>
            <div class="form-group">
              <label>Branch Address</label>
              <textarea [(ngModel)]="formData.branchAddress" name="branchAddress" rows="2"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Bank Phone</label>
                <input type="text" [(ngModel)]="formData.bankPhone" name="bankPhone" />
              </div>
              <div class="form-group">
                <label>Bank Email</label>
                <input type="email" [(ngModel)]="formData.bankEmail" name="bankEmail" />
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Account' : 'Create Account') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal-overlay" *ngIf="showDeleteModal" (click)="cancelDelete()">
      <div class="modal-content delete-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Confirm Delete</h3>
          <button class="close-btn" (click)="cancelDelete()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete account <strong>{{ accountToDelete?.name }}</strong>?</p>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="cancelDelete()">Cancel</button>
          <button type="button" class="btn-danger" (click)="deleteAccount()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .accounts-wrapper { max-width: 1400px; }
    .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .btn-refresh { background: #f5f6fa; border: 1px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; color: #666; }
    .btn-refresh:hover { background: #eee; color: #667eea; }
    .view-toggle { display: flex; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .view-toggle button { background: white; border: none; padding: 8px 12px; cursor: pointer; color: #666; }
    .view-toggle button:hover { background: #f5f6fa; }
    .view-toggle button.active { background: #667eea; color: white; }
    .btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { padding: 12px 24px; background: #f5f6fa; color: #666; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; }
    .btn-secondary:hover { background: #eee; }
    .btn-danger { padding: 12px 24px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; }
    .btn-danger:hover { background: #c0392b; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 24px; font-weight: 600; color: #1a1a2e; }
    .stat-label { font-size: 14px; color: #666; }
    .content-section { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h2 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; }
    .search-box .material-icons { color: #999; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 14px; width: 200px; }
    
    /* Table Styles */
    .table-container { overflow-x: auto; }
    .accounts-table { width: 100%; border-collapse: collapse; }
    .accounts-table th { text-align: left; padding: 12px 16px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #e9ecef; }
    .accounts-table td { padding: 16px; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
    .accounts-table tbody tr:hover { background: #f8f9fa; }
    .name-cell { display: flex; flex-direction: column; gap: 2px; }
    .name-cell strong { color: #1a1a2e; font-weight: 600; }
    .name-cell .description { font-size: 12px; color: #999; }
    .mono { font-family: monospace; letter-spacing: 1px; }
    .balance { font-weight: 700; color: #27ae60; }
    .funded { color: #2196f3; }
    .refunded { color: #f39c12; }
    .transactions { font-weight: 600; color: #667eea; }
    .date { color: #666; font-size: 13px; }
    .actions { display: flex; gap: 4px; }
    .empty-row { text-align: center; padding: 40px; color: #999; }
    .empty-row .material-icons { font-size: 48px; display: block; margin-bottom: 8px; }
    
    /* Card Styles */
    .accounts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
    .account-card { background: #f9f9f9; border-radius: 12px; padding: 20px; border: 1px solid #eee; transition: all 0.3s ease; }
    .account-card:hover { border-color: #667eea; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .account-type-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .account-type-badge.master { background: #e8f5e9; color: #27ae60; }
    .account-type-badge.operating { background: #e3f2fd; color: #2196f3; }
    .account-type-badge.reserve { background: #fff3e0; color: #f39c12; }
    .account-type-badge.investment { background: #f3e5f5; color: #9c27b0; }
    .account-type-badge.emergency { background: #ffebee; color: #e74c3c; }
    .account-type-badge.other { background: #eceff1; color: #607d8b; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-badge.active { background: #e8f5e9; color: #27ae60; }
    .status-badge.inactive { background: #ffebee; color: #e74c3c; }
    .account-name { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px 0; }
    .account-balance { font-size: 28px; font-weight: 700; color: #667eea; margin: 0 0 16px 0; }
    .banking-details { border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px; }
    .detail-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #666; margin-bottom: 6px; }
    .detail-row .material-icons { font-size: 16px; color: #999; }
    .card-stats { display: flex; gap: 16px; padding: 12px 0; border-top: 1px solid #eee; margin-bottom: 12px; }
    .mini-stat { display: flex; flex-direction: column; }
    .mini-stat .label { font-size: 11px; color: #999; text-transform: uppercase; }
    .mini-stat .value { font-size: 14px; font-weight: 600; }
    .mini-stat .value.funded { color: #2196f3; }
    .mini-stat .value.refunded { color: #f39c12; }
    .card-actions { display: flex; gap: 8px; border-top: 1px solid #eee; padding-top: 12px; }
    .btn-icon { background: white; border: 1px solid #ddd; border-radius: 6px; padding: 8px; cursor: pointer; color: #666; }
    .btn-icon:hover { background: #f5f5f5; color: #667eea; }
    .btn-icon.btn-delete:hover { color: #e74c3c; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #999; }
    .empty-state .material-icons { font-size: 64px; margin-bottom: 16px; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; }
    .modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #666; }
    form { padding: 24px; }
    .form-section { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #eee; }
    .form-section:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .form-section h4 { font-size: 14px; font-weight: 600; color: #667eea; margin: 0 0 16px 0; text-transform: uppercase; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
    .delete-modal { max-width: 400px; }
    .modal-body { padding: 24px; }
    .modal-body p { margin: 0 0 12px 0; color: #333; }
    .warning-text { color: #e74c3c; font-size: 13px; }
    .material-icons { font-size: 20px; }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .accounts-table { font-size: 13px; }
      .accounts-table th, .accounts-table td { padding: 12px 8px; }
    }
    @media (max-width: 992px) {
      .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
      .header-actions { width: 100%; justify-content: flex-start; }
      .stats-grid { grid-template-columns: 1fr; }
      .accounts-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .top-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .search-box { width: 100%; }
      .header-actions { width: 100%; flex-wrap: wrap; }
      .btn { padding: 8px 16px; font-size: 13px; }
      .table-container { overflow-x: auto; }
      .accounts-table { min-width: 600px; }
      .view-toggle { display: none; }
    }
    @media (max-width: 576px) {
      .page-header h1 { font-size: 20px; }
      .stat-card { padding: 16px; }
      .stat-card .stat-value { font-size: 20px; }
      .modal-content { margin: 12px; padding: 16px; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AccountsComponent implements OnInit, OnDestroy {
  accounts: Account[] = [];
  filteredAccounts: Account[] = [];
  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  isSubmitting = false;
  isLoading = false;
  selectedAccountId: string | null = null;
  accountToDelete: Account | null = null;
  viewMode: 'table' | 'card' = 'table';
  searchTerm = '';

  formData: any = this.getEmptyForm();
  private subscription?: Subscription;

  constructor(
    private accountService: AccountService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadAccounts();
    
    this.subscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (event.url.includes('/accounts')) {
        this.loadAccounts();
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  get totalBalance(): number {
    return this.accounts.filter(a => a.isActive).reduce((sum, a) => sum + a.balance, 0);
  }

  get activeAccounts(): number {
    return this.accounts.filter(a => a.isActive).length;
  }

  getAccountTypeClass(type: string): string {
    return type.toLowerCase().replace('fund', '').replace('account', '');
  }

  formatAccountType(type: string): string {
    return type.replace(/([A-Z])/g, ' $1').trim();
  }

  filterAccounts() {
    if (!this.searchTerm) {
      this.filteredAccounts = [...this.accounts];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredAccounts = this.accounts.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.accountType.toLowerCase().includes(term) ||
        a.bankName?.toLowerCase().includes(term) ||
        a.accountNumber?.includes(term)
      );
    }
  }

  getEmptyForm(): any {
    return {
      name: '',
      description: '',
      accountType: '',
      initialBalance: 0,
      isActive: true,
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      routingNumber: '',
      swiftCode: '',
      branchName: '',
      branchAddress: '',
      bankPhone: '',
      bankEmail: '',
      iban: ''
    };
  }

  loadAccounts() {
    this.isLoading = true;
    this.accountService.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts = Array.isArray(accounts) ? accounts : [];
        this.filteredAccounts = [...this.accounts];
        
        if (this.accounts.length === 0) {
          this.accounts = [...MOCK_ACCOUNTS];
          this.filteredAccounts = [...this.accounts];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.accounts = [...MOCK_ACCOUNTS];
        this.filteredAccounts = [...this.accounts];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openModal() {
    this.isEditMode = false;
    this.formData = this.getEmptyForm();
    this.showModal = true;
  }

  editAccount(account: Account) {
    this.isEditMode = true;
    this.selectedAccountId = account.id;
    this.formData = {
      name: account.name,
      description: account.description,
      accountType: account.accountType,
      initialBalance: account.balance,
      isActive: account.isActive,
      bankName: account.bankName,
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      routingNumber: account.routingNumber,
      swiftCode: account.swiftCode,
      branchName: account.branchName,
      branchAddress: account.branchAddress,
      bankPhone: account.bankPhone,
      bankEmail: account.bankEmail,
      iban: account.iban
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.selectedAccountId = null;
    this.formData = this.getEmptyForm();
  }

  saveAccount() {
    if (!this.formData.name || !this.formData.accountType) {
      alert('Please fill in required fields');
      return;
    }

    this.isSubmitting = true;

    const onSuccess = () => {
      console.log('Operation successful');
      this.isSubmitting = false;
      this.closeModal();
      this.loadAccounts();
    };

    const onError = (err: any, operation: string) => {
      console.error(`Failed to ${operation}:`, err);
      this.isSubmitting = false;
      const errorMsg = err.error?.message || `Failed to ${operation}. Please try again.`;
      alert(errorMsg);
    };

    if (this.isEditMode && this.selectedAccountId) {
      const updateData: UpdateAccountRequest = this.formData;
      this.accountService.updateAccount(this.selectedAccountId, updateData).subscribe({
        next: onSuccess,
        error: (err) => onError(err, 'update account')
      });
    } else {
      const createData: CreateAccountRequest = this.formData;
      console.log('Submitting create account:', createData);
      this.accountService.createAccount(createData).subscribe({
        next: (result) => {
          console.log('Account created successfully:', result);
          onSuccess();
        },
        error: (err) => onError(err, 'create account')
      });
    }
  }

  confirmDelete(account: Account) {
    this.accountToDelete = account;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.accountToDelete = null;
  }

  deleteAccount() {
    if (!this.accountToDelete) return;

    this.accountService.deleteAccount(this.accountToDelete.id).subscribe({
      next: () => {
        alert('Account deleted successfully!');
        this.cancelDelete();
        this.loadAccounts();
      },
      error: (err) => {
        console.error('Failed to delete account:', err);
        alert(err.error?.message || 'Failed to delete account. It may have existing transactions.');
      }
    });
  }
}
