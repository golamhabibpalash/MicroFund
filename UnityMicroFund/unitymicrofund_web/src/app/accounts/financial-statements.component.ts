import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccountService,
  BalanceSheet,
  IncomeStatement,
} from '../core/services/account';
import { ToastService } from '../core/services/toast.service';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';

@Component({
  selector: 'app-financial-statements',
  standalone: true,
  imports: [CommonModule, FormsModule, BdtCurrencyPipe],
  template: `
    <div class="statements-wrapper">
      <div class="statements-header">
        <div>
          <h2>Financial Statements</h2>
          <p>Derived from account balances, member funding, investment results and the expense/income ledger.</p>
        </div>
        <button class="btn-refresh" (click)="loadAll()" [disabled]="isLoadingBalance || isLoadingIncome" title="Refresh statements">
          <span class="material-icons">refresh</span>
          Refresh
        </button>
      </div>

      <div class="statements-grid">
        <!-- Balance sheet -->
        <section class="statement-card">
          <header class="statement-card-header">
            <div>
              <h3>Balance Sheet</h3>
              <span class="as-of" *ngIf="balanceSheet">As of {{ balanceSheet.asOf | date:'mediumDate' }}</span>
            </div>
            <span class="statement-badge" *ngIf="balanceSheet" [class.ok]="balanceSheet.isBalanced" [class.warn]="!balanceSheet.isBalanced">
              {{ balanceSheet.isBalanced ? 'Balanced' : 'Check' }}
            </span>
          </header>

          <div class="loading" *ngIf="isLoadingBalance">Loading balance sheet…</div>

          <ng-container *ngIf="!isLoadingBalance && balanceSheet">
            <div class="statement-section">
              <h4>Assets <span>{{ balanceSheet.totalAssets | bdtCurrency }}</span></h4>
              <div class="statement-line" *ngFor="let line of balanceSheet.assets">
                <span class="line-label">
                  <span class="line-code" *ngIf="line.code">{{ line.code }}</span>
                  {{ line.label }}
                  <small *ngIf="line.detail">{{ line.detail }}</small>
                </span>
                <span class="line-amount">{{ line.amount | bdtCurrency }}</span>
              </div>
              <div class="statement-line empty" *ngIf="balanceSheet.assets.length === 0">
                <span class="line-label">No asset accounts yet</span>
                <span class="line-amount">{{ 0 | bdtCurrency }}</span>
              </div>
            </div>

            <div class="statement-section">
              <h4>Liabilities <span>{{ balanceSheet.totalLiabilities | bdtCurrency }}</span></h4>
              <div class="statement-line" *ngFor="let line of balanceSheet.liabilities">
                <span class="line-label">
                  <span class="line-code" *ngIf="line.code">{{ line.code }}</span>
                  {{ line.label }}
                  <small *ngIf="line.detail">{{ line.detail }}</small>
                </span>
                <span class="line-amount">{{ line.amount | bdtCurrency }}</span>
              </div>
              <div class="statement-line empty" *ngIf="balanceSheet.liabilities.length === 0">
                <span class="line-label">No liability accounts</span>
                <span class="line-amount">{{ 0 | bdtCurrency }}</span>
              </div>
            </div>

            <div class="statement-section">
              <h4>Equity <span>{{ balanceSheet.totalEquity | bdtCurrency }}</span></h4>
              <div class="statement-line" *ngFor="let line of balanceSheet.equity">
                <span class="line-label">
                  <span class="line-code" *ngIf="line.code">{{ line.code }}</span>
                  {{ line.label }}
                  <small *ngIf="line.detail">{{ line.detail }}</small>
                </span>
                <span class="line-amount" [class.negative]="line.amount < 0">{{ line.amount | bdtCurrency }}</span>
              </div>
            </div>

            <div class="statement-total">
              <span>Total liabilities &amp; equity</span>
              <strong>{{ balanceSheet.totalLiabilitiesAndEquity | bdtCurrency }}</strong>
            </div>

            <div class="memo-line" *ngIf="balanceSheet.investmentsUnderManagement !== 0">
              <span>
                Investments under management
                <small>Memo only — not included in assets</small>
              </span>
              <strong>{{ balanceSheet.investmentsUnderManagement | bdtCurrency }}</strong>
            </div>
          </ng-container>
        </section>

        <!-- Income statement -->
        <section class="statement-card">
          <header class="statement-card-header">
            <div>
              <h3>Income Statement</h3>
              <span class="as-of">For the selected period</span>
            </div>
          </header>

          <div class="date-controls">
            <label>
              <span>From</span>
              <input type="date" [(ngModel)]="fromDate" (ngModelChange)="loadIncomeStatement()" />
            </label>
            <label>
              <span>To</span>
              <input type="date" [(ngModel)]="toDate" (ngModelChange)="loadIncomeStatement()" />
            </label>
          </div>

          <div class="loading" *ngIf="isLoadingIncome">Loading income statement…</div>

          <ng-container *ngIf="!isLoadingIncome && incomeStatement">
            <div class="statement-section">
              <h4>Income <span>{{ incomeStatement.totalIncome | bdtCurrency }}</span></h4>
              <div class="statement-line" *ngFor="let line of incomeStatement.income">
                <span class="line-label">
                  {{ line.label }}
                  <small *ngIf="line.detail">{{ line.detail }}</small>
                </span>
                <span class="line-amount" [class.negative]="line.amount < 0">{{ line.amount | bdtCurrency }}</span>
              </div>
              <div class="statement-line empty" *ngIf="incomeStatement.income.length === 0">
                <span class="line-label">No income in this period</span>
                <span class="line-amount">{{ 0 | bdtCurrency }}</span>
              </div>
            </div>

            <div class="statement-section">
              <h4>Expenses <span>{{ incomeStatement.totalExpenses | bdtCurrency }}</span></h4>
              <div class="statement-line" *ngFor="let line of incomeStatement.expenses">
                <span class="line-label">
                  {{ line.label }}
                  <small *ngIf="line.detail">{{ line.detail }}</small>
                </span>
                <span class="line-amount negative">{{ line.amount | bdtCurrency }}</span>
              </div>
              <div class="statement-line empty" *ngIf="incomeStatement.expenses.length === 0">
                <span class="line-label">No expenses in this period</span>
                <span class="line-amount">{{ 0 | bdtCurrency }}</span>
              </div>
            </div>

            <div class="statement-total net" [class.loss]="incomeStatement.netIncome < 0">
              <span>{{ incomeStatement.netIncome < 0 ? 'Net loss' : 'Net income' }}</span>
              <strong>{{ incomeStatement.netIncome | bdtCurrency }}</strong>
            </div>
          </ng-container>
        </section>
      </div>

      <p class="statement-note" *ngIf="balanceSheet">{{ balanceSheet.note }}</p>
      <p class="statement-note" *ngIf="incomeStatement">{{ incomeStatement.note }}</p>
    </div>
  `,
  styles: [`
    :host { display: block; margin-top: 24px; }
    .statements-wrapper { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .statements-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .statements-header h2 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px 0; }
    .statements-header p { margin: 0; color: #64748b; font-size: 13px; max-width: 680px; }
    .btn-refresh { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .btn-refresh:hover:not(:disabled) { border-color: #0d9488; color: #0d9488; background: #f0fdfa; }
    .btn-refresh:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-refresh .material-icons { font-size: 17px; }
    .statements-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    .statement-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fcfdff; }
    .statement-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
    .statement-card-header h3 { margin: 0 0 2px 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .as-of { font-size: 12px; color: #94a3b8; }
    .statement-badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .statement-badge.ok { background: #dcfce7; color: #15803d; }
    .statement-badge.warn { background: #fef3c7; color: #b45309; }
    .statement-section { padding: 12px 0; border-top: 1px solid #eef2f7; }
    .statement-section:first-of-type { border-top: none; padding-top: 0; }
    .statement-section h4 { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; }
    .statement-section h4 span { color: #0f172a; font-size: 13px; }
    .statement-line { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 5px 0; font-size: 13px; color: #334155; }
    .statement-line.empty { color: #94a3b8; font-style: italic; }
    .line-label { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .line-label small { color: #94a3b8; font-size: 11px; }
    .line-code { display: inline-block; margin-right: 6px; color: #0d9488; font-size: 11px; font-weight: 700; font-family: monospace; }
    .line-amount { font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .line-amount.negative { color: #dc2626; }
    .statement-total { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; padding-top: 14px; border-top: 2px solid #e2e8f0; font-size: 13px; color: #0f172a; }
    .statement-total strong { font-size: 16px; }
    .statement-total.net { color: #0d9488; }
    .statement-total.net strong { color: #0d9488; }
    .statement-total.net.loss, .statement-total.net.loss strong { color: #dc2626; }
    .memo-line { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: #f0fdfa; border: 1px dashed #99f6e4; font-size: 12px; color: #0f766e; }
    .memo-line span { display: flex; flex-direction: column; gap: 1px; }
    .memo-line small { color: #5eead4; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
    .memo-line strong { white-space: nowrap; font-size: 13px; }
    .date-controls { display: flex; gap: 12px; margin-bottom: 8px; }
    .date-controls label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; }
    .date-controls input { height: 36px; padding: 0 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #0f172a; background: white; outline: none; }
    .date-controls input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12); }
    .loading { padding: 24px 0; text-align: center; color: #94a3b8; font-size: 13px; }
    .statement-note { margin: 14px 0 0 0; padding: 10px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #eef2f7; color: #64748b; font-size: 12px; line-height: 1.5; }

    @media (max-width: 992px) {
      .statements-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 576px) {
      .statements-wrapper { padding: 16px; }
      .statements-header { flex-direction: column; }
      .date-controls { flex-direction: column; }
      .date-controls input { width: 100%; }
    }
  `],
})
export class FinancialStatementsComponent implements OnInit {
  balanceSheet: BalanceSheet | null = null;
  incomeStatement: IncomeStatement | null = null;
  isLoadingBalance = false;
  isLoadingIncome = false;
  fromDate = '';
  toDate = '';

  constructor(
    private accountService: AccountService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const now = new Date();
    this.toDate = now.toISOString().slice(0, 10);
    this.fromDate = `${now.getFullYear()}-01-01`;
    this.loadAll();
  }

  loadAll(): void {
    this.loadBalanceSheet();
    this.loadIncomeStatement();
  }

  loadBalanceSheet(): void {
    this.isLoadingBalance = true;
    this.accountService.getBalanceSheet().subscribe({
      next: (sheet) => {
        this.balanceSheet = sheet;
        this.isLoadingBalance = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingBalance = false;
        this.toastService.error(err.error?.message || 'Could not load the balance sheet.');
        this.cdr.detectChanges();
      },
    });
  }

  loadIncomeStatement(): void {
    this.isLoadingIncome = true;
    this.accountService.getIncomeStatement(
      this.fromDate || undefined,
      this.toDate || undefined
    ).subscribe({
      next: (statement) => {
        this.incomeStatement = statement;
        this.isLoadingIncome = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingIncome = false;
        this.toastService.error(err.error?.message || 'Could not load the income statement.');
        this.cdr.detectChanges();
      },
    });
  }
}
