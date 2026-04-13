import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Token } from '../core/services/token';
import { ChangeDetectorRef } from '@angular/core';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  monthlyAmount: number;
  joinDate: string;
  isActive: boolean;
  totalContributions: number;
  totalInstallmentsPaid: number;
  currentShareValue: number;
  sharePercentage: number;
}

@Component({
  selector: 'app-investors',
  template: `
    <div class="investors-wrapper">
      <!-- Top Header -->
      <header class="top-header">
        <div class="header-left">
          <h1>Investors</h1>
          <button class="btn-refresh" (click)="loadMembers()" title="Refresh">
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
        <div class="search-box">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="filterMembers()"
            placeholder="Search by name or email..."
            class="search-input" />
          <span class="material-icons">search</span>
        </div>
      </header>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #667eea;">
            <span class="material-icons">people</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ members.length }}</span>
            <span class="stat-label">Total Investors</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #27ae60;">
            <span class="material-icons">check_circle</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ activeMembers }}</span>
            <span class="stat-label">Active Members</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #f39c12;">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalContributions | currency }}</span>
            <span class="stat-label">Total Contributions</span>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="alert alert-error">
        {{ errorMessage }}
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
      </div>

      <!-- Table View -->
      <div class="content-section" *ngIf="!isLoading && viewMode === 'table'">
        <div class="table-container">
          <table class="investors-table">
            <thead>
              <tr>
                <th>Investor</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Monthly Amount</th>
                <th>Contributions</th>
                <th>Installments</th>
                <th>Share %</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let member of filteredMembers">
                <td class="investor-cell">
                  <div class="investor-avatar">{{ getInitials(member.name) }}</div>
                  <strong>{{ member.name }}</strong>
                </td>
                <td>{{ member.email }}</td>
                <td>{{ member.phone }}</td>
                <td class="amount">{{ member.monthlyAmount | currency }}</td>
                <td class="contributions">{{ member.totalContributions | currency }}</td>
                <td>{{ member.totalInstallmentsPaid }}</td>
                <td class="share">{{ member.sharePercentage | number:'1.1-1' }}%</td>
                <td>
                  <span class="status-badge" [class.active]="member.isActive" [class.inactive]="!member.isActive">
                    {{ member.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="date">{{ member.joinDate | date:'mediumDate' }}</td>
              </tr>
              <tr *ngIf="filteredMembers.length === 0">
                <td colspan="9" class="empty-row">
                  <span class="material-icons">people</span>
                  <span>No investors found</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Card View -->
      <div class="members-grid" *ngIf="!isLoading && viewMode === 'card'">
        <div class="member-card" *ngFor="let member of filteredMembers">
          <div class="card-header">
            <div class="member-avatar-large">{{ getInitials(member.name) }}</div>
            <span class="status-badge" [class.active]="member.isActive" [class.inactive]="!member.isActive">
              {{ member.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="member-info">
            <h3>{{ member.name }}</h3>
            <p class="email"><span class="material-icons">email</span> {{ member.email }}</p>
            <p class="phone"><span class="material-icons">phone</span> {{ member.phone }}</p>
          </div>
          <div class="member-stats">
            <div class="stat">
              <span class="stat-label">Monthly</span>
              <span class="stat-value">{{ member.monthlyAmount | currency }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Contributed</span>
              <span class="stat-value">{{ member.totalContributions | currency }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Installments</span>
              <span class="stat-value">{{ member.totalInstallmentsPaid }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Share %</span>
              <span class="stat-value">{{ member.sharePercentage | number:'1.1-1' }}%</span>
            </div>
          </div>
          <div class="member-footer">
            <span class="join-date">Since {{ member.joinDate | date:'MMM yyyy' }}</span>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredMembers.length === 0">
          <span class="material-icons">people</span>
          <h3>No Investors Found</h3>
          <p>There are no investors matching your search.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .investors-wrapper { max-width: 1400px; }
    .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .btn-refresh { background: #f5f6fa; border: 1px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; color: #666; }
    .btn-refresh:hover { background: #eee; color: #667eea; }
    .view-toggle { display: flex; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .view-toggle button { background: white; border: none; padding: 8px 12px; cursor: pointer; color: #666; }
    .view-toggle button:hover { background: #f5f6fa; }
    .view-toggle button.active { background: #667eea; color: white; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid #ddd; border-radius: 8px; background: white; }
    .search-box .material-icons { color: #999; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 14px; width: 220px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 24px; font-weight: 600; color: #1a1a2e; }
    .stat-label { font-size: 14px; color: #666; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
    .alert-error { background: #ffebee; color: #c62828; border: 1px solid #ef5350; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    /* Table Styles */
    .content-section { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .table-container { overflow-x: auto; }
    .investors-table { width: 100%; border-collapse: collapse; }
    .investors-table th { text-align: left; padding: 12px 16px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #e9ecef; }
    .investors-table td { padding: 16px; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
    .investors-table tbody tr:hover { background: #f8f9fa; }
    .investor-cell { display: flex; align-items: center; gap: 12px; }
    .investor-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; }
    .investor-cell strong { color: #1a1a2e; }
    .amount { font-weight: 600; color: #667eea; }
    .contributions { color: #27ae60; font-weight: 600; }
    .share { font-weight: 600; color: #f39c12; }
    .date { color: #666; font-size: 13px; }
    .empty-row { text-align: center; padding: 40px; color: #999; }
    .empty-row .material-icons { font-size: 48px; display: block; margin-bottom: 8px; }
    
    /* Card Styles */
    .members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
    .member-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s ease; }
    .member-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .member-avatar-large { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-badge.active { background: #e8f5e9; color: #27ae60; }
    .status-badge.inactive { background: #ffebee; color: #e74c3c; }
    .member-info { margin-bottom: 16px; }
    .member-info h3 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px 0; }
    .member-info p { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 14px; color: #666; }
    .member-info p .material-icons { font-size: 16px; color: #999; }
    .member-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 16px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; margin-bottom: 12px; }
    .stat { display: flex; flex-direction: column; }
    .stat .stat-label { font-size: 11px; color: #999; text-transform: uppercase; }
    .stat .stat-value { font-size: 16px; font-weight: 600; color: #1a1a2e; }
    .member-footer { display: flex; justify-content: space-between; align-items: center; }
    .join-date { font-size: 12px; color: #999; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px; color: #999; }
    .empty-state .material-icons { font-size: 64px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 18px; color: #666; margin: 0 0 8px 0; }
    .empty-state p { margin: 0; }
    .material-icons { font-size: 20px; }
  `],
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
})
export class InvestorsComponent implements OnInit {
  members: Member[] = [];
  filteredMembers: Member[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  viewMode: 'table' | 'card' = 'table';

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadMembers();
  }

  get totalContributions(): number {
    return this.members.reduce((sum, m) => sum + m.totalContributions, 0);
  }

  get activeMembers(): number {
    return this.members.filter(m => m.isActive).length;
  }

  loadMembers() {
    this.isLoading = true;
    this.errorMessage = '';
    const token = this.tokenService.getToken();
    if (!token) {
      this.errorMessage = 'No token found. Please login.';
      this.isLoading = false;
      return;
    }

    this.http
      .get<Member[]>('/api/members')
      .subscribe({
        next: (data) => {
          this.members = data;
          this.filterMembers();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading members:', err);
          this.errorMessage = 'Failed to load members';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  filterMembers() {
    if (!this.searchTerm) {
      this.filteredMembers = [...this.members];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredMembers = this.members.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.phone.includes(term)
      );
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}