import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Token } from '../core/services/token';
import * as jsPDF from 'jspdf';
import 'jspdf-autotable';

type ReportType = 'transactions' | 'accounts' | 'investors' | 'contributions' | 'summary';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
  color: string;
  endpoints: {
    data: string;
  };
  columns: ReportColumn[];
}

interface ReportColumn {
  key: string;
  label: string;
  format?: 'currency' | 'date' | 'percentage' | 'number';
}

interface TransactionReport {
  id: string;
  refNo: string;
  transferFor: string;
  amount: number;
  status: string;
  approvalStatus: string;
  accountName: string;
  createdByName: string;
  createdAt: string;
}

interface AccountReport {
  id: string;
  name: string;
  accountType: string;
  balance: number;
  totalFunded: number;
  totalRefunded: number;
  transactionCount: number;
  isActive: boolean;
  createdAt: string;
}

interface InvestorReport {
  id: string;
  name: string;
  email: string;
  phone: string;
  monthlyAmount: number;
  totalContributions: number;
  totalInstallmentsPaid: number;
  sharePercentage: number;
  isActive: boolean;
  joinDate: string;
}

interface SummaryReport {
  totalPoolAmount: number;
  totalMembersCount: number;
  monthlyContributionTotal: number;
  activeInvestmentsCount: number;
  totalReturns: number;
  returnPercentage: number;
  pendingContributions: number;
}

@Component({
  selector: 'app-reports',
  template: `
    <div class="reports-wrapper">
      <!-- Header -->
      <header class="reports-header">
        <div class="header-content">
          <h1><span class="material-icons">assessment</span> Reports & Analytics</h1>
          <p>Generate and download comprehensive reports for your microfund</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="refreshData()">
            <span class="material-icons">refresh</span>
          </button>
        </div>
      </header>

      <!-- Report Type Selection -->
      <section class="report-types-section">
        <h2>Select Report Type</h2>
        <div class="report-types-grid">
          <div 
            *ngFor="let report of reportTypes" 
            class="report-type-card"
            [class.active]="selectedReport?.id === report.id"
            (click)="selectReport(report)">
            <div class="report-icon" [style.background]="report.color">
              <span class="material-icons">{{ report.icon }}</span>
            </div>
            <div class="report-info">
              <h3>{{ report.title }}</h3>
              <p>{{ report.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Filters -->
      <section class="filters-section" *ngIf="selectedReport">
        <div class="filters-header">
          <h3><span class="material-icons">filter_list</span> Report Filters</h3>
        </div>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Date From</label>
            <input type="date" [(ngModel)]="filters.dateFrom" (change)="applyFilters()" />
          </div>
          <div class="filter-group">
            <label>Date To</label>
            <input type="date" [(ngModel)]="filters.dateTo" (change)="applyFilters()" />
          </div>
          <div class="filter-group" *ngIf="selectedReport.id === 'transactions'">
            <label>Status</label>
            <select [(ngModel)]="filters.status" (change)="applyFilters()">
              <option value="">All Status</option>
              <option value="Fund">Fund</option>
              <option value="Refund">Refund</option>
            </select>
          </div>
          <div class="filter-group" *ngIf="selectedReport.id === 'transactions'">
            <label>Approval</label>
            <select [(ngModel)]="filters.approvalStatus" (change)="applyFilters()">
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div class="filter-group" *ngIf="selectedReport.id === 'accounts' || selectedReport.id === 'investors'">
            <label>Status</label>
            <select [(ngModel)]="filters.isActive" (change)="applyFilters()">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Search</label>
            <input type="text" [(ngModel)]="filters.search" (input)="applyFilters()" placeholder="Search..." />
          </div>
        </div>
      </section>

      <!-- Report Preview -->
      <section class="report-preview-section" *ngIf="selectedReport && reportData.length > 0">
        <div class="preview-header">
          <div class="preview-title">
            <h3>{{ selectedReport.title }} Report</h3>
            <span class="record-count">{{ filteredData.length }} records found</span>
          </div>
          <div class="preview-actions">
            <button class="btn-export" (click)="exportToPDF()">
              <span class="material-icons">picture_as_pdf</span>
              Export PDF
            </button>
            <button class="btn-export btn-csv" (click)="exportToCSV()">
              <span class="material-icons">table_chart</span>
              Export CSV
            </button>
            <button class="btn-print" (click)="printReport()">
              <span class="material-icons">print</span>
              Print
            </button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards" *ngIf="summaryData">
          <div class="summary-card" *ngFor="let item of getSummaryItems()">
            <div class="summary-icon" [style.background]="item.color">
              <span class="material-icons">{{ item.icon }}</span>
            </div>
            <div class="summary-info">
              <span class="summary-value">{{ item.value }}</span>
              <span class="summary-label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <div class="table-container">
          <table class="report-table">
            <thead>
              <tr>
                <th *ngFor="let col of selectedReport.columns" (click)="sortBy(col.key)" class="sortable">
                  {{ col.label }}
                  <span class="sort-icon" *ngIf="sortColumn === col.key">
                    {{ sortDirection === 'asc' ? '▲' : '▼' }}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of paginatedData">
                <td *ngFor="let col of selectedReport.columns">
                  <ng-container [ngSwitch]="col.format">
                    <span *ngSwitchCase="'currency'">{{ row[col.key] | currency }}</span>
                    <span *ngSwitchCase="'date'">{{ row[col.key] | date:'mediumDate' }}</span>
                    <span *ngSwitchCase="'percentage'">{{ row[col.key] | number:'1.1-1' }}%</span>
                    <span *ngSwitchCase="'number'">{{ row[col.key] | number }}</span>
                    <span *ngSwitchDefault>{{ row[col.key] }}</span>
                  </ng-container>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <div class="pagination-info">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ currentPage * pageSize }} of {{ filteredData.length }} entries
          </div>
          <div class="pagination-controls">
            <button [disabled]="currentPage === 1" (click)="goToPage(1)">
              <span class="material-icons">first_page</span>
            </button>
            <button [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">
              <span class="material-icons">chevron_left</span>
            </button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">
              <span class="material-icons">chevron_right</span>
            </button>
            <button [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)">
              <span class="material-icons">last_page</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <section class="empty-state" *ngIf="!selectedReport">
        <div class="empty-icon">
          <span class="material-icons">assessment</span>
        </div>
        <h3>Select a Report Type</h3>
        <p>Choose a report type above to generate and view detailed analytics</p>
      </section>

      <!-- No Data State -->
      <section class="empty-state" *ngIf="selectedReport && reportData.length === 0 && !isLoading">
        <div class="empty-icon">
          <span class="material-icons">inbox</span>
        </div>
        <h3>No Data Found</h3>
        <p>No records match your current filters. Try adjusting the date range or search criteria.</p>
      </section>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Generating report...</p>
      </div>
    </div>
  `,
  styles: [`
    .reports-wrapper { max-width: 1600px; margin: 0 auto; position: relative; }
    
    /* Header */
    .reports-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .header-content h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
    .header-content h1 .material-icons { color: #667eea; font-size: 32px; }
    .header-content p { font-size: 14px; color: #666; margin: 0; }
    .btn-refresh { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 12px; cursor: pointer; color: #666; transition: all 0.3s; }
    .btn-refresh:hover { background: #667eea; color: white; border-color: #667eea; }

    /* Report Types */
    .report-types-section { margin-bottom: 32px; }
    .report-types-section h2 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px; }
    .report-types-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .report-type-card { display: flex; gap: 16px; padding: 20px; background: white; border-radius: 16px; border: 2px solid transparent; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .report-type-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    .report-type-card.active { border-color: #667eea; background: linear-gradient(135deg, rgba(102,126,234,0.05), rgba(118,75,162,0.05)); }
    .report-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .report-icon .material-icons { color: white; font-size: 28px; }
    .report-info h3 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px; }
    .report-info p { font-size: 13px; color: #666; margin: 0; line-height: 1.4; }

    /* Filters */
    .filters-section { background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .filters-header { margin-bottom: 20px; }
    .filters-header h3 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .filters-header h3 .material-icons { color: #667eea; }
    .filters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-group label { font-size: 12px; font-weight: 500; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-group input, .filter-group select { padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .filter-group input:focus, .filter-group select:focus { outline: none; border-color: #667eea; }

    /* Report Preview */
    .report-preview-section { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .preview-title h3 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px; }
    .record-count { font-size: 13px; color: #667eea; font-weight: 500; }
    .preview-actions { display: flex; gap: 12px; }
    .btn-export { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; }
    .btn-export:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(231,76,60,0.3); }
    .btn-export.btn-csv { background: linear-gradient(135deg, #27ae60, #2ecc71); }
    .btn-export.btn-csv:hover { box-shadow: 0 4px 12px rgba(39,174,96,0.3); }
    .btn-print { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #f5f6fa; color: #666; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; }
    .btn-print:hover { background: #eee; }

    /* Summary Cards */
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .summary-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: #f8f9fa; border-radius: 12px; }
    .summary-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .summary-icon .material-icons { color: white; font-size: 24px; }
    .summary-info { display: flex; flex-direction: column; }
    .summary-value { font-size: 22px; font-weight: 700; color: #1a1a2e; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Table */
    .table-container { overflow-x: auto; margin-bottom: 20px; }
    .report-table { width: 100%; border-collapse: collapse; }
    .report-table th { text-align: left; padding: 14px 16px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0; white-space: nowrap; }
    .report-table th.sortable { cursor: pointer; user-select: none; }
    .report-table th.sortable:hover { background: #eee; }
    .sort-icon { margin-left: 4px; font-size: 10px; }
    .report-table td { padding: 14px 16px; border-bottom: 1px solid #eee; font-size: 14px; color: #333; }
    .report-table tbody tr:hover { background: #f8f9fa; }

    /* Pagination */
    .pagination { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #eee; }
    .pagination-info { font-size: 13px; color: #666; }
    .pagination-controls { display: flex; align-items: center; gap: 8px; }
    .pagination-controls button { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; color: #666; transition: all 0.2s; display: flex; align-items: center; }
    .pagination-controls button:hover:not(:disabled) { background: #667eea; color: white; border-color: #667eea; }
    .pagination-controls button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination-controls .page-info { padding: 0 16px; font-size: 14px; color: #666; font-weight: 500; }

    /* Empty State */
    .empty-state { text-align: center; padding: 80px 40px; background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .empty-icon { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .empty-icon .material-icons { font-size: 40px; color: white; }
    .empty-state h3 { font-size: 20px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px; }
    .empty-state p { font-size: 14px; color: #666; margin: 0; }

    /* Loading */
    .loading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: 16px; }
    .spinner { width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .loading-overlay p { font-size: 14px; color: #666; }

    .material-icons { font-size: 20px; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class ReportsComponent implements OnInit {
  reportTypes: ReportConfig[] = [
    {
      id: 'summary',
      title: 'Summary Report',
      description: 'Overview of all key metrics and performance indicators',
      icon: 'dashboard',
      color: 'linear-gradient(135deg, #667eea, #764ba2)',
      endpoints: { data: '/api/dashboard' },
      columns: []
    },
    {
      id: 'transactions',
      title: 'Transactions Report',
      description: 'Complete transaction history with status and approval details',
      icon: 'swap_horiz',
      color: 'linear-gradient(135deg, #3498db, #2980b9)',
      endpoints: { data: '/api/transactions' },
      columns: [
        { key: 'refNo', label: 'Ref No' },
        { key: 'accountName', label: 'Account' },
        { key: 'transferFor', label: 'Description' },
        { key: 'amount', label: 'Amount', format: 'currency' },
        { key: 'status', label: 'Type' },
        { key: 'approvalStatus', label: 'Status' },
        { key: 'createdByName', label: 'Created By' },
        { key: 'createdAt', label: 'Date', format: 'date' }
      ]
    },
    {
      id: 'accounts',
      title: 'Accounts Report',
      description: 'All accounts with balances, funded amounts and activity',
      icon: 'account_balance',
      color: 'linear-gradient(135deg, #27ae60, #2ecc71)',
      endpoints: { data: '/api/accounts' },
      columns: [
        { key: 'name', label: 'Account Name' },
        { key: 'accountType', label: 'Type' },
        { key: 'balance', label: 'Balance', format: 'currency' },
        { key: 'totalFunded', label: 'Total Funded', format: 'currency' },
        { key: 'totalRefunded', label: 'Total Refunded', format: 'currency' },
        { key: 'transactionCount', label: 'Transactions', format: 'number' },
        { key: 'isActive', label: 'Status' },
        { key: 'createdAt', label: 'Created', format: 'date' }
      ]
    },
    {
      id: 'investors',
      title: 'Investors Report',
      description: 'List of all investors with their contribution details',
      icon: 'people',
      color: 'linear-gradient(135deg, #e74c3c, #c0392b)',
      endpoints: { data: '/api/members' },
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'monthlyAmount', label: 'Monthly', format: 'currency' },
        { key: 'totalContributions', label: 'Total Contributed', format: 'currency' },
        { key: 'totalInstallmentsPaid', label: 'Installments', format: 'number' },
        { key: 'sharePercentage', label: 'Share %', format: 'percentage' },
        { key: 'isActive', label: 'Status' }
      ]
    },
    {
      id: 'contributions',
      title: 'Contributions Report',
      description: 'Monthly contributions and payment tracking',
      icon: 'payments',
      color: 'linear-gradient(135deg, #f39c12, #e67e22)',
      endpoints: { data: '/api/contributions' },
      columns: [
        { key: 'memberName', label: 'Member' },
        { key: 'amount', label: 'Amount', format: 'currency' },
        { key: 'month', label: 'Month' },
        { key: 'year', label: 'Year' },
        { key: 'status', label: 'Status' },
        { key: 'paidDate', label: 'Paid Date', format: 'date' }
      ]
    }
  ];

  selectedReport: ReportConfig | null = null;
  reportData: any[] = [];
  filteredData: any[] = [];
  summaryData: SummaryReport | null = null;
  isLoading = false;

  filters = {
    dateFrom: '',
    dateTo: '',
    status: '',
    approvalStatus: '',
    isActive: '',
    search: ''
  };

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {}

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize) || 1;
  }

  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredData.slice(start, start + this.pageSize);
  }

  selectReport(report: ReportConfig) {
    this.selectedReport = report;
    this.resetFilters();
    this.loadReportData();
  }

  resetFilters() {
    this.filters = { dateFrom: '', dateTo: '', status: '', approvalStatus: '', isActive: '', search: '' };
    this.currentPage = 1;
    this.sortColumn = '';
    this.sortDirection = 'asc';
  }

  refreshData() {
    if (this.selectedReport) {
      this.loadReportData();
    }
  }

  loadReportData() {
    if (!this.selectedReport) return;
    this.isLoading = true;

    this.http.get<any>(this.selectedReport.endpoints.data).subscribe({
      next: (data) => {
        if (this.selectedReport?.id === 'summary') {
          this.summaryData = data;
        } else {
          this.reportData = Array.isArray(data) ? data : [];
        }
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load report data:', err);
        this.reportData = [];
        this.filteredData = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters() {
    let data = [...this.reportData];

    if (this.filters.search) {
      const term = this.filters.search.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(term)
        )
      );
    }

    if (this.filters.status) {
      data = data.filter(row => row.status === this.filters.status);
    }

    if (this.filters.approvalStatus) {
      data = data.filter(row => row.approvalStatus === this.filters.approvalStatus);
    }

    if (this.filters.isActive !== '') {
      const isActive = this.filters.isActive === 'true';
      data = data.filter(row => row.isActive === isActive);
    }

    if (this.filters.dateFrom) {
      const from = new Date(this.filters.dateFrom);
      data = data.filter(row => new Date(row.createdAt || row.joinDate || row.paidDate) >= from);
    }

    if (this.filters.dateTo) {
      const to = new Date(this.filters.dateTo);
      to.setHours(23, 59, 59);
      data = data.filter(row => new Date(row.createdAt || row.joinDate || row.paidDate) <= to);
    }

    this.filteredData = data;
    this.currentPage = 1;
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredData.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  getSummaryItems(): any[] {
    if (!this.summaryData) return [];
    return [
      { label: 'Total Pool', value: this.formatCurrency(this.summaryData.totalPoolAmount), icon: 'account_balance_wallet', color: '#667eea' },
      { label: 'Members', value: this.summaryData.totalMembersCount.toString(), icon: 'people', color: '#27ae60' },
      { label: 'Monthly Contribution', value: this.formatCurrency(this.summaryData.monthlyContributionTotal), icon: 'payments', color: '#3498db' },
      { label: 'Active Investments', value: this.summaryData.activeInvestmentsCount.toString(), icon: 'trending_up', color: '#f39c12' },
      { label: 'Total Returns', value: this.formatCurrency(this.summaryData.totalReturns), icon: 'show_chart', color: '#e74c3c' },
      { label: 'Return %', value: this.summaryData.returnPercentage.toFixed(1) + '%', icon: 'percent', color: '#9b59b6' }
    ];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  exportToCSV() {
    if (!this.selectedReport || this.filteredData.length === 0) return;

    const headers = this.selectedReport.columns.map(col => col.label);
    const rows = this.filteredData.map(row => 
      this.selectedReport!.columns.map(col => {
        let val = row[col.key];
        if (col.format === 'currency') val = this.formatCurrency(val);
        if (col.format === 'date') val = new Date(val).toLocaleDateString();
        if (col.format === 'percentage') val = val?.toFixed(1) + '%';
        return String(val ?? '');
      })
    );

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.selectedReport.title.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  exportToPDF() {
    if (!this.selectedReport || this.filteredData.length === 0) return;

    const doc = new jsPDF.jsPDF();
    doc.setFontSize(18);
    doc.text(this.selectedReport.title + ' Report', 14, 22);
    doc.setFontSize(10);
    doc.text('Generated: ' + new Date().toLocaleString(), 14, 30);

    const head = [this.selectedReport.columns.map(col => col.label)];
    const body = this.filteredData.map(row => 
      this.selectedReport!.columns.map(col => {
        let val = row[col.key];
        if (col.format === 'currency') val = this.formatCurrency(val);
        if (col.format === 'date') val = new Date(val).toLocaleDateString();
        if (col.format === 'percentage') val = val?.toFixed(1) + '%';
        return String(val ?? '');
      })
    );

    (doc as any).autoTable({ head, body, startY: 38 });
    doc.save(`${this.selectedReport.title.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  printReport() {
    window.print();
  }
}
