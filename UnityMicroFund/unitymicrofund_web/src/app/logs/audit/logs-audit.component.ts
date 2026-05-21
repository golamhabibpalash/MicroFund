import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { LogService } from '../../core/services/log.service';
import { AuditLog, PagedResult } from '../../core/models/log.model';

@Component({
  selector: 'app-logs-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="logs-wrapper">
      <header class="page-header">
        <div class="header-left">
          <h1>Audit Logs</h1>
          <p class="subtitle">Track all entity changes and compliance audit trail</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="refresh()" [disabled]="loading">
            <span class="material-icons" [class.spinning]="loading">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input
            type="text"
            [(ngModel)]="entitySearch"
            (ngModelChange)="onEntitySearch($event)"
            placeholder="Search entity name..."
          />
        </div>

        <select [(ngModel)]="actionFilter" (ngModelChange)="onFilterChange()">
          <option value="">All Actions</option>
          <option value="Create">Create</option>
          <option value="Update">Update</option>
          <option value="Delete">Delete</option>
          <option value="Approve">Approve</option>
        </select>

        <div class="date-range">
          <input type="date" [(ngModel)]="fromDateStr" (ngModelChange)="onDateChange()" title="From date" />
          <span>—</span>
          <input type="date" [(ngModel)]="toDateStr" (ngModelChange)="onDateChange()" title="To date" />
        </div>

        <button class="btn btn-ghost" (click)="clearFilters()" *ngIf="hasFilters()">
          <span class="material-icons">filter_alt_off</span>
          Clear
        </button>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-header-row">
          <span class="result-info" *ngIf="result">
            {{ result.totalCount | number }} records
            <ng-container *ngIf="result.totalPages > 1">
              — page {{ result.page }} of {{ result.totalPages }}
            </ng-container>
          </span>
          <div class="page-size-select">
            <label>Per page:</label>
            <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
              <option [value]="25">25</option>
              <option [value]="50">50</option>
              <option [value]="100">100</option>
            </select>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Entity</th>
                <th>Action</th>
                <th>User</th>
                <th>Description</th>
                <th>IP</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngIf="!loading && logs.length > 0">
                <tr *ngFor="let log of logs" class="log-row" (click)="openDetail(log)">
                  <td class="ts-cell">
                    <span class="date">{{ log.timestamp | date:'MMM d, y' }}</span>
                    <span class="time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                  </td>
                  <td>
                    <span class="entity-badge">{{ log.entityName }}</span>
                  </td>
                  <td>
                    <span class="action-badge" [class]="'action-' + log.action.toLowerCase()">
                      {{ log.action }}
                    </span>
                  </td>
                  <td class="user-cell">
                    <span *ngIf="log.userEmail">{{ log.userEmail }}</span>
                    <span class="empty-cell" *ngIf="!log.userEmail">System</span>
                  </td>
                  <td class="desc-cell" [title]="log.description || ''">
                    {{ (log.description || '—') | slice:0:80 }}{{ (log.description || '').length > 80 ? '…' : '' }}
                  </td>
                  <td class="ip-cell">{{ log.ipAddress || '—' }}</td>
                  <td class="col-actions" (click)="$event.stopPropagation()">
                    <button class="btn-icon" (click)="openDetail(log)" title="View diff">
                      <span class="material-icons">compare_arrows</span>
                    </button>
                  </td>
                </tr>
              </ng-container>

              <tr *ngIf="!loading && logs.length === 0">
                <td colspan="7" class="empty-row">
                  <span class="material-icons">search_off</span>
                  <span>No audit records found</span>
                </td>
              </tr>

              <tr *ngIf="loading">
                <td colspan="7" class="loading-row">
                  <div class="spinner"></div>
                  <span>Loading...</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="result && result.totalPages > 1">
          <button class="page-btn" (click)="goToPage(1)" [disabled]="!result.hasPrevious">
            <span class="material-icons">first_page</span>
          </button>
          <button class="page-btn" (click)="goToPage(result.page - 1)" [disabled]="!result.hasPrevious">
            <span class="material-icons">chevron_left</span>
          </button>
          <button
            *ngFor="let p of getPageNumbers()"
            class="page-btn"
            [class.active]="p === result.page"
            (click)="goToPage(p)">
            {{ p }}
          </button>
          <button class="page-btn" (click)="goToPage(result.page + 1)" [disabled]="!result.hasNext">
            <span class="material-icons">chevron_right</span>
          </button>
          <button class="page-btn" (click)="goToPage(result.totalPages)" [disabled]="!result.hasNext">
            <span class="material-icons">last_page</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Drawer -->
    <div class="drawer-overlay" *ngIf="selectedLog" (click)="closeDetail()">
      <div class="drawer" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <div class="drawer-title">
            <span class="entity-badge">{{ selectedLog.entityName }}</span>
            <span class="action-badge" [class]="'action-' + selectedLog.action.toLowerCase()">
              {{ selectedLog.action }}
            </span>
          </div>
          <button class="btn-icon" (click)="closeDetail()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="drawer-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Record ID</span>
              <span class="detail-value mono">{{ selectedLog.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Timestamp</span>
              <span class="detail-value">{{ selectedLog.timestamp | date:'full' }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.userEmail">
              <span class="detail-label">Changed By</span>
              <span class="detail-value">{{ selectedLog.userEmail }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.ipAddress">
              <span class="detail-label">IP Address</span>
              <span class="detail-value mono">{{ selectedLog.ipAddress }}</span>
            </div>
          </div>

          <div class="detail-section" *ngIf="selectedLog.description">
            <div class="detail-section-title">Description</div>
            <div class="detail-text">{{ selectedLog.description }}</div>
          </div>

          <div class="diff-container" *ngIf="selectedLog.oldValues || selectedLog.newValues">
            <div class="diff-panel old" *ngIf="selectedLog.oldValues">
              <div class="diff-title">
                <span class="material-icons">remove_circle_outline</span>
                Before
              </div>
              <pre class="diff-json">{{ formatJson(selectedLog.oldValues) }}</pre>
            </div>
            <div class="diff-panel new" *ngIf="selectedLog.newValues">
              <div class="diff-title">
                <span class="material-icons">add_circle_outline</span>
                After
              </div>
              <pre class="diff-json">{{ formatJson(selectedLog.newValues) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logs-wrapper { max-width: 1400px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h1 { font-size: 26px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 0; font-size: 14px; }
    .header-actions { display: flex; gap: 8px; }

    .filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border: 1px solid #ddd; border-radius: 8px; background: white; min-width: 240px; }
    .search-box .material-icons { color: #999; font-size: 18px; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 14px; flex: 1; }
    .filter-bar select { padding: 9px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white; outline: none; }
    .date-range { display: flex; align-items: center; gap: 6px; }
    .date-range input { padding: 9px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; }

    .btn { display: flex; align-items: center; gap: 6px; padding: 9px 18px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s; }
    .btn-outline { background: white; color: #667eea; border: 1px solid #667eea; }
    .btn-ghost { background: transparent; color: #666; border: 1px solid #ddd; }
    .btn-icon { padding: 6px; background: transparent; border: none; border-radius: 6px; cursor: pointer; color: #999; display: flex; align-items: center; }
    .btn-icon:hover { background: #f5f6fa; color: #667eea; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #eee; }
    .result-info { font-size: 13px; color: #666; }
    .page-size-select { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #666; }
    .page-size-select select { padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
    .table-scroll { overflow-x: auto; }

    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 12px 14px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    .data-table td { padding: 12px 14px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    .log-row { cursor: pointer; }
    .log-row:hover { background: #f8f9ff; }

    .ts-cell { white-space: nowrap; }
    .ts-cell .date { display: block; color: #444; font-weight: 500; }
    .ts-cell .time { display: block; color: #888; font-size: 12px; font-family: monospace; }

    .entity-badge { background: #e3f2fd; color: #1565c0; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
    .action-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; }
    .action-create { background: #e8f5e9; color: #27ae60; }
    .action-update { background: #fff8e1; color: #f39c12; }
    .action-delete { background: #ffebee; color: #e74c3c; }
    .action-approve { background: #f3e5f5; color: #9b59b6; }

    .user-cell { font-size: 12px; color: #555; }
    .desc-cell { color: #444; max-width: 260px; }
    .ip-cell { font-family: monospace; font-size: 11px; color: #888; }
    .empty-cell { color: #bbb; }
    .col-actions { width: 48px; }

    .empty-row, .loading-row { text-align: center; padding: 48px; color: #aaa; }
    .empty-row .material-icons { font-size: 40px; display: block; margin: 0 auto 8px; }
    .spinner { width: 36px; height: 36px; border: 4px solid #f0f0f0; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 8px; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 4px; padding: 16px; border-top: 1px solid #eee; }
    .page-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; transition: all 0.2s; }
    .page-btn:hover:not(:disabled) { border-color: #667eea; color: #667eea; }
    .page-btn.active { background: #667eea; border-color: #667eea; color: white; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn .material-icons { font-size: 16px; }

    /* Drawer */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; justify-content: flex-end; }
    .drawer { width: 620px; max-width: 95vw; background: white; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.15); }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: white; z-index: 1; gap: 12px; }
    .drawer-title { display: flex; align-items: center; gap: 10px; }
    .drawer-body { padding: 24px; flex: 1; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; }
    .detail-value { font-size: 13px; color: #333; }
    .detail-value.mono { font-family: monospace; font-size: 12px; word-break: break-all; }

    .detail-section { margin-bottom: 20px; }
    .detail-section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 8px; }
    .detail-text { font-size: 14px; color: #333; background: #f8f9fa; padding: 12px 16px; border-radius: 8px; line-height: 1.6; }

    .diff-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .diff-panel { border-radius: 8px; overflow: hidden; }
    .diff-panel.old { border: 1px solid #ffcdd2; }
    .diff-panel.new { border: 1px solid #c8e6c9; }
    .diff-title { display: flex; align-items: center; gap: 6px; padding: 10px 14px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .diff-panel.old .diff-title { background: #ffebee; color: #e74c3c; }
    .diff-panel.new .diff-title { background: #e8f5e9; color: #27ae60; }
    .diff-title .material-icons { font-size: 16px; }
    .diff-json { margin: 0; padding: 14px; font-family: monospace; font-size: 11px; background: #fafafa; white-space: pre-wrap; word-break: break-all; max-height: 400px; overflow-y: auto; }

    @media (max-width: 992px) {
      .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .header-actions { width: 100%; justify-content: stretch; }
    }

    @media (max-width: 768px) {
      .filter-bar { flex-direction: column; align-items: stretch; }
      .search-box { min-width: auto; }
      .filter-bar select { width: 100%; }
      .page-header h1 { font-size: 22px; }
      .diff-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 576px) {
      .page-header h1 { font-size: 20px; }
      .btn { padding: 8px 14px; font-size: 13px; }
      .data-table { font-size: 12px; }
      .data-table th, .data-table td { padding: 8px 10px; }
    }

    @media (max-width: 480px) {
      .data-table th:nth-child(4),
      .data-table td:nth-child(4) { display: none; }
    }
  `]
})
export class LogsAuditComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  result: PagedResult<AuditLog> | null = null;
  loading = false;
  selectedLog: AuditLog | null = null;

  entitySearch = '';
  actionFilter = '';
  fromDateStr = '';
  toDateStr = '';
  page = 1;
  pageSize = 50;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private logService: LogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => { this.page = 1; this.loadLogs(); });

    this.loadLogs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLogs() {
    this.loading = true;
    this.cdr.markForCheck();

    const filter: Record<string, unknown> = { page: this.page, pageSize: this.pageSize };
    if (this.entitySearch) filter['entityName'] = this.entitySearch;
    if (this.actionFilter) filter['action'] = this.actionFilter;
    if (this.fromDateStr) filter['fromDate'] = this.fromDateStr;
    if (this.toDateStr) filter['toDate'] = this.toDateStr + 'T23:59:59';

    this.logService.getAuditLogs(filter).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.result = result;
        this.logs = result.data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  refresh() { this.loadLogs(); }

  onEntitySearch(val: string) { this.entitySearch = val; this.searchSubject.next(val); }
  onFilterChange() { this.page = 1; this.loadLogs(); }
  onDateChange() { this.page = 1; this.loadLogs(); }
  onPageSizeChange() { this.page = 1; this.loadLogs(); }

  clearFilters() {
    this.entitySearch = '';
    this.actionFilter = '';
    this.fromDateStr = '';
    this.toDateStr = '';
    this.page = 1;
    this.loadLogs();
  }

  hasFilters(): boolean {
    return !!(this.entitySearch || this.actionFilter || this.fromDateStr || this.toDateStr);
  }

  goToPage(page: number) { this.page = page; this.loadLogs(); }

  getPageNumbers(): number[] {
    if (!this.result) return [];
    const total = this.result.totalPages;
    const current = this.result.page;
    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    if (end - start < 4) { start = Math.max(1, end - 4); end = Math.min(total, start + 4); }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  openDetail(log: AuditLog) { this.selectedLog = log; this.cdr.markForCheck(); }
  closeDetail() { this.selectedLog = null; this.cdr.markForCheck(); }

  formatJson(value: string | undefined): string {
    if (!value) return '';
    try { return JSON.stringify(JSON.parse(value), null, 2); }
    catch { return value; }
  }
}
