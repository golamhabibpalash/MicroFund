import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { LogService } from '../../core/services/log.service';
import { LogEntry, LogFilter, PagedResult, LogStats } from '../../core/models/log.model';

type LogLevel = 'Error' | 'Warning' | 'Info' | 'Debug' | 'Audit' | '';

@Component({
  selector: 'app-logs-activity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="logs-wrapper">
      <header class="page-header">
        <div class="header-left">
          <h1>Application Logs</h1>
          <p class="subtitle">Search, filter, and inspect system log entries</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="refresh()" [disabled]="loading">
            <span class="material-icons" [class.spinning]="loading">refresh</span>
            Refresh
          </button>
          <button class="btn btn-primary" (click)="exportCsv()">
            <span class="material-icons">download</span>
            Export CSV
          </button>
        </div>
      </header>

      <!-- Stats Row -->
      <div class="stats-row" *ngIf="stats">
        <div class="stat-chip error"   (click)="setLevelFilter('Error')"   [class.active]="filter.logLevel === 'Error'">
          <span class="material-icons">error</span>
          <span class="count">{{ stats.byLevel['Error'] || 0 }}</span>
          <span class="label">Errors</span>
        </div>
        <div class="stat-chip warning" (click)="setLevelFilter('Warning')" [class.active]="filter.logLevel === 'Warning'">
          <span class="material-icons">warning</span>
          <span class="count">{{ stats.byLevel['Warning'] || 0 }}</span>
          <span class="label">Warnings</span>
        </div>
        <div class="stat-chip info"    (click)="setLevelFilter('Info')"    [class.active]="filter.logLevel === 'Info'">
          <span class="material-icons">info</span>
          <span class="count">{{ stats.byLevel['Info'] || 0 }}</span>
          <span class="label">Info</span>
        </div>
        <div class="stat-chip audit"   (click)="setLevelFilter('Audit')"   [class.active]="filter.logLevel === 'Audit'">
          <span class="material-icons">fact_check</span>
          <span class="count">{{ stats.byLevel['Audit'] || 0 }}</span>
          <span class="label">Audit</span>
        </div>
        <div class="stat-chip total"   (click)="setLevelFilter('')"        [class.active]="!filter.logLevel">
          <span class="material-icons">list_alt</span>
          <span class="count">{{ stats.totalCount }}</span>
          <span class="label">Total (7d)</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search message, action, email..."
          />
          <button class="clear-btn" *ngIf="searchTerm" (click)="clearSearch()">
            <span class="material-icons">close</span>
          </button>
        </div>

        <select [(ngModel)]="filter.logLevel" (ngModelChange)="onFilterChange()">
          <option value="">All Levels</option>
          <option value="Error">Error</option>
          <option value="Warning">Warning</option>
          <option value="Info">Info</option>
          <option value="Debug">Debug</option>
          <option value="Audit">Audit</option>
        </select>

        <input
          type="text"
          [(ngModel)]="filter.module"
          (ngModelChange)="onFilterChange()"
          placeholder="Module..."
          class="module-input"
        />

        <div class="date-range">
          <input type="date" [(ngModel)]="fromDateStr" (ngModelChange)="onDateChange()" title="From date" />
          <span class="date-sep">—</span>
          <input type="date" [(ngModel)]="toDateStr" (ngModelChange)="onDateChange()" title="To date" />
        </div>

        <button class="btn btn-ghost" (click)="clearFilters()" *ngIf="hasActiveFilters()">
          <span class="material-icons">filter_alt_off</span>
          Clear
        </button>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-header-row">
          <span class="result-info" *ngIf="result">
            {{ result.totalCount | number }} entries
            <ng-container *ngIf="result.totalPages > 1">
              — page {{ result.page }} of {{ result.totalPages }}
            </ng-container>
          </span>
          <div class="page-size-select">
            <label>Per page:</label>
            <select [(ngModel)]="filter.pageSize" (ngModelChange)="onPageSizeChange()">
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
                <th class="sortable" (click)="sort('Timestamp')">
                  Timestamp <span class="sort-icon">{{ getSortIcon('Timestamp') }}</span>
                </th>
                <th class="sortable" (click)="sort('LogLevel')">
                  Level <span class="sort-icon">{{ getSortIcon('LogLevel') }}</span>
                </th>
                <th class="sortable" (click)="sort('Module')">
                  Module <span class="sort-icon">{{ getSortIcon('Module') }}</span>
                </th>
                <th class="sortable" (click)="sort('Action')">
                  Action <span class="sort-icon">{{ getSortIcon('Action') }}</span>
                </th>
                <th>Message</th>
                <th>User</th>
                <th>IP</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngIf="!loading && logs.length > 0">
                <tr *ngFor="let log of logs" (click)="openDetail(log)" class="log-row" [class]="'level-row-' + log.logLevel.toLowerCase()">
                  <td class="ts-cell">
                    <span class="date">{{ log.timestamp | date:'MMM d, y' }}</span>
                    <span class="time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                  </td>
                  <td>
                    <span class="level-badge" [class]="'level-' + log.logLevel.toLowerCase()">
                      <span class="material-icons">{{ levelIcon(log.logLevel) }}</span>
                      {{ log.logLevel }}
                    </span>
                  </td>
                  <td>
                    <span class="module-tag" *ngIf="log.module">{{ log.module }}</span>
                    <span class="sub-tag" *ngIf="log.subModule">/ {{ log.subModule }}</span>
                    <span class="empty-cell" *ngIf="!log.module">—</span>
                  </td>
                  <td class="action-cell" [title]="log.action">{{ log.action }}</td>
                  <td class="msg-cell" [title]="log.message">{{ log.message | slice:0:80 }}{{ log.message.length > 80 ? '…' : '' }}</td>
                  <td class="user-cell">
                    <span *ngIf="log.userEmail">{{ log.userEmail }}</span>
                    <span class="empty-cell" *ngIf="!log.userEmail">System</span>
                  </td>
                  <td class="ip-cell">{{ log.ipAddress || '—' }}</td>
                  <td class="col-actions" (click)="$event.stopPropagation()">
                    <button class="btn-icon" (click)="openDetail(log)" title="View details">
                      <span class="material-icons">open_in_new</span>
                    </button>
                  </td>
                </tr>
              </ng-container>

              <tr *ngIf="!loading && logs.length === 0">
                <td colspan="8" class="empty-row">
                  <span class="material-icons">search_off</span>
                  <span>No log entries found</span>
                </td>
              </tr>

              <tr *ngIf="loading">
                <td colspan="8" class="loading-row">
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
            <span class="level-badge" [class]="'level-' + selectedLog.logLevel.toLowerCase()">
              <span class="material-icons">{{ levelIcon(selectedLog.logLevel) }}</span>
              {{ selectedLog.logLevel }}
            </span>
            <span class="action-label">{{ selectedLog.action }}</span>
          </div>
          <button class="btn-icon" (click)="closeDetail()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="drawer-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Log ID</span>
              <span class="detail-value mono">{{ selectedLog.logId }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Timestamp</span>
              <span class="detail-value">{{ selectedLog.timestamp | date:'full' }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.userEmail">
              <span class="detail-label">User</span>
              <span class="detail-value">{{ selectedLog.userEmail }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.module">
              <span class="detail-label">Module</span>
              <span class="detail-value">{{ selectedLog.module }}{{ selectedLog.subModule ? ' / ' + selectedLog.subModule : '' }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.ipAddress">
              <span class="detail-label">IP Address</span>
              <span class="detail-value mono">{{ selectedLog.ipAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.correlationId">
              <span class="detail-label">Correlation ID</span>
              <span class="detail-value mono">{{ selectedLog.correlationId }}</span>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Message</div>
            <div class="detail-text">{{ selectedLog.message }}</div>
          </div>

          <div class="detail-section" *ngIf="selectedLog.exception">
            <div class="detail-section-title error-title">
              <span class="material-icons">error_outline</span>
              Exception
            </div>
            <pre class="exception-text">{{ selectedLog.exception }}</pre>
          </div>

          <div class="detail-section" *ngIf="selectedLog.additionalData">
            <div class="detail-section-title">Additional Data</div>
            <pre class="json-text">{{ formatJson(selectedLog.additionalData) }}</pre>
          </div>

          <div class="detail-section" *ngIf="selectedLog.userAgent">
            <div class="detail-section-title">User Agent</div>
            <div class="detail-text small">{{ selectedLog.userAgent }}</div>
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

    /* Stats Row */
    .stats-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat-chip { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; cursor: pointer; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 2px solid transparent; transition: all 0.2s; }
    .stat-chip:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .stat-chip.active { border-color: currentColor; }
    .stat-chip .count { font-size: 20px; font-weight: 700; }
    .stat-chip .label { font-size: 12px; color: #888; font-weight: 500; }
    .stat-chip.error   { color: #e74c3c; } .stat-chip.error.active   { background: #ffebee; }
    .stat-chip.warning { color: #f39c12; } .stat-chip.warning.active { background: #fff8e1; }
    .stat-chip.info    { color: #3498db; } .stat-chip.info.active    { background: #e3f2fd; }
    .stat-chip.audit   { color: #9b59b6; } .stat-chip.audit.active   { background: #f3e5f5; }
    .stat-chip.total   { color: #667eea; } .stat-chip.total.active   { background: #ede9fe; }
    .stat-chip .material-icons { font-size: 18px; }

    /* Filter Bar */
    .filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border: 1px solid #ddd; border-radius: 8px; background: white; min-width: 280px; flex: 1; }
    .search-box .material-icons { color: #999; font-size: 18px; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 14px; flex: 1; }
    .clear-btn { background: none; border: none; cursor: pointer; color: #999; padding: 0; display: flex; }
    .filter-bar select, .filter-bar .module-input { padding: 9px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white; outline: none; }
    .filter-bar select:focus, .filter-bar .module-input:focus { border-color: #667eea; }
    .module-input { width: 140px; }
    .date-range { display: flex; align-items: center; gap: 6px; }
    .date-range input { padding: 9px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; }
    .date-sep { color: #999; font-size: 12px; }

    /* Buttons */
    .btn { display: flex; align-items: center; gap: 6px; padding: 9px 18px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
    .btn-outline { background: white; color: #667eea; border: 1px solid #667eea; }
    .btn-ghost { background: transparent; color: #666; border: 1px solid #ddd; }
    .btn-icon { padding: 6px; background: transparent; border: none; border-radius: 6px; cursor: pointer; color: #999; display: flex; align-items: center; transition: all 0.2s; }
    .btn-icon:hover { background: #f5f6fa; color: #667eea; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Table Card */
    .table-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #eee; }
    .result-info { font-size: 13px; color: #666; }
    .page-size-select { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #666; }
    .page-size-select select { padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
    .table-scroll { overflow-x: auto; }

    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 12px 14px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    .data-table th.sortable { cursor: pointer; user-select: none; }
    .data-table th.sortable:hover { background: #eef0f5; }
    .sort-icon { font-size: 12px; opacity: 0.5; }
    .data-table td { padding: 12px 14px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    .log-row { cursor: pointer; transition: background 0.1s; }
    .log-row:hover { background: #f8f9ff; }
    .level-row-error   { border-left: 3px solid #e74c3c; }
    .level-row-warning { border-left: 3px solid #f39c12; }

    .ts-cell { white-space: nowrap; }
    .ts-cell .date { display: block; color: #444; font-weight: 500; }
    .ts-cell .time { display: block; color: #888; font-size: 12px; font-family: monospace; }

    .level-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .level-badge .material-icons { font-size: 13px; }
    .level-error   { background: #ffebee; color: #e74c3c; }
    .level-warning { background: #fff8e1; color: #f39c12; }
    .level-info    { background: #e3f2fd; color: #2196f3; }
    .level-debug   { background: #f5f5f5; color: #757575; }
    .level-audit   { background: #f3e5f5; color: #9b59b6; }

    .module-tag { font-size: 12px; font-weight: 500; color: #667eea; background: #ede9fe; padding: 2px 8px; border-radius: 10px; }
    .sub-tag { font-size: 11px; color: #888; }
    .empty-cell { color: #bbb; }
    .action-cell { font-family: monospace; font-size: 12px; color: #444; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .msg-cell { color: #333; max-width: 300px; }
    .user-cell { font-size: 12px; color: #555; }
    .ip-cell { font-family: monospace; font-size: 11px; color: #888; }
    .col-actions { width: 48px; }

    .empty-row, .loading-row { text-align: center; padding: 48px; color: #aaa; }
    .empty-row .material-icons, .loading-row .material-icons { font-size: 40px; display: block; margin: 0 auto 8px; }
    .empty-row { display: table-cell; }
    .loading-row { display: table-cell; vertical-align: middle; }
    .spinner { width: 36px; height: 36px; border: 4px solid #f0f0f0; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 8px; }

    /* Pagination */
    .pagination { display: flex; justify-content: center; align-items: center; gap: 4px; padding: 16px; border-top: 1px solid #eee; }
    .page-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; transition: all 0.2s; }
    .page-btn:hover:not(:disabled) { border-color: #667eea; color: #667eea; }
    .page-btn.active { background: #667eea; border-color: #667eea; color: white; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn .material-icons { font-size: 16px; }

    /* Detail Drawer */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; justify-content: flex-end; }
    .drawer { width: 560px; max-width: 95vw; background: white; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.15); }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: white; z-index: 1; }
    .drawer-title { display: flex; align-items: center; gap: 12px; }
    .action-label { font-weight: 600; color: #1a1a2e; font-family: monospace; }
    .drawer-body { padding: 24px; flex: 1; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; }
    .detail-value { font-size: 13px; color: #333; }
    .detail-value.mono { font-family: monospace; font-size: 12px; word-break: break-all; }

    .detail-section { margin-bottom: 20px; }
    .detail-section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .detail-section-title.error-title { color: #e74c3c; }
    .detail-section-title .material-icons { font-size: 16px; }
    .detail-text { font-size: 14px; color: #333; line-height: 1.6; background: #f8f9fa; padding: 12px 16px; border-radius: 8px; }
    .detail-text.small { font-size: 12px; word-break: break-all; }
    .exception-text { font-family: monospace; font-size: 11px; background: #2d2d2d; color: #f8f8f2; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; }
    .json-text { font-family: monospace; font-size: 12px; background: #f8f9fa; padding: 12px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }
  `]
})
export class LogsActivityComponent implements OnInit, OnDestroy {
  logs: LogEntry[] = [];
  result: PagedResult<LogEntry> | null = null;
  stats: LogStats | null = null;
  loading = false;
  selectedLog: LogEntry | null = null;

  searchTerm = '';
  fromDateStr = '';
  toDateStr = '';

  filter: LogFilter = {
    page: 1,
    pageSize: 50,
    sortBy: 'Timestamp',
    sortDescending: true
  };

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
    ).subscribe(term => {
      this.filter.search = term || undefined;
      this.filter.page = 1;
      this.loadLogs();
    });

    this.loadStats();
    this.loadLogs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLogs() {
    this.loading = true;
    this.cdr.markForCheck();

    this.logService.getLogs(this.filter).pipe(takeUntil(this.destroy$)).subscribe({
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

  loadStats() {
    this.logService.getStats(7).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.stats = s; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  refresh() {
    this.loadStats();
    this.loadLogs();
  }

  onSearchChange(term: string) {
    this.searchSubject.next(term);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  onFilterChange() {
    this.filter.page = 1;
    this.loadLogs();
  }

  onDateChange() {
    this.filter.fromDate = this.fromDateStr || undefined;
    this.filter.toDate = this.toDateStr ? this.toDateStr + 'T23:59:59' : undefined;
    this.filter.page = 1;
    this.loadLogs();
  }

  onPageSizeChange() {
    this.filter.page = 1;
    this.loadLogs();
  }

  setLevelFilter(level: string) {
    this.filter.logLevel = level || undefined;
    this.filter.page = 1;
    this.loadLogs();
  }

  clearFilters() {
    this.searchTerm = '';
    this.fromDateStr = '';
    this.toDateStr = '';
    this.filter = { page: 1, pageSize: this.filter.pageSize, sortBy: 'Timestamp', sortDescending: true };
    this.loadLogs();
  }

  hasActiveFilters(): boolean {
    return !!(this.filter.logLevel || this.filter.module || this.filter.search ||
              this.filter.fromDate || this.filter.toDate);
  }

  sort(field: string) {
    if (this.filter.sortBy === field) {
      this.filter.sortDescending = !this.filter.sortDescending;
    } else {
      this.filter.sortBy = field;
      this.filter.sortDescending = true;
    }
    this.filter.page = 1;
    this.loadLogs();
  }

  getSortIcon(field: string): string {
    if (this.filter.sortBy !== field) return '↕';
    return this.filter.sortDescending ? '↓' : '↑';
  }

  goToPage(page: number) {
    this.filter.page = page;
    this.loadLogs();
  }

  getPageNumbers(): number[] {
    if (!this.result) return [];
    const total = this.result.totalPages;
    const current = this.result.page;
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
      end = Math.min(total, start + 4);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  openDetail(log: LogEntry) {
    this.selectedLog = log;
    this.cdr.markForCheck();
  }

  closeDetail() {
    this.selectedLog = null;
    this.cdr.markForCheck();
  }

  exportCsv() {
    const url = this.logService.getExportUrl(this.filter);
    window.open(url, '_blank');
  }

  levelIcon(level: string): string {
    const icons: Record<string, string> = {
      Error: 'error',
      Warning: 'warning',
      Info: 'info',
      Debug: 'bug_report',
      Audit: 'fact_check'
    };
    return icons[level] ?? 'circle';
  }

  formatJson(value: string): string {
    try { return JSON.stringify(JSON.parse(value), null, 2); }
    catch { return value; }
  }
}
