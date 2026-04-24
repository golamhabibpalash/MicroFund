import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Token } from '../core/services/token';
import { ChangeDetectorRef } from '@angular/core';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';

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
  profileImageUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  alternatePhone?: string;
  occupation?: string;
  employerName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineePhone?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  signatureUrl?: string;
}

@Component({
  selector: 'app-investors',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule, BdtCurrencyPipe, DecimalPipe, DatePipe],
  template: `
    <div class="investors-wrapper">
      <!-- Profile Modal -->
      <div class="modal-overlay" *ngIf="showProfileModal" (click)="closeProfileModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Investor Profile</h2>
            <button class="modal-close" (click)="closeProfileModal()">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedMember">
            <div class="profile-header">
              <div class="profile-avatar">{{ getInitials(selectedMember.name) }}</div>
              <div class="profile-title">
                <h3>{{ selectedMember.name }}</h3>
                <span class="status-badge" [class.active]="selectedMember.isActive" [class.inactive]="!selectedMember.isActive">
                  {{ selectedMember.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <div class="profile-section">
              <h4>Contact Information</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Email</span>
                  <span class="value">{{ selectedMember.email }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Phone</span>
                  <span class="value">{{ selectedMember.phone }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Address</span>
                  <span class="value">{{ selectedMember.address }}</span>
                </div>
              </div>
            </div>
            <div class="profile-section">
              <h4>Financial Details</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Monthly Amount</span>
                  <span class="value">{{ selectedMember.monthlyAmount | bdtCurrency }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Total Contributions</span>
                  <span class="value highlight">{{ selectedMember.totalContributions | bdtCurrency }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Installments Paid</span>
                  <span class="value">{{ selectedMember.totalInstallmentsPaid }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Current Share Value</span>
                  <span class="value">{{ selectedMember.currentShareValue | bdtCurrency }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Share Percentage</span>
                  <span class="value">{{ selectedMember.sharePercentage | number:'1.1-1' }}%</span>
                </div>
              </div>
            </div>
            <div class="profile-section">
              <h4>Membership</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Member ID</span>
                  <span class="value">{{ selectedMember.id }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Join Date</span>
                  <span class="value">{{ selectedMember.joinDate | date:'longDate' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="downloadProfile(selectedMember!)">
              <span class="material-icons">picture_as_pdf</span>
              Download PDF
            </button>
            <button class="btn btn-primary" (click)="closeProfileModal()">Close</button>
          </div>
        </div>
      </div>
      <!-- Edit Modal -->
      <div class="modal-overlay" *ngIf="showEditModal" (click)="closeEditModal()">
        <div class="modal-content edit-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Edit Investor</h2>
            <button class="modal-close" (click)="closeEditModal()">
              <span class="material-icons">close</span>
            </button>
          </div>
          <form (ngSubmit)="saveMember()" *ngIf="editingMember">
            <div class="modal-body">
              <div class="form-section">
                <h3>Personal Information</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="editName">Full Name</label>
                    <input type="text" id="editName" [(ngModel)]="editingMember.name" name="name" required>
                  </div>
                  <div class="form-group">
                    <label for="editEmail">Email</label>
                    <input type="email" id="editEmail" [(ngModel)]="editingMember.email" name="email" required>
                  </div>
                  <div class="form-group">
                    <label for="editPhone">Phone</label>
                    <input type="tel" id="editPhone" [(ngModel)]="editingMember.phone" name="phone" required>
                  </div>
                  <div class="form-group full-width">
                    <label for="editAddress">Address</label>
                    <textarea id="editAddress" [(ngModel)]="editingMember.address" name="address" rows="2"></textarea>
                  </div>
                </div>
              </div>
              <div class="form-section">
                <h3>Financial Information</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="editMonthlyAmount">Monthly Amount (BDT)</label>
                    <input type="number" id="editMonthlyAmount" [(ngModel)]="editingMember.monthlyAmount" name="monthlyAmount">
                  </div>
                  <div class="form-group">
                    <label for="editStatus">Status</label>
                    <select id="editStatus" [(ngModel)]="editingMember.isActive" name="isActive">
                      <option [ngValue]="true">Active</option>
                      <option [ngValue]="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeEditModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
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
            <span class="stat-value">{{ totalContributions | bdtCurrency }}</span>
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
                <th>Action</th>
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
                <td class="amount">{{ member.monthlyAmount | bdtCurrency }}</td>
                <td class="contributions">{{ member.totalContributions | bdtCurrency }}</td>
                <td>{{ member.totalInstallmentsPaid }}</td>
                <td class="share">{{ member.sharePercentage | number:'1.1-1' }}%</td>
                <td>
                  <span class="status-badge" [class.active]="member.isActive" [class.inactive]="!member.isActive">
                    {{ member.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="date">{{ member.joinDate | date:'mediumDate' }}</td>
                <td>
                  <button class="btn-action" (click)="viewProfile(member)" title="View Profile">
                    <span class="material-icons">person</span>
                  </button>
                  <button class="btn-action" (click)="openEditModal(member)" title="Edit">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-action" (click)="downloadProfile(member)" title="Download PDF">
                    <span class="material-icons">picture_as_pdf</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredMembers.length === 0">
                <td colspan="10" class="empty-row">
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
              <span class="stat-value">{{ member.monthlyAmount | bdtCurrency }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Contributed</span>
              <span class="stat-value">{{ member.totalContributions | bdtCurrency }}</span>
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
            <div class="card-actions">
              <button class="btn-action" (click)="viewProfile(member)" title="View Profile">
                <span class="material-icons">person</span>
              </button>
              <button class="btn-action" (click)="openEditModal(member)" title="Edit">
                <span class="material-icons">edit</span>
              </button>
              <button class="btn-action" (click)="downloadProfile(member)" title="Download PDF">
                <span class="material-icons">picture_as_pdf</span>
              </button>
            </div>
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
    .btn-action { background: none; border: none; padding: 6px; cursor: pointer; color: #667eea; border-radius: 4px; transition: all 0.2s; }
    .btn-action:hover { background: #667eea; color: white; }
    .investors-table .btn-action { margin-right: 4px; }
    
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
    .card-actions { display: flex; gap: 4px; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px; color: #999; }
    .empty-state .material-icons { font-size: 64px; margin-bottom: 16px; }
.empty-state h3 { font-size: 18px; color: #666; margin: 0 0 8px 0; }
    .empty-state p { margin: 0; }
    .material-icons { font-size: 20px; }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 992px) {
      .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
      .header-actions { width: 100%; flex-wrap: wrap; }
      .stats-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .top-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .search-box { width: 100%; }
      .view-toggle { display: none; }
      .table-container { overflow-x: auto; }
      .members-table { min-width: 600px; }
    }
    @media (max-width: 576px) {
      .stat-card { padding: 16px; }
      .stat-card .stat-value { font-size: 20px; }
      .btn { padding: 8px 12px; font-size: 13px; }
    }

    /* Modal Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-content { background: white; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; animation: modalSlideIn 0.3s ease; }
    @keyframes modalSlideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; }
    .modal-header h2 { margin: 0; font-size: 20px; color: #1a1a2e; }
    .modal-close { background: none; border: none; cursor: pointer; color: #666; padding: 4px; border-radius: 4px; }
    .modal-close:hover { background: #f5f5f5; color: #333; }
    .modal-body { padding: 24px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #eee; }
    .profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 24px; }
    .profile-title h3 { margin: 0 0 8px 0; font-size: 24px; color: #1a1a2e; }
    .profile-section { margin-bottom: 24px; }
    .profile-section h4 { font-size: 14px; color: #666; text-transform: uppercase; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #eee; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .info-item { display: flex; flex-direction: column; }
    .info-item .label { font-size: 12px; color: #999; margin-bottom: 4px; }
    .info-item .value { font-size: 15px; color: #1a1a2e; font-weight: 500; }
    .info-item .value.highlight { color: #27ae60; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #5568d3; }
    .btn-secondary { background: #f5f6fa; color: #666; border: 1px solid #ddd; }
    .btn-secondary:hover { background: #eee; }
    .edit-modal { max-width: 650px; }
    .form-section { margin-bottom: 24px; }
    .form-section h3 { font-size: 14px; color: #666; text-transform: uppercase; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #eee; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { font-size: 13px; color: #666; margin-bottom: 6px; font-weight: 500; }
    .form-group input, .form-group select, .form-group textarea { padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
    .modal-body { padding: 20px 24px; max-height: 60vh; overflow-y: auto; }
  `]
})
export class InvestorsComponent implements OnInit {
  members: Member[] = [];
  filteredMembers: Member[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  viewMode: 'table' | 'card' = 'table';
  showProfileModal = false;
  showEditModal = false;
  selectedMember: Member | null = null;
  editingMember: Member | null = null;
  isSaving = false;

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private cdr: ChangeDetectorRef,
    private router: Router
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

  viewProfile(member: Member) {
    this.selectedMember = member;
    this.showProfileModal = true;
  }

  openEditModal(member: Member) {
    this.editingMember = { ...member };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingMember = null;
  }

  saveMember() {
    if (!this.editingMember) return;
    this.isSaving = true;
    this.http.put<Member>(`/api/members/${this.editingMember.id}`, this.editingMember).subscribe({
      next: (updated) => {
        const index = this.members.findIndex(m => m.id === updated.id);
        if (index !== -1) {
          this.members[index] = updated;
          this.filterMembers();
        }
        this.isSaving = false;
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Error saving member:', err);
        this.isSaving = false;
      }
    });
  }

  closeProfileModal() {
    this.showProfileModal = false;
    this.selectedMember = null;
  }

  downloadProfile(member: Member) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Investor Profile - ${member.name}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
      color: #1a1a2e; 
      line-height: 1.5;
      background: white;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 20mm;
      margin: 0 auto;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 3px solid #1a1a2e;
      margin-bottom: 18px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 55px;
      height: 55px;
      background: linear-gradient(135deg, #1a1a2e 0%, #3a3a5a 100%);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 18px;
      text-align: center;
      line-height: 1.1;
    }
    .org-info h1 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: 0.3px;
    }
    .org-info p {
      font-size: 10px;
      color: #666;
    }
    .header-right {
      text-align: right;
    }
    .doc-type {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #999;
    }
    .doc-date {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .profile-header {
      display: flex;
      gap: 18px;
      margin-bottom: 18px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e5e5e5;
    }
    .photo-box {
      width: 100px;
      height: 115px;
      border: 2px solid #1a1a2e;
      border-radius: 4px;
      overflow: hidden;
      flex-shrink: 0;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-box .initials {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .profile-details {
      flex: 1;
    }
    .member-name {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    .contact-info {
      font-size: 11px;
      color: #555;
      margin-bottom: 3px;
    }
    .status-tags {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .tag {
      padding: 3px 10px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .tag.member { background: #1a1a2e; color: white; }
    .tag.active { background: #16a34a; color: white; }
    .tag.inactive { background: #dc2626; color: white; }
    .section {
      margin-bottom: 15px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1a1a2e;
      padding-bottom: 5px;
      border-bottom: 2px solid #1a1a2e;
      margin-bottom: 10px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table tr:nth-child(even) {
      background: #fafafa;
    }
    .info-table td {
      padding: 6px 8px;
      font-size: 11px;
      border-bottom: 1px solid #f0f0f0;
    }
    .info-table .label {
      color: #666;
      width: 40%;
      font-weight: 500;
    }
    .info-table .value {
      color: #1a1a2e;
      font-weight: 600;
    }
    .financial-table {
      width: 100%;
      border-collapse: collapse;
    }
    .financial-table tr {
      border-bottom: 1px solid #f0f0f0;
    }
    .financial-table td {
      padding: 8px;
      font-size: 12px;
    }
    .financial-table .label {
      color: #555;
    }
    .financial-table .value {
      text-align: right;
      font-weight: 700;
    }
    .financial-table .total-row {
      background: #f0f0f0;
    }
    .financial-table .total-row .label {
      font-weight: 700;
    }
    .financial-table .total-row .value {
      color: #16a34a;
      font-size: 13px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      padding-top: 15px;
    }
    .sig-box {
      text-align: center;
      width: 45%;
    }
    .sig-line {
      width: 100%;
      height: 1px;
      background: #1a1a2e;
      margin-bottom: 6px;
    }
    .sig-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #555;
    }
    .sig-date {
      font-size: 9px;
      color: #999;
      margin-top: 3px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 2px solid #1a1a2e;
      margin-top: 30px;
    }
    .footer-left {
      font-size: 9px;
      color: #777;
    }
    .footer-right {
      display: flex;
      gap: 15px;
      font-size: 9px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="logo-box">Unity<br>Micro<br>Fund</div>
        <div class="org-info">
          <h1>Unity MicroFund</h1>
          <p>Micro Investment for Small Business</p>
        </div>
      </div>
      <div class="header-right">
        <div class="doc-type">Investor Profile</div>
        <div class="doc-date">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>
    
    <div class="profile-header">
      <div class="photo-box">
        ${member.profileImageUrl ? 
          `<img src="${member.profileImageUrl}" alt="Photo" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'initials\\'>${member.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}</div>'">` : 
          `<div class="initials">${member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>`
        }
      </div>
      <div class="profile-details">
        <div class="member-name">${member.name}</div>
        <div class="contact-info">✉ ${member.email || 'N/A'}</div>
        <div class="contact-info">📱 ${member.phone}</div>
        <div class="contact-info">📍 ${member.address || 'N/A'}</div>
        <div class="status-tags">
          <span class="tag member">Member</span>
          <span class="tag ${member.isActive ? 'active' : 'inactive'}">${member.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Personal Information</div>
      <table class="info-table">
        <tr>
          <td class="label">Member ID</td>
          <td class="value">${member.id}</td>
        </tr>
        <tr>
          <td class="label">Date of Birth</td>
          <td class="value">${member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString('en-GB') : 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Gender</td>
          <td class="value">${member.gender || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Nationality</td>
          <td class="value">${member.nationality || 'Bangladeshi'}</td>
        </tr>
        <tr>
          <td class="label">Alternate Phone</td>
          <td class="value">${member.alternatePhone || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Join Date</td>
          <td class="value">${new Date(member.joinDate).toLocaleDateString('en-GB')}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Occupation & Business</div>
      <table class="info-table">
        <tr>
          <td class="label">Occupation</td>
          <td class="value">${member.occupation || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Employer / Business Name</td>
          <td class="value">${member.employerName || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Emergency Contact</div>
      <table class="info-table">
        <tr>
          <td class="label">Contact Name</td>
          <td class="value">${member.emergencyContactName || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Contact Phone</td>
          <td class="value">${member.emergencyContactPhone || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Relationship</td>
          <td class="value">${member.emergencyContactRelation || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Nominee Information</div>
      <table class="info-table">
        <tr>
          <td class="label">Nominee Name</td>
          <td class="value">${member.nomineeName || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Relationship</td>
          <td class="value">${member.nomineeRelation || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Nominee Phone</td>
          <td class="value">${member.nomineePhone || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Bank Account Details</div>
      <table class="info-table">
        <tr>
          <td class="label">Bank Name</td>
          <td class="value">${member.bankName || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Account Holder Name</td>
          <td class="value">${member.accountHolderName || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Account Number</td>
          <td class="value">${member.accountNumber || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Routing Number</td>
          <td class="value">${member.routingNumber || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">SWIFT Code</td>
          <td class="value">${member.swiftCode || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <div class="section-title">Financial Summary</div>
      <table class="financial-table">
        <tr>
          <td class="label">Monthly Contribution</td>
          <td class="value">${member.monthlyAmount.toLocaleString('en-BD', { style: 'currency', currency: 'BDT' })}</td>
        </tr>
        <tr>
          <td class="label">Total Contributions Paid</td>
          <td class="value">${member.totalContributions.toLocaleString('en-BD', { style: 'currency', currency: 'BDT' })}</td>
        </tr>
        <tr>
          <td class="label">Installments Completed</td>
          <td class="value">${member.totalInstallmentsPaid}</td>
        </tr>
        <tr>
          <td class="label">Current Share Value</td>
          <td class="value">${member.currentShareValue.toLocaleString('en-BD', { style: 'currency', currency: 'BDT' })}</td>
        </tr>
        <tr class="total-row">
          <td class="label">Share Percentage</td>
          <td class="value">${member.sharePercentage.toFixed(2)}%</td>
        </tr>
      </table>
    </div>
    
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signature</div>
        <div class="sig-date">Date: _______________</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Member Signature</div>
        <div class="sig-date">Date: _______________</div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-left">Unity MicroFund - Investor Profile Document</div>
      <div class="footer-right">
        <span>📧 unitymicrofund@gmail.com</span>
        <span>📞 +880 1234 567890</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}