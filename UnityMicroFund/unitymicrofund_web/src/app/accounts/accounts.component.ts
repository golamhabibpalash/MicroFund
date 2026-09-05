import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import {
  AccountService, Account, CreateAccountRequest, UpdateAccountRequest,
  AccountLedgerEntry, AccountLedgerRequest, AccountsSummary, AccountEntryDirection,
} from '../core/services/account';
import { ToastService } from '../core/services/toast.service';
import { UserService } from '../core/services/user';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';
import { DraggableModalDirective } from '../shared/directives/draggable-modal.directive';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BdtCurrencyPipe, DraggableModalDirective],
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
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #0d9488;">
            <span class="material-icons">savings</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ (summary?.availableBalance ?? 0) | bdtCurrency }}</span>
            <span class="stat-label">Available Balance</span>
            <span class="stat-breakdown" *ngIf="summary">
              Pool {{ summary.totalPoolAmount | bdtCurrency }}
              <span class="pos">+ {{ summary.totalInvestmentNetProfit | bdtCurrency }} invest. profit</span>
              <span class="neg">− {{ summary.totalExpenses | bdtCurrency }} expenses</span>
            </span>
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
                <th>Account</th>
                <th>Type</th>
                <th>Bank</th>
                <th class="num">Balance</th>
                <th class="num">Transactions</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let account of filteredAccounts">
                <td class="name-cell">
                  <div class="name-row">
                    <strong>{{ account.name }}</strong>
                    <span class="status-badge" [class.active]="account.isActive" [class.inactive]="!account.isActive">
                      {{ account.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <span class="description" *ngIf="account.description">{{ account.description }}</span>
                </td>
                <td>
                  <span class="account-type-badge" [ngClass]="getAccountTypeClass(account.accountType)">
                    {{ formatAccountType(account.accountType) }}
                  </span>
                </td>
                <td>
                  <div class="bank-cell">
                    <span class="bank-name">{{ account.bankName || '-' }}</span>
                    <span class="bank-sub" *ngIf="account.accountNumber">#{{ account.accountNumber }}</span>
                    <span class="bank-sub" *ngIf="account.accountHolderName">{{ account.accountHolderName }}</span>
                  </div>
                </td>
                <td class="num">
                  <div class="finance-cell">
                    <span class="balance">{{ account.balance | bdtCurrency }}</span>
                    <span class="finance-sub">
                      <i class="material-icons caret-up">arrow_upward</i> {{ account.totalFunded | bdtCurrency }}
                    </span>
                  </div>
                </td>
                <td class="num">
                  <div class="finance-cell">
                    <span class="transactions">{{ account.transactionCount }}</span>
                    <span class="finance-sub refunded">
                      <i class="material-icons caret-down">arrow_downward</i> {{ account.totalRefunded | bdtCurrency }}
                    </span>
                  </div>
                </td>
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
                <td colspan="6" class="empty-row">
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

      <!-- Expenses & Income -->
      <div class="content-section ledger-section">
        <div class="section-header">
          <h2>Expenses &amp; Income</h2>
          <div class="ledger-actions">
            <button *ngIf="isAdmin" class="btn-expense" (click)="openLedgerModal('Expense')">
              <span class="material-icons">south_west</span> Add Expense
            </button>
            <button *ngIf="isAdmin" class="btn-income" (click)="openLedgerModal('Income')">
              <span class="material-icons">north_east</span> Add Income
            </button>
          </div>
        </div>

        <div class="ledger-filters">
          <div class="ledger-filters-main">
            <div class="search-box">
              <span class="material-icons">search</span>
              <input type="text" [(ngModel)]="ledgerSearch" (ngModelChange)="onLedgerSearchChange()"
                     placeholder="Search account, category, notes…" />
              <button type="button" class="search-clear" *ngIf="ledgerSearch"
                      (click)="ledgerSearch = ''; onLedgerSearchChange()" title="Clear search" aria-label="Clear search">
                <span class="material-icons">close</span>
              </button>
            </div>
            <div class="ledger-filter-fields">
              <label class="led-field">
                <span class="field-label">Type</span>
                <select [(ngModel)]="ledgerDirection" (ngModelChange)="applyLedgerFilters()">
                  <option value="">All types</option>
                  <option value="Expense">Expenses</option>
                  <option value="Income">Income</option>
                </select>
              </label>
              <label class="led-field">
                <span class="field-label">Account</span>
                <select [(ngModel)]="ledgerAccountId" (ngModelChange)="applyLedgerFilters()">
                  <option value="">All accounts</option>
                  <option *ngFor="let a of accounts" [value]="a.id">{{ a.name }}</option>
                </select>
              </label>
              <div class="led-field field-date">
                <span class="field-label">Date range</span>
                <div class="date-range">
                  <input type="date" [(ngModel)]="ledgerFromDate" (ngModelChange)="applyLedgerFilters()" aria-label="From date" />
                  <span class="date-sep material-icons">arrow_forward</span>
                  <input type="date" [(ngModel)]="ledgerToDate" (ngModelChange)="applyLedgerFilters()" aria-label="To date" />
                </div>
              </div>
            </div>
          </div>
          <div class="ledger-filters-active" *ngIf="hasLedgerActiveFilters()">
            <span class="active-label">Filters</span>
            <button type="button" class="ledger-clear-all" (click)="clearLedgerFilters()">
              <span class="material-icons">restart_alt</span>
              Clear all
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="accounts-table">
            <thead>
              <tr>
                <th class="sortable" (click)="sortLedger('entryDate')">
                  Date
                  <span class="sort-icon material-icons" *ngIf="ledgerSortColumn === 'entryDate'">{{ ledgerSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th class="sortable" (click)="sortLedger('direction')">
                  Type
                  <span class="sort-icon material-icons" *ngIf="ledgerSortColumn === 'direction'">{{ ledgerSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th class="sortable" (click)="sortLedger('accountName')">
                  Account
                  <span class="sort-icon material-icons" *ngIf="ledgerSortColumn === 'accountName'">{{ ledgerSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th class="sortable" (click)="sortLedger('category')">
                  Category
                  <span class="sort-icon material-icons" *ngIf="ledgerSortColumn === 'category'">{{ ledgerSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th class="num sortable" (click)="sortLedger('amount')">
                  Amount
                  <span class="sort-icon material-icons" *ngIf="ledgerSortColumn === 'amount'">{{ ledgerSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                </th>
                <th>Notes</th>
                <th class="actions-col" *ngIf="isAdmin">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of paginatedLedger">
                <td class="date">{{ e.entryDate | date:'mediumDate' }}</td>
                <td>
                  <span class="ledger-badge" [class.expense]="e.direction === 'Expense'" [class.income]="e.direction === 'Income'">
                    {{ e.direction }}
                  </span>
                </td>
                <td>{{ e.accountName }}</td>
                <td>{{ e.category }}</td>
                <td class="num">
                  <span class="ledger-amt" [class.expense]="e.direction === 'Expense'" [class.income]="e.direction === 'Income'">
                    {{ e.direction === 'Expense' ? '−' : '+' }} {{ e.amount | bdtCurrency }}
                  </span>
                </td>
                <td class="ledger-notes">{{ e.notes || '—' }}</td>
                <td class="actions" *ngIf="isAdmin">
                  <button class="btn-icon" (click)="editLedgerEntry(e)" title="Edit">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-icon btn-delete" (click)="deleteLedgerEntry(e)" title="Delete">
                    <span class="material-icons">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="paginatedLedger.length === 0">
                <td [attr.colspan]="isAdmin ? 7 : 6" class="empty-row">
                  <span class="material-icons">receipt_long</span>
                  <span>{{ hasLedgerActiveFilters() ? 'No entries match your filters' : 'No expenses or income recorded yet' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Ledger Pagination -->
        <div class="pagination" *ngIf="filteredLedger.length > 0">
          <div class="page-info">
            Showing {{ (ledgerCurrentPage - 1) * ledgerPageSize + 1 }}–{{ Math.min(ledgerCurrentPage * ledgerPageSize, filteredLedger.length) }} of {{ filteredLedger.length }} entries
          </div>
          <div class="pagination-right">
            <div class="page-size-select">
              <label>Rows:</label>
              <select [(ngModel)]="ledgerPageSize" (ngModelChange)="onLedgerPageSizeChange()">
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
            </div>
            <div class="page-buttons">
              <button class="btn-page" (click)="goToLedgerPage(1)" [disabled]="ledgerCurrentPage === 1" title="First">
                <span class="material-icons">first_page</span>
              </button>
              <button class="btn-page" (click)="goToLedgerPage(ledgerCurrentPage - 1)" [disabled]="ledgerCurrentPage === 1" title="Previous">
                <span class="material-icons">chevron_left</span>
              </button>
              <button *ngFor="let page of ledgerVisiblePages"
                      class="btn-page"
                      [class.active]="page === ledgerCurrentPage"
                      (click)="goToLedgerPage(page)"
                      [disabled]="page === -1">
                {{ page === -1 ? '...' : page }}
              </button>
              <button class="btn-page" (click)="goToLedgerPage(ledgerCurrentPage + 1)" [disabled]="ledgerCurrentPage === ledgerTotalPages" title="Next">
                <span class="material-icons">chevron_right</span>
              </button>
              <button class="btn-page" (click)="goToLedgerPage(ledgerTotalPages)" [disabled]="ledgerCurrentPage === ledgerTotalPages" title="Last">
                <span class="material-icons">last_page</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ledger entry modal -->
    <div class="modal-overlay" *ngIf="showLedgerModal" (click)="closeLedgerModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ ledgerEditId ? 'Edit' : 'Add' }} {{ ledgerForm.direction }}</h3>
          <button class="close-btn" (click)="closeLedgerModal()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <form (ngSubmit)="saveLedgerEntry()">
          <div class="form-section">
            <div class="type-toggle">
              <button type="button" [class.active]="ledgerForm.direction === 'Expense'"
                      (click)="ledgerForm.direction = 'Expense'">Expense</button>
              <button type="button" [class.active]="ledgerForm.direction === 'Income'"
                      (click)="ledgerForm.direction = 'Income'">Income</button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Account *</label>
                <select [(ngModel)]="ledgerForm.accountId" name="l-account" required>
                  <option value="">Select account</option>
                  <option *ngFor="let a of accounts" [value]="a.id">
                    {{ a.name }} ({{ a.balance | bdtCurrency }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Amount (BDT) *</label>
                <input type="number" [(ngModel)]="ledgerForm.amount" name="l-amount" step="0.01" min="0.01" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Category *</label>
                <input type="text" [(ngModel)]="ledgerForm.category" name="l-category" list="ledger-categories"
                       maxlength="100" placeholder="e.g. Hosting, Bank Interest" required />
                <datalist id="ledger-categories">
                  <option *ngFor="let c of categorySuggestions" [value]="c"></option>
                </datalist>
              </div>
              <div class="form-group">
                <label>Date</label>
                <input type="date" [(ngModel)]="ledgerForm.entryDate" name="l-date" />
              </div>
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="ledgerForm.notes" name="l-notes" rows="2" maxlength="500"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="closeLedgerModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Saving...' : (ledgerEditId ? 'Update' : 'Add') }}
            </button>
          </div>
        </form>
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
    .accounts-wrapper { width: 100%; margin: 0 auto; padding: 24px; box-sizing: border-box; }
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
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 18px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
    .stat-info { display: flex; flex-direction: column; min-width: 0; }
    .stat-value { font-size: 22px; font-weight: 600; color: #1a1a2e; }
    .stat-label { font-size: 14px; color: #666; }
    .stat-breakdown { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; font-size: 11px; color: #94a3b8; }
    .stat-breakdown .pos { color: #0d9488; font-weight: 600; }
    .stat-breakdown .neg { color: #e11d48; font-weight: 600; }

    .ledger-section { margin-top: 24px; }
    .ledger-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .btn-expense, .btn-income { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: white; }
    .btn-expense { background: #e74c3c; } .btn-expense:hover { background: #c0392b; }
    .btn-income { background: #27ae60; } .btn-income:hover { background: #1e8e4e; }
    .btn-expense .material-icons, .btn-income .material-icons { font-size: 16px; }

    /* Ledger: search / filter */
    .ledger-filters {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 16px;
    }
    .ledger-filters-main {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ledger-filters-main .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      height: 38px;
      flex: 1 1 260px;
      max-width: 360px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .ledger-filters-main .search-box:focus-within { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12); }
    .ledger-filters-main .search-box > .material-icons { font-size: 18px; color: #94a3b8; flex-shrink: 0; }
    .ledger-filters-main .search-box input { border: none; background: transparent; outline: none; font-size: 13px; color: #0f172a; width: 100%; min-width: 100px; }
    .ledger-filters-main .search-box input::placeholder { color: #94a3b8; }
    .search-clear {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; padding: 0; border: none; border-radius: 50%;
      background: #f1f5f9; color: #64748b; cursor: pointer; flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .search-clear:hover { background: #fef2f2; color: #dc2626; }
    .search-clear .material-icons { font-size: 14px; }
    .ledger-filter-fields { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; flex: 1 1 auto; }
    .led-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .led-field .field-label { font-size: 11px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: #64748b; padding-left: 2px; }
    .led-field select {
      height: 38px; padding: 0 30px 0 12px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 13px; color: #0f172a; background-color: white; cursor: pointer; outline: none;
      appearance: none; min-width: 140px; max-width: 190px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 9px center;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .led-field select:hover { border-color: #0d9488; }
    .led-field select:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12); }
    .led-field.field-date { flex: 0 0 auto; }
    .date-range {
      display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px;
      background: white; border: 1px solid #e2e8f0; border-radius: 8px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .date-range:focus-within { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12); }
    .date-range input[type="date"] { font-size: 13px; color: #0f172a; border: none; background: transparent; outline: none; width: 118px; cursor: pointer; }
    .date-range .date-sep { font-size: 14px; color: #94a3b8; flex-shrink: 0; }
    .date-range input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.45; }
    .date-range input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 0.9; }

    /* Ledger: active filter bar */
    .ledger-filters-active {
      display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
      padding-top: 12px; border-top: 1px dashed #e2e8f0;
    }
    .ledger-filters-active .active-label { font-size: 11px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: #64748b; margin-right: 4px; }
    .ledger-clear-all {
      display: inline-flex; align-items: center; gap: 4px; margin-left: auto;
      padding: 4px 10px; background: transparent; color: #dc2626; border: 1px solid transparent;
      border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .ledger-clear-all:hover { background: #fef2f2; border-color: #dc2626; }
    .ledger-clear-all .material-icons { font-size: 15px; }

    /* Ledger: pagination */
    .pagination {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 16px; margin-top: 4px; border-top: 1px solid #f0f0f0; flex-wrap: wrap; gap: 12px;
    }
    .page-info { font-size: 13px; color: #64748b; }
    .pagination-right { display: flex; align-items: center; gap: 16px; }
    .page-size-select { display: flex; align-items: center; gap: 8px; }
    .page-size-select label { font-size: 13px; color: #64748b; white-space: nowrap; }
    .page-size-select select {
      padding: 4px 26px 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 13px; color: #475569; background: white; appearance: none; cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 8px center;
    }
    .page-buttons { display: flex; gap: 2px; }
    .btn-page {
      display: flex; align-items: center; justify-content: center;
      min-width: 32px; height: 32px; padding: 0 6px; background: transparent;
      border: 1px solid transparent; border-radius: 6px; font-size: 13px; color: #475569;
      cursor: pointer; transition: all 0.15s ease;
    }
    .btn-page:hover:not(:disabled) { background: #f1f5f9; border-color: #e2e8f0; }
    .btn-page.active { background: #0d9488; border-color: #0d9488; color: white; font-weight: 600; }
    .btn-page:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn-page .material-icons { font-size: 18px; }

    /* Ledger: sortable header + sort icon */
    .accounts-table th.sortable { cursor: pointer; user-select: none; transition: color 0.15s ease; }
    .accounts-table th.sortable:hover { color: #0d9488; }
    .accounts-table .sort-icon { font-size: 14px; vertical-align: middle; margin-left: 2px; }

    .ledger-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .ledger-badge.expense { background: #fdecea; color: #c0392b; }
    .ledger-badge.income { background: #e8f5e9; color: #1e8e4e; }
    .ledger-amt { font-weight: 700; white-space: nowrap; }
    .ledger-amt.expense { color: #c0392b; }
    .ledger-amt.income { color: #1e8e4e; }
    .ledger-notes { color: #777; font-size: 13px; max-width: 240px; }
    .type-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
    .type-toggle button { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; font-size: 13px; font-weight: 600; color: #666; cursor: pointer; }
    .type-toggle button.active { background: #667eea; border-color: #667eea; color: white; }
    .content-section { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h2 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; }
    .search-box .material-icons { color: #999; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 14px; width: 200px; }
    
    /* Table Styles */
    .table-container { overflow-x: auto; }
    .accounts-table { width: 100%; border-collapse: collapse; }
    .accounts-table th { text-align: left; padding: 12px 16px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    .accounts-table th.num, .accounts-table td.num { text-align: right; }
    .accounts-table td { padding: 14px 16px; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
    .accounts-table tbody tr { transition: background 0.15s ease; }
    .accounts-table tbody tr:hover { background: #f8f9fa; }
    .name-cell { display: flex; flex-direction: column; gap: 4px; min-width: 180px; }
    .name-row { display: flex; align-items: center; gap: 10px; }
    .name-cell strong { color: #1a1a2e; font-weight: 600; white-space: nowrap; }
    .name-cell .description { font-size: 12px; color: #999; }
    .bank-cell { display: flex; flex-direction: column; gap: 2px; }
    .bank-cell .bank-name { font-weight: 500; color: #1a1a2e; }
    .bank-cell .bank-sub { font-size: 12px; color: #999; font-family: monospace; letter-spacing: 0.3px; }
    .finance-cell { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
    .finance-sub { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; color: #2196f3; }
    .finance-sub .material-icons { font-size: 14px; }
    .finance-sub.refunded { color: #f39c12; }
    .finance-sub .caret-up, .finance-sub .caret-down { vertical-align: middle; }
    .balance { font-weight: 700; color: #27ae60; white-space: nowrap; }
    .transactions { font-weight: 600; color: #667eea; }
    .date { color: #666; font-size: 13px; white-space: nowrap; }
    .actions-col { width: 1%; }
    .actions { display: flex; gap: 4px; justify-content: flex-end; white-space: nowrap; }
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
      .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .ledger-actions { width: 100%; }
      .ledger-filters-main { align-items: stretch; }
      .ledger-filters-main .search-box { max-width: none; flex: 1 1 100%; }
      .ledger-filter-fields { width: 100%; }
      .led-field { flex: 1 1 calc(50% - 6px); }
    }
    @media (max-width: 768px) {
      .accounts-wrapper { padding: 16px; }
      .top-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .search-box { width: 100%; }
      .header-actions { width: 100%; flex-wrap: wrap; }
      .btn { padding: 8px 16px; font-size: 13px; }
      .table-container { overflow-x: auto; }
      .accounts-table { min-width: 600px; }
      .view-toggle { display: none; }
      .pagination { flex-direction: column; align-items: flex-start; }
      .pagination-right { width: 100%; justify-content: space-between; }
    }
    @media (max-width: 576px) {
      .page-header h1 { font-size: 20px; }
      .stat-card { padding: 16px; }
      .stat-card .stat-value { font-size: 20px; }
      .modal-content { margin: 12px; padding: 16px; }
      .form-grid { grid-template-columns: 1fr; }
      .led-field { flex: 1 1 100%; }
      .pagination-right { flex-direction: column; align-items: flex-start; gap: 8px; }
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
  Math = Math;

  formData: any = this.getEmptyForm();
  private subscription?: Subscription;

  isAdmin = false;
  summary: AccountsSummary | null = null;
  ledgerEntries: AccountLedgerEntry[] = [];
  // Expenses & Income: search / filter / sort / pagination (client-side)
  filteredLedger: AccountLedgerEntry[] = [];
  paginatedLedger: AccountLedgerEntry[] = [];
  ledgerSearch = '';
  ledgerDirection: '' | AccountEntryDirection = '';
  ledgerAccountId = '';
  ledgerFromDate = '';
  ledgerToDate = '';
  ledgerSortColumn: keyof AccountLedgerEntry = 'entryDate';
  ledgerSortDirection: 'asc' | 'desc' = 'desc';
  ledgerCurrentPage = 1;
  ledgerPageSize = 10;
  ledgerTotalPages = 1;
  showLedgerModal = false;
  ledgerEditId: string | null = null;
  ledgerForm: any = this.getEmptyLedgerForm();

  constructor(
    private accountService: AccountService,
    private toastService: ToastService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.isAdmin = this.userService.isAdminOrManager();
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
    return this.accounts.reduce((sum, a) => sum + a.balance, 0);
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
      iban: ''
    };
  }

  loadAccounts() {
    this.isLoading = true;
    this.accountService.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts = Array.isArray(accounts) ? accounts : [];
        this.filterAccounts();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.accounts = [];
        this.filteredAccounts = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
    this.loadSummary();
    this.loadLedger();
  }

  loadSummary() {
    this.accountService.getSummary().subscribe({
      next: (s) => { this.summary = s; this.cdr.detectChanges(); },
      error: () => { this.summary = null; this.cdr.detectChanges(); },
    });
  }

  loadLedger() {
    this.accountService.getLedger().subscribe({
      next: (rows) => {
        this.ledgerEntries = Array.isArray(rows) ? rows : [];
        this.applyLedgerFiltersAndSort();
        this.cdr.detectChanges();
      },
      error: () => {
        this.ledgerEntries = [];
        this.filteredLedger = [];
        this.paginatedLedger = [];
        this.ledgerTotalPages = 1;
        this.cdr.detectChanges();
      },
    });
  }

  onLedgerSearchChange() {
    this.ledgerCurrentPage = 1;
    this.applyLedgerFiltersAndSort();
  }

  applyLedgerFilters() {
    this.ledgerCurrentPage = 1;
    this.applyLedgerFiltersAndSort();
  }

  sortLedger(column: keyof AccountLedgerEntry) {
    if (this.ledgerSortColumn === column) {
      this.ledgerSortDirection = this.ledgerSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.ledgerSortColumn = column;
      this.ledgerSortDirection = 'asc';
    }
    this.applyLedgerFiltersAndSort();
  }

  applyLedgerFiltersAndSort() {
    let result = [...this.ledgerEntries];

    if (this.ledgerSearch.trim()) {
      const search = this.ledgerSearch.trim().toLowerCase();
      result = result.filter(e =>
        e.accountName.toLowerCase().includes(search) ||
        e.category.toLowerCase().includes(search) ||
        e.direction.toLowerCase().includes(search) ||
        (e.notes && e.notes.toLowerCase().includes(search))
      );
    }

    if (this.ledgerDirection) {
      result = result.filter(e => e.direction === this.ledgerDirection);
    }

    if (this.ledgerAccountId) {
      result = result.filter(e => e.accountId === this.ledgerAccountId);
    }

    if (this.ledgerFromDate || this.ledgerToDate) {
      const from = this.ledgerFromDate ? new Date(this.ledgerFromDate + 'T00:00:00') : null;
      const to = this.ledgerToDate ? new Date(this.ledgerToDate + 'T23:59:59.999') : null;
      result = result.filter(e => {
        const d = new Date(e.entryDate);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    result.sort((a, b) => {
      let aVal: any = a[this.ledgerSortColumn];
      let bVal: any = b[this.ledgerSortColumn];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as string).toLowerCase(); }
      if (aVal < bVal) return this.ledgerSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.ledgerSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredLedger = result;
    this.ledgerTotalPages = Math.ceil(this.filteredLedger.length / this.ledgerPageSize) || 1;
    if (this.ledgerCurrentPage > this.ledgerTotalPages) this.ledgerCurrentPage = 1;
    this.updatePaginatedLedger();
  }

  updatePaginatedLedger() {
    const start = (this.ledgerCurrentPage - 1) * this.ledgerPageSize;
    this.paginatedLedger = this.filteredLedger.slice(start, start + this.ledgerPageSize);
  }

  onLedgerPageSizeChange() {
    this.ledgerCurrentPage = 1;
    this.ledgerTotalPages = Math.ceil(this.filteredLedger.length / this.ledgerPageSize) || 1;
    this.updatePaginatedLedger();
  }

  get ledgerVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    if (this.ledgerTotalPages <= maxVisible) {
      for (let i = 1; i <= this.ledgerTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.ledgerCurrentPage > 2) pages.push(-1);
      const start = Math.max(2, this.ledgerCurrentPage - 1);
      const end = Math.min(this.ledgerTotalPages - 1, this.ledgerCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (this.ledgerCurrentPage < this.ledgerTotalPages - 1) pages.push(-1);
      pages.push(this.ledgerTotalPages);
    }
    return pages;
  }

  goToLedgerPage(page: number) {
    if (page >= 1 && page <= this.ledgerTotalPages && page !== this.ledgerCurrentPage) {
      this.ledgerCurrentPage = page;
      this.updatePaginatedLedger();
    }
  }

  hasLedgerActiveFilters(): boolean {
    return !!this.ledgerSearch.trim() || !!this.ledgerDirection ||
      !!this.ledgerAccountId || !!this.ledgerFromDate || !!this.ledgerToDate;
  }

  clearLedgerFilters() {
    this.ledgerSearch = '';
    this.ledgerDirection = '';
    this.ledgerAccountId = '';
    this.ledgerFromDate = '';
    this.ledgerToDate = '';
    this.applyLedgerFiltersAndSort();
  }

  getEmptyLedgerForm(): any {
    return { direction: 'Expense' as AccountEntryDirection, accountId: '', category: '', amount: null, entryDate: '', notes: '' };
  }

  get categorySuggestions(): string[] {
    const common = ['Banking', 'Website', 'Domain', 'Hosting', 'Bank Interest', 'Utilities', 'Office', 'Stationery', 'Legal', 'Other'];
    const used = this.ledgerEntries.map(e => e.category).filter(Boolean);
    return Array.from(new Set([...used, ...common]));
  }

  openLedgerModal(direction: AccountEntryDirection) {
    this.ledgerEditId = null;
    this.ledgerForm = this.getEmptyLedgerForm();
    this.ledgerForm.direction = direction;
    this.showLedgerModal = true;
  }

  editLedgerEntry(e: AccountLedgerEntry) {
    this.ledgerEditId = e.id;
    this.ledgerForm = {
      direction: e.direction,
      accountId: e.accountId,
      category: e.category,
      amount: e.amount,
      entryDate: e.entryDate ? e.entryDate.slice(0, 10) : '',
      notes: e.notes ?? '',
    };
    this.showLedgerModal = true;
  }

  closeLedgerModal() {
    this.showLedgerModal = false;
    this.ledgerEditId = null;
    this.ledgerForm = this.getEmptyLedgerForm();
  }

  saveLedgerEntry() {
    const f = this.ledgerForm;
    if (!f.accountId || !f.category || !f.amount || f.amount < 0.01) {
      this.toastService.warning('Account, category and a positive amount are required.');
      return;
    }
    const req: AccountLedgerRequest = {
      accountId: f.accountId,
      direction: f.direction,
      category: (f.category as string).trim(),
      amount: Number(f.amount),
      entryDate: f.entryDate ? `${f.entryDate}T00:00:00Z` : null,
      notes: f.notes ? (f.notes as string).trim() : null,
    };
    this.isSubmitting = true;
    const call = this.ledgerEditId
      ? this.accountService.updateLedgerEntry(this.ledgerEditId, req)
      : this.accountService.createLedgerEntry(req);
    call.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success(`${f.direction} ${this.ledgerEditId ? 'updated' : 'recorded'}.`);
        this.closeLedgerModal();
        this.loadAccounts();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toastService.error(err.error?.message || 'Could not save the entry.');
      },
    });
  }

  deleteLedgerEntry(e: AccountLedgerEntry) {
    if (!confirm(`Delete this ${e.direction.toLowerCase()} of ${e.amount} in "${e.accountName}"? The account balance will be adjusted back.`)) {
      return;
    }
    this.accountService.deleteLedgerEntry(e.id).subscribe({
      next: () => {
        this.toastService.success('Entry deleted.');
        this.loadAccounts();
      },
      error: (err) => this.toastService.error(err.error?.message || 'Could not delete the entry.'),
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
      this.toastService.warning('Please fill in required fields');
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.selectedAccountId) {
      const updateData: UpdateAccountRequest = this.formData;
      this.accountService.updateAccount(this.selectedAccountId, updateData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toastService.success('Account updated successfully!');
          this.closeModal();
          this.loadAccounts();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.error(err.error?.message || 'Failed to update account. Please try again.');
        }
      });
    } else {
      const createData: CreateAccountRequest = this.formData;
      this.accountService.createAccount(createData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toastService.success('Account created successfully!');
          this.closeModal();
          this.loadAccounts();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.error(err.error?.message || 'Failed to create account. Please try again.');
        }
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
        this.toastService.success('Account deleted successfully!');
        this.cancelDelete();
        this.loadAccounts();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to delete account.');
      }
    });
  }
}
