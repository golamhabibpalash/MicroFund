import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  InvestmentService,
  MemberBalance,
  ShareSubscription,
  WalletEntry,
  WalletEntryTypeName,
  WalletSummary,
} from '../core/services/investment.service';
import { UserService } from '../core/services/user';
import { ToastService } from '../core/services/toast.service';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';
import { TimeAgoPipe } from '../shared/pipes/time-ago.pipe';
import { MemberWalletDrawerComponent } from './member-wallet-drawer.component';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, BdtCurrencyPipe, TimeAgoPipe, MemberWalletDrawerComponent],
  template: `
    <div class="wallet-wrapper">
      <div class="page-head">
        <div>
          <h1>Investment Wallet</h1>
          <p class="subtitle">Funds available to subscribe to investment projects</p>
        </div>
        <button class="btn-refresh" (click)="load()" title="Refresh">
          <span class="material-icons">refresh</span>
        </button>
      </div>

      <div *ngIf="isLoading" class="loading"><div class="spinner"></div><p>Loading wallet...</p></div>

      <!-- Admin: every member's balance, with drill-down -->
      <section class="panel" *ngIf="!isLoading && isAdmin && balances.length > 0">
        <div class="panel-head">
          <h2>All Member Wallets</h2>
          <span class="org-total">{{ orgTotal() | bdtCurrency }} across {{ balances.length }} members</span>
        </div>
        <table class="data-table">
          <thead><tr><th>Member</th><th class="right">Balance</th><th class="right">Entries</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let b of balances" [class.selected]="b.memberId === viewingMemberId">
              <td><strong>{{ b.memberName }}</strong></td>
              <td class="right num">{{ b.balance | bdtCurrency }}</td>
              <td class="right">{{ b.entryCount }}</td>
              <td class="right">
                <button class="btn-link" (click)="viewMember(b.memberId)">
                  {{ b.memberId === viewingMemberId ? 'Viewing' : 'View history' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Member detail slides in from the left -->
      <app-member-wallet-drawer
        *ngIf="drawerWallet"
        [wallet]="drawerWallet"
        [subscriptions]="drawerSubscriptions"
        (closed)="closeDrawer()">
      </app-member-wallet-drawer>

      <ng-container *ngIf="!isLoading && wallet">
        <section class="balance-hero">
          <span class="hero-label">Available Balance</span>
          <span class="hero-value">{{ wallet.balance | bdtCurrency }}</span>
          <span class="hero-note" *ngIf="wallet.balance <= 0">
            Add funds through Payments before subscribing to a project.
          </span>
        </section>

        <section class="stat-row">
          <div class="stat">
            <span class="material-icons in">south_west</span>
            <div><span class="s-label">Total Deposited</span><span class="s-value">{{ wallet.totalDeposited | bdtCurrency }}</span></div>
          </div>
          <div class="stat">
            <span class="material-icons out">trending_up</span>
            <div><span class="s-label">Invested</span><span class="s-value">{{ wallet.totalInvested | bdtCurrency }}</span></div>
          </div>
          <div class="stat">
            <span class="material-icons profit">savings</span>
            <div><span class="s-label">Profit Earned</span><span class="s-value">{{ wallet.totalProfitEarned | bdtCurrency }}</span></div>
          </div>
          <div class="stat">
            <span class="material-icons paid">payments</span>
            <div><span class="s-label">Disbursed</span><span class="s-value">{{ wallet.totalDisbursed | bdtCurrency }}</span></div>
          </div>
        </section>

        <section class="panel" *ngIf="subscriptions.length > 0">
          <h2>My Shareholdings</h2>
          <table class="data-table">
            <thead>
              <tr><th>Project</th><th>Shares</th><th>Ownership</th><th>Amount Paid</th><th>Status</th><th>Purchased</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of subscriptions">
                <td><strong>{{ s.investmentName }}</strong></td>
                <td>{{ s.sharesPurchased }}</td>
                <td>{{ s.ownershipPercentage | number: '1.2-2' }}%</td>
                <td class="num">{{ s.amountPaid | bdtCurrency }}</td>
                <td><span class="pill" [ngClass]="'sub-' + s.status.toLowerCase()">{{ s.status }}</span></td>
                <td>{{ s.purchasedAt | date: 'mediumDate' }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2>Transaction History</h2>
            <span class="history-count" *ngIf="wallet.entries.length > 0">
              {{ filteredHistory.length }} of {{ wallet.entries.length }}
            </span>
          </div>

          <p class="empty" *ngIf="wallet.entries.length === 0">No wallet activity yet.</p>

          <div class="history-toolbar" *ngIf="wallet.entries.length > 0">
            <div class="history-search">
              <span class="material-icons">search</span>
              <input type="text" [(ngModel)]="historySearch" (ngModelChange)="applyHistoryFilters()"
                     placeholder="Search description, project or type…" />
              <button type="button" class="clear-btn" *ngIf="historySearch" (click)="historySearch = ''; applyHistoryFilters()">
                <span class="material-icons">close</span>
              </button>
            </div>
            <select [(ngModel)]="historyTypeFilter" (ngModelChange)="applyHistoryFilters()">
              <option value="">All types</option>
              <option *ngFor="let t of historyTypes" [value]="t">{{ label(t) }}</option>
            </select>
            <select [(ngModel)]="historyDirection" (ngModelChange)="applyHistoryFilters()">
              <option value="">Credit &amp; debit</option>
              <option value="credit">Credit only</option>
              <option value="debit">Debit only</option>
            </select>
            <button type="button" class="btn-clear-history"
                    *ngIf="historySearch || historyTypeFilter || historyDirection"
                    (click)="clearHistoryFilters()">
              <span class="material-icons">restart_alt</span> Clear
            </button>
          </div>

          <p class="empty" *ngIf="wallet.entries.length > 0 && filteredHistory.length === 0">
            No transactions match your filters.
          </p>

          <table class="data-table" *ngIf="pagedHistory.length > 0">
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort('date')">
                  When
                  <span class="material-icons sort-icon" *ngIf="historySortColumn === 'date'">
                    {{ historySortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                  </span>
                </th>
                <th>Type</th>
                <th>Details</th>
                <th class="right sortable" (click)="toggleSort('amount')">
                  Amount
                  <span class="material-icons sort-icon" *ngIf="historySortColumn === 'amount'">
                    {{ historySortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                  </span>
                </th>
                <th class="right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of pagedHistory">
                <td [title]="e.createdAt">{{ e.createdAt | timeAgo }}</td>
                <td><span class="pill" [ngClass]="entryClass(e)">{{ label(e.entryType) }}</span></td>
                <td class="details">{{ e.description || e.investmentName || '—' }}</td>
                <td class="num right" [class.credit]="e.amount >= 0" [class.debit]="e.amount < 0">
                  {{ e.amount >= 0 ? '+' : '' }}{{ e.amount | bdtCurrency }}
                </td>
                <td class="num right">{{ e.balanceAfter | bdtCurrency }}</td>
              </tr>
            </tbody>
          </table>

          <div class="history-pagination" *ngIf="filteredHistory.length > 0">
            <div class="page-info">{{ historyRangeLabel() }}</div>
            <div class="pagination-right">
              <div class="page-size-select">
                <label>Rows:</label>
                <select [(ngModel)]="historyPageSize" (ngModelChange)="onHistoryPageSizeChange()">
                  <option [value]="10">10</option>
                  <option [value]="25">25</option>
                  <option [value]="50">50</option>
                </select>
              </div>
              <div class="page-buttons">
                <button class="btn-page" (click)="goHistoryPage(1)" [disabled]="historyPage === 1" title="First">
                  <span class="material-icons">first_page</span>
                </button>
                <button class="btn-page" (click)="goHistoryPage(historyPage - 1)" [disabled]="historyPage === 1" title="Previous">
                  <span class="material-icons">chevron_left</span>
                </button>
                <span class="page-current">{{ historyPage }} / {{ totalHistoryPages }}</span>
                <button class="btn-page" (click)="goHistoryPage(historyPage + 1)" [disabled]="historyPage === totalHistoryPages" title="Next">
                  <span class="material-icons">chevron_right</span>
                </button>
                <button class="btn-page" (click)="goHistoryPage(totalHistoryPages)" [disabled]="historyPage === totalHistoryPages" title="Last">
                  <span class="material-icons">last_page</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </ng-container>

      <div class="empty-state" *ngIf="!isLoading && !wallet && !isAdmin">
        <span class="material-icons">account_balance_wallet</span>
        <h3>No wallet found</h3>
        <p>{{ errorMessage || 'No member profile is linked to your account.' }}</p>
      </div>

      <!-- Admin without a member profile of their own: explain rather than show nothing -->
      <div class="notice" *ngIf="!isLoading && !wallet && isAdmin">
        <span class="material-icons">info</span>
        <div>
          <strong>This administrator account has no member profile</strong>
          <p>
            {{ errorMessage || 'No member profile is linked to this account.' }}
            It therefore has no wallet of its own. Member wallets are listed above &mdash;
            select one to see its full history.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wallet-wrapper { max-width: 1200px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-head h1 { font-size: 24px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .subtitle { color: #666; font-size: 14px; margin: 4px 0 0 0; }
    .btn-refresh { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; color: #666; display: flex; }
    .btn-refresh:hover { background: #f5f6fa; }

    .balance-hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 14px; padding: 28px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px; }
    .hero-label { font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px; }
    .hero-value { font-size: 38px; font-weight: 600; }
    .hero-note { font-size: 13px; opacity: 0.9; }

    .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat { display: flex; align-items: center; gap: 14px; background: white; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat > div { display: flex; flex-direction: column; }
    .s-label { font-size: 13px; color: #666; }
    .s-value { font-size: 18px; font-weight: 600; color: #1a1a2e; }
    .stat .material-icons { padding: 10px; border-radius: 10px; }
    .in { background: #e8f5e9; color: #2e7d32; }
    .out { background: #ede7f6; color: #5e35b1; }
    .profit { background: #fff8e1; color: #f9a825; }
    .paid { background: #e3f2fd; color: #1565c0; }

    .panel { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px; }
    .panel h2 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px 0; }
    .empty { color: #888; font-size: 14px; margin: 0; }

    .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .data-table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #eee; color: #666; font-weight: 500; font-size: 13px; }
    .data-table td { padding: 12px 8px; border-bottom: 1px solid #f2f2f2; color: #333; }
    .data-table .right { text-align: right; }
    .num { font-variant-numeric: tabular-nums; }
    .credit { color: #2e7d32; font-weight: 500; }
    .debit { color: #c62828; font-weight: 500; }
    .details { color: #666; }

    .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .e-deposit { background: #e8f5e9; color: #2e7d32; }
    .e-sharepurchase { background: #ede7f6; color: #5e35b1; }
    .e-purchaserefund { background: #fff3e0; color: #ef6c00; }
    .e-principalreturn { background: #e3f2fd; color: #1565c0; }
    .e-profitcredit { background: #fff8e1; color: #f9a825; }
    .e-disbursement { background: #eceff1; color: #546e7a; }
    .e-withdrawal { background: #fdecea; color: #c62828; }
    .sub-active { background: #e8f5e9; color: #2e7d32; }
    .sub-settled { background: #e3f2fd; color: #1565c0; }
    .sub-cancelled { background: #eceff1; color: #546e7a; }

    .panel-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
    .panel-head h2 { margin: 0; }
    .org-total { font-size: 13px; color: #666; }
    .data-table tr.selected { background: #f5f3ff; }
    .btn-link { background: none; border: none; color: #667eea; cursor: pointer; font-size: 13px; font-weight: 500; padding: 0; }
    .data-table tr:hover { background: #fafaff; }

    /* Transaction History: toolbar, sorting, pagination */
    .history-count { font-size: 12.5px; color: #888; }
    .history-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px; background: #f9f9fc; border: 1px solid #eee; border-radius: 10px; }
    .history-search { display: flex; align-items: center; gap: 6px; padding: 0 10px; background: white; border: 1px solid #ddd; border-radius: 8px; min-height: 36px; flex: 1 1 220px; max-width: 320px; }
    .history-search:focus-within { border-color: #667eea; box-shadow: 0 0 0 2px rgba(102,126,234,0.15); }
    .history-search .material-icons { font-size: 18px; color: #999; }
    .history-search input { border: none; background: transparent; outline: none; font-size: 13.5px; width: 100%; }
    .history-search .clear-btn { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border: none; border-radius: 50%; background: #eee; color: #777; cursor: pointer; flex-shrink: 0; }
    .history-search .clear-btn .material-icons { font-size: 12px; color: inherit; }
    .history-toolbar select { min-height: 36px; padding: 0 10px; border: 1px solid #ddd; border-radius: 8px; background: white; font-size: 13px; color: #444; cursor: pointer; }
    .history-toolbar select:focus { outline: none; border-color: #667eea; }
    .btn-clear-history { display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 0 10px; background: transparent; border: 1px solid transparent; border-radius: 8px; color: #c62828; font-size: 13px; font-weight: 500; cursor: pointer; }
    .btn-clear-history:hover { background: #fdecea; border-color: #f5c6c0; }
    .btn-clear-history .material-icons { font-size: 15px; }

    .data-table th.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
    .data-table th.sortable:hover { color: #667eea; }
    .sort-icon { font-size: 13px !important; vertical-align: middle; margin-left: 2px; }

    .history-pagination { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
    .history-pagination .page-info { font-size: 12.5px; color: #888; }
    .pagination-right { display: flex; align-items: center; gap: 16px; }
    .page-size-select { display: flex; align-items: center; gap: 6px; }
    .page-size-select label { font-size: 12.5px; color: #888; }
    .page-size-select select { padding: 3px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12.5px; color: #444; }
    .page-buttons { display: flex; align-items: center; gap: 4px; }
    .page-current { font-size: 13px; color: #444; padding: 0 6px; font-variant-numeric: tabular-nums; }
    .btn-page { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: transparent; border: 1px solid transparent; border-radius: 6px; color: #555; cursor: pointer; }
    .btn-page:hover:not(:disabled) { background: #f0f0f5; border-color: #ddd; }
    .btn-page:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn-page .material-icons { font-size: 17px; }
    .notice { display: flex; gap: 14px; background: #fffdf5; border: 1px solid #f0e0b0; border-radius: 12px; padding: 18px; }
    .notice .material-icons { color: #f9a825; }
    .notice strong { display: block; color: #1a1a2e; margin-bottom: 4px; font-size: 14px; }
    .notice p { margin: 0; color: #666; font-size: 13px; line-height: 1.5; }

    .loading, .empty-state { text-align: center; padding: 60px 20px; color: #666; }
    .empty-state .material-icons { font-size: 56px; color: #ccc; }
    .spinner { width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #667eea; border-radius: 50%; margin: 0 auto 12px; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 900px) { .stat-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .stat-row { grid-template-columns: 1fr; } .hero-value { font-size: 30px; } }
  `]
})
export class WalletComponent implements OnInit, OnDestroy {
  wallet: WalletSummary | null = null;
  subscriptions: ShareSubscription[] = [];
  balances: MemberBalance[] = [];
  isAdmin = false;

  /** Set when an admin is viewing someone else's wallet rather than their own. */
  viewingMemberId: string | null = null;

  /** Populated only while the drawer is open. */
  drawerWallet: WalletSummary | null = null;
  drawerSubscriptions: ShareSubscription[] = [];

  isLoading = false;
  errorMessage = '';

  // Transaction History: search / filter / sort / pagination (all client-side —
  // the full entry list is already loaded, so every change applies instantly).
  historySearch = '';
  historyTypeFilter: WalletEntryTypeName | '' = '';
  historyDirection: '' | 'credit' | 'debit' = '';
  historySortColumn: 'date' | 'amount' = 'date';
  historySortDirection: 'asc' | 'desc' = 'desc';
  historyPage = 1;
  historyPageSize = 10;
  filteredHistory: WalletEntry[] = [];
  pagedHistory: WalletEntry[] = [];
  totalHistoryPages = 1;

  private destroy$ = new Subject<void>();

  constructor(
    private investmentService: InvestmentService,
    private userService: UserService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const role = this.userService.getRole();
    this.isAdmin = role === 'Admin' || role === 'Manager';
    this.load();
  }

  orgTotal(): number {
    return this.balances.reduce((sum, b) => sum + b.balance, 0);
  }

  /** Admin drill-down: opens the slide-in drawer for one member. */
  viewMember(memberId: string): void {
    this.viewingMemberId = memberId;
    this.investmentService
      .getMemberWallet(memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: w => {
          this.drawerWallet = w;
          this.cdr.detectChanges();
        },
        error: err => {
          this.viewingMemberId = null;
          this.toast.error(err?.error?.message || 'Could not load that wallet.');
        },
      });
  }

  closeDrawer(): void {
    this.drawerWallet = null;
    this.drawerSubscriptions = [];
    this.viewingMemberId = null;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.viewingMemberId = null;

    if (this.isAdmin) {
      this.investmentService
        .getAllBalances()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: b => {
            this.balances = b;
            this.cdr.detectChanges();
          },
          error: () => (this.balances = []),
        });
    }

    this.investmentService
      .getMyWallet()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: w => {
          this.wallet = w;
          this.isLoading = false;
          this.applyHistoryFilters();
          this.cdr.detectChanges();
        },
        error: err => {
          this.wallet = null;
          this.errorMessage = err?.error?.message ?? '';
          this.isLoading = false;
          this.applyHistoryFilters();
          this.cdr.detectChanges();
        },
      });

    this.investmentService
      .getMySubscriptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: s => {
          this.subscriptions = s;
          this.cdr.detectChanges();
        },
        // Holdings are supplementary; a failure here should not blank the wallet.
        error: () => (this.subscriptions = []),
      });
  }

  entryClass(entry: WalletEntry): string {
    return 'e-' + entry.entryType.toLowerCase();
  }

  label(type: string): string {
    return type.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  /** Every entry type that actually occurs in this wallet's history, for the filter dropdown. */
  get historyTypes(): WalletEntryTypeName[] {
    const types = new Set((this.wallet?.entries ?? []).map(e => e.entryType));
    return Array.from(types).sort();
  }

  toggleSort(column: 'date' | 'amount'): void {
    if (this.historySortColumn === column) {
      this.historySortDirection = this.historySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.historySortColumn = column;
      this.historySortDirection = column === 'date' ? 'desc' : 'desc';
    }
    this.applyHistoryFilters();
  }

  clearHistoryFilters(): void {
    this.historySearch = '';
    this.historyTypeFilter = '';
    this.historyDirection = '';
    this.applyHistoryFilters();
  }

  onHistoryPageSizeChange(): void {
    this.historyPage = 1;
    this.updatePagedHistory();
  }

  goHistoryPage(page: number): void {
    if (page < 1 || page > this.totalHistoryPages) return;
    this.historyPage = page;
    this.updatePagedHistory();
  }

  historyRangeLabel(): string {
    if (this.filteredHistory.length === 0) return 'No transactions';
    const start = (this.historyPage - 1) * this.historyPageSize + 1;
    const end = Math.min(this.historyPage * this.historyPageSize, this.filteredHistory.length);
    return `Showing ${start}–${end} of ${this.filteredHistory.length}`;
  }

  /** Live search + filter + sort — recomputed on every keystroke/selection, then re-paginated. */
  applyHistoryFilters(): void {
    let result = [...(this.wallet?.entries ?? [])];

    if (this.historySearch.trim()) {
      const term = this.historySearch.trim().toLowerCase();
      result = result.filter(e =>
        (e.description && e.description.toLowerCase().includes(term)) ||
        (e.investmentName && e.investmentName.toLowerCase().includes(term)) ||
        this.label(e.entryType).toLowerCase().includes(term)
      );
    }

    if (this.historyTypeFilter) {
      result = result.filter(e => e.entryType === this.historyTypeFilter);
    }

    if (this.historyDirection === 'credit') {
      result = result.filter(e => e.amount >= 0);
    } else if (this.historyDirection === 'debit') {
      result = result.filter(e => e.amount < 0);
    }

    result.sort((a, b) => {
      const dir = this.historySortDirection === 'asc' ? 1 : -1;
      if (this.historySortColumn === 'amount') {
        return (a.amount - b.amount) * dir;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });

    this.filteredHistory = result;
    this.historyPage = 1;
    this.updatePagedHistory();
  }

  private updatePagedHistory(): void {
    this.totalHistoryPages = Math.max(1, Math.ceil(this.filteredHistory.length / this.historyPageSize));
    if (this.historyPage > this.totalHistoryPages) this.historyPage = this.totalHistoryPages;
    const start = (this.historyPage - 1) * this.historyPageSize;
    this.pagedHistory = this.filteredHistory.slice(start, start + this.historyPageSize);
  }
}
