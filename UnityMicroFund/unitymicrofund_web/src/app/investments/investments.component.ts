import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';

interface Investment {
  id: string;
  name: string;
  description?: string;
  type: string;
  principalAmount: number;
  currentValue: number;
  returnAmount: number;
  returnPercentage: number;
  dateInvested: string;
  createdAt: string;
  members: MemberInvestment[];
}

interface MemberInvestment {
  memberId: string;
  memberName: string;
  sharePercentage: number;
  shareValue: number;
}

@Component({
  selector: 'app-investments',
  template: `
    <div class="investments-wrapper">
      <app-page-header 
        title="Investments" 
        subtitle="Track and manage your investment portfolio"
        icon="trending_up"
        [iconColor]="'linear-gradient(135deg, #27ae60, #2ecc71)'">
        <button actions class="btn-refresh" (click)="loadInvestments()">
          <span class="material-icons">refresh</span>
        </button>
        <button actions class="btn-primary" (click)="openCreateModal()">
          <span class="material-icons">add</span>
          New Investment
        </button>
      </app-page-header>

      <!-- Stats -->
      <section class="stats-section">
        <div class="stats-grid">
          <app-stat-card
            [icon]="'account_balance_wallet'"
            label="Total Invested"
            [value]="formatCurrency(totalInvested)"
            detail="{{ investments.length }} investments"
            [color]="'#667eea'"
            [color2]="'#764ba2'"
            [primary]="true">
          </app-stat-card>
          <app-stat-card
            [icon]="'show_chart'"
            label="Current Value"
            [value]="formatCurrency(totalCurrentValue)"
            [trend]="'+' + totalReturnPercentage.toFixed(1) + '% returns'"
            [trendValue]="totalReturnPercentage"
            [color]="'#27ae60'"
            [color2]="'#2ecc71'">
          </app-stat-card>
          <app-stat-card
            [icon]="'payments'"
            label="Total Returns"
            [value]="formatCurrency(totalReturns)"
            [detail]="'From inception'"
            [color]="'#3498db'"
            [color2]="'#2980b9'">
          </app-stat-card>
          <app-stat-card
            [icon]="'groups'"
            label="Active Members"
            [value]="totalMembers.toString()"
            [detail]="'In investments'"
            [color]="'#9b59b6'"
            [color2]="'#8e44ad'">
          </app-stat-card>
        </div>
      </section>

      <!-- Filter & View Toggle -->
      <section class="filter-section">
        <div class="filter-left">
          <div class="view-toggle">
            <button [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'" title="Grid View">
              <span class="material-icons">grid_view</span>
            </button>
            <button [class.active]="viewMode === 'table'" (click)="viewMode = 'table'" title="Table View">
              <span class="material-icons">table_rows</span>
            </button>
            <button [class.active]="viewMode === 'chart'" (click)="viewMode = 'chart'" title="Chart View">
              <span class="material-icons">bar_chart</span>
            </button>
          </div>
          <div class="filter-group">
            <select [(ngModel)]="filterType" (change)="applyFilters()">
              <option value="">All Types</option>
              <option value="Stock">Stock</option>
              <option value="Bond">Bond</option>
              <option value="RealEstate">Real Estate</option>
              <option value="MutualFund">Mutual Fund</option>
              <option value="FixedDeposit">Fixed Deposit</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="filter-right">
          <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" [(ngModel)]="searchTerm" (input)="applyFilters()" placeholder="Search investments..." />
          </div>
        </div>
      </section>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading investments...</p>
      </div>

      <!-- Grid View -->
      <section class="investments-grid" *ngIf="!isLoading && viewMode === 'grid'">
        <div class="investment-card" *ngFor="let investment of filteredInvestments; let i = index" [style.animation-delay]="i * 50 + 'ms'">
          <div class="card-header">
            <div class="investment-type" [ngClass]="investment.type.toLowerCase()">
              <span class="material-icons">{{ getTypeIcon(investment.type) }}</span>
              {{ investment.type }}
            </div>
            <span class="return-badge" [class.positive]="investment.returnPercentage >= 0" [class.negative]="investment.returnPercentage < 0">
              {{ investment.returnPercentage >= 0 ? '+' : '' }}{{ investment.returnPercentage.toFixed(1) }}%
            </span>
          </div>
          <h3 class="investment-name">{{ investment.name }}</h3>
          <p class="investment-desc" *ngIf="investment.description">{{ investment.description }}</p>
          
          <div class="investment-value">
            <div class="value-row">
              <span class="label">Principal</span>
              <span class="amount">{{ formatCurrency(investment.principalAmount) }}</span>
            </div>
            <div class="value-row">
              <span class="label">Current</span>
              <span class="amount current">{{ formatCurrency(investment.currentValue) }}</span>
            </div>
            <div class="value-row return">
              <span class="label">Returns</span>
              <span class="amount" [class.positive]="investment.returnAmount >= 0" [class.negative]="investment.returnAmount < 0">
                {{ investment.returnAmount >= 0 ? '+' : '' }}{{ formatCurrency(investment.returnAmount) }}
              </span>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>Return Progress</span>
              <span>{{ ((investment.returnPercentage + 10) / 20 * 100).toFixed(0) }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="Math.min(((investment.returnPercentage + 10) / 20 * 100), 100)"></div>
            </div>
          </div>

          <div class="card-footer">
            <div class="members-preview" *ngIf="investment.members.length > 0">
              <div class="member-avatars">
                <div class="avatar" *ngFor="let m of investment.members.slice(0, 3)" [title]="m.memberName">
                  {{ getInitials(m.memberName) }}
                </div>
                <div class="avatar more" *ngIf="investment.members.length > 3">
                  +{{ investment.members.length - 3 }}
                </div>
              </div>
              <span class="members-count">{{ investment.members.length }} members</span>
            </div>
            <div class="card-actions">
              <button class="btn-icon" (click)="viewInvestment(investment)" title="View">
                <span class="material-icons">visibility</span>
              </button>
              <button class="btn-icon" (click)="editInvestment(investment)" title="Edit">
                <span class="material-icons">edit</span>
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredInvestments.length === 0">
          <span class="material-icons">trending_up</span>
          <h3>No Investments Found</h3>
          <p>Start by creating your first investment</p>
          <button class="btn-primary" (click)="openCreateModal()">
            <span class="material-icons">add</span>
            Create Investment
          </button>
        </div>
      </section>

      <!-- Table View -->
      <section class="table-section" *ngIf="!isLoading && viewMode === 'table'">
        <div class="table-card">
          <table class="investments-table">
            <thead>
              <tr>
                <th>Investment</th>
                <th>Type</th>
                <th>Principal</th>
                <th>Current Value</th>
                <th>Returns</th>
                <th>Return %</th>
                <th>Members</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of filteredInvestments">
                <td class="name-cell">
                  <strong>{{ inv.name }}</strong>
                  <span *ngIf="inv.description" class="desc">{{ inv.description }}</span>
                </td>
                <td>
                  <span class="type-badge" [ngClass]="inv.type.toLowerCase()">{{ inv.type }}</span>
                </td>
                <td class="currency">{{ formatCurrency(inv.principalAmount) }}</td>
                <td class="currency">{{ formatCurrency(inv.currentValue) }}</td>
                <td class="currency" [class.positive]="inv.returnAmount >= 0" [class.negative]="inv.returnAmount < 0">
                  {{ inv.returnAmount >= 0 ? '+' : '' }}{{ formatCurrency(inv.returnAmount) }}
                </td>
                <td>
                  <span class="return-badge" [class.positive]="inv.returnPercentage >= 0" [class.negative]="inv.returnPercentage < 0">
                    {{ inv.returnPercentage >= 0 ? '+' : '' }}{{ inv.returnPercentage.toFixed(1) }}%
                  </span>
                </td>
                <td>{{ inv.members.length }}</td>
                <td class="date">{{ inv.dateInvested | date:'mediumDate' }}</td>
                <td class="actions">
                  <button class="btn-icon" (click)="viewInvestment(inv)">
                    <span class="material-icons">visibility</span>
                  </button>
                  <button class="btn-icon" (click)="editInvestment(inv)">
                    <span class="material-icons">edit</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Chart View -->
      <section class="chart-section" *ngIf="!isLoading && viewMode === 'chart'">
        <div class="chart-grid">
          <div class="chart-card">
            <h3>Investment Distribution by Type</h3>
            <div class="chart-placeholder">
              <div class="pie-chart">
                <div class="pie-segment" *ngFor="let item of investmentByType; let i = index"
                     [style.--percentage]="item.percentage"
                     [style.--color]="item.color">
                </div>
              </div>
              <div class="chart-legend">
                <div class="legend-item" *ngFor="let item of investmentByType">
                  <span class="legend-color" [style.background]="item.color"></span>
                  <span class="legend-label">{{ item.type }}</span>
                  <span class="legend-value">{{ formatCurrency(item.value) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="chart-card">
            <h3>Returns Comparison</h3>
            <div class="bar-chart">
              <div class="bar-item" *ngFor="let inv of filteredInvestments">
                <span class="bar-label">{{ inv.name | slice:0:15 }}</span>
                <div class="bar-container">
                  <div class="bar principal" [style.width.%]="(inv.principalAmount / maxPrincipal) * 100"></div>
                  <div class="bar current" [style.width.%]="(inv.currentValue / maxPrincipal) * 100"></div>
                </div>
                <span class="bar-value">{{ inv.returnPercentage >= 0 ? '+' : '' }}{{ inv.returnPercentage.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- View Investment Modal -->
    <div class="modal-overlay" *ngIf="showViewModal" (click)="closeViewModal()">
      <div class="modal-content modal-large" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ selectedInvestment?.name }}</h3>
          <button class="close-btn" (click)="closeViewModal()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body" *ngIf="selectedInvestment">
          <div class="detail-grid">
            <div class="detail-card">
              <span class="detail-label">Investment Type</span>
              <span class="detail-value type-badge" [ngClass]="selectedInvestment.type.toLowerCase()">{{ selectedInvestment.type }}</span>
            </div>
            <div class="detail-card">
              <span class="detail-label">Date Invested</span>
              <span class="detail-value">{{ selectedInvestment.dateInvested | date:'longDate' }}</span>
            </div>
            <div class="detail-card">
              <span class="detail-label">Principal Amount</span>
              <span class="detail-value currency">{{ formatCurrency(selectedInvestment.principalAmount) }}</span>
            </div>
            <div class="detail-card">
              <span class="detail-label">Current Value</span>
              <span class="detail-value currency highlight">{{ formatCurrency(selectedInvestment.currentValue) }}</span>
            </div>
            <div class="detail-card">
              <span class="detail-label">Total Returns</span>
              <span class="detail-value currency" [class.positive]="selectedInvestment.returnAmount >= 0" [class.negative]="selectedInvestment.returnAmount < 0">
                {{ selectedInvestment.returnAmount >= 0 ? '+' : '' }}{{ formatCurrency(selectedInvestment.returnAmount) }}
              </span>
            </div>
            <div class="detail-card">
              <span class="detail-label">Return Percentage</span>
              <span class="detail-value return-badge" [class.positive]="selectedInvestment.returnPercentage >= 0" [class.negative]="selectedInvestment.returnPercentage < 0">
                {{ selectedInvestment.returnPercentage >= 0 ? '+' : '' }}{{ selectedInvestment.returnPercentage.toFixed(2) }}%
              </span>
            </div>
          </div>
          <div class="description-section" *ngIf="selectedInvestment.description">
            <h4>Description</h4>
            <p>{{ selectedInvestment.description }}</p>
          </div>
          <div class="members-section" *ngIf="selectedInvestment.members.length > 0">
            <h4>Invested Members ({{ selectedInvestment.members.length }})</h4>
            <div class="members-list">
              <div class="member-item" *ngFor="let m of selectedInvestment.members">
                <div class="member-avatar">{{ getInitials(m.memberName) }}</div>
                <div class="member-info">
                  <span class="member-name">{{ m.memberName }}</span>
                  <span class="member-share">{{ m.sharePercentage.toFixed(2) }}% share</span>
                </div>
                <span class="member-value">{{ formatCurrency(m.shareValue) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .investments-wrapper { max-width: 1600px; margin: 0 auto; }
    
    /* Stats */
    .stats-section { margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    
    /* Filter Section */
    .filter-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: white; padding: 16px 24px; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .filter-left { display: flex; align-items: center; gap: 16px; }
    .view-toggle { display: flex; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; }
    .view-toggle button { background: white; border: none; padding: 10px 14px; cursor: pointer; color: #666; transition: all 0.2s; }
    .view-toggle button:hover { background: #f5f5f5; }
    .view-toggle button.active { background: #667eea; color: white; }
    .filter-group select { padding: 10px 16px; border: 1px solid #e0e0e0; border-radius: 10px; font-size: 14px; background: white; cursor: pointer; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid #e0e0e0; border-radius: 10px; background: white; }
    .search-box .material-icons { color: #999; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 14px; width: 220px; }

    /* Button Styles */
    .btn-refresh { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 12px; cursor: pointer; color: #666; transition: all 0.3s; }
    .btn-refresh:hover { background: #667eea; color: white; border-color: #667eea; }
    .btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }

    /* Loading */
    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; }
    .spinner { width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Grid View */
    .investments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; }
    .investment-card { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); transition: all 0.3s; animation: fadeInUp 0.4s ease forwards; opacity: 0; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .investment-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .investment-type { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .investment-type.stock { background: #e3f2fd; color: #1976d2; }
    .investment-type.bond { background: #f3e5f5; color: #7b1fa2; }
    .investment-type.realestate { background: #e8f5e9; color: #388e3c; }
    .investment-type.mutualfund { background: #fff3e0; color: #f57c00; }
    .investment-type.fixeddeposit { background: #fce4ec; color: #c2185b; }
    .investment-type.other { background: #eceff1; color: #546e7a; }
    .return-badge { padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; }
    .return-badge.positive { background: #e8f5e9; color: #27ae60; }
    .return-badge.negative { background: #ffebee; color: #e74c3c; }
    .investment-name { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px 0; }
    .investment-desc { font-size: 13px; color: #666; margin: 0 0 16px 0; }
    .investment-value { background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .value-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .value-row:last-child { margin-bottom: 0; }
    .value-row .label { color: #666; font-size: 13px; }
    .value-row .amount { font-weight: 600; color: #1a1a2e; }
    .value-row .amount.current { color: #667eea; font-size: 16px; }
    .value-row.return { padding-top: 8px; border-top: 1px dashed #ddd; margin-top: 8px; }
    .value-row.return .amount.positive { color: #27ae60; }
    .value-row.return .amount.negative { color: #e74c3c; }
    .progress-section { margin-bottom: 16px; }
    .progress-header { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 6px; }
    .progress-bar { height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.5s ease; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .members-preview { display: flex; align-items: center; gap: 8px; }
    .member-avatars { display: flex; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; margin-left: -8px; border: 2px solid white; }
    .avatar:first-child { margin-left: 0; }
    .avatar.more { background: #e0e0e0; color: #666; font-size: 10px; }
    .members-count { font-size: 12px; color: #666; }
    .card-actions { display: flex; gap: 4px; }
    .btn-icon { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; color: #666; transition: all 0.2s; }
    .btn-icon:hover { background: #f5f5f5; color: #667eea; border-color: #667eea; }

    /* Empty State */
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px 40px; background: white; border-radius: 20px; }
    .empty-state .material-icons { font-size: 64px; color: #667eea; opacity: 0.5; }
    .empty-state h3 { font-size: 20px; color: #1a1a2e; margin: 16px 0 8px; }
    .empty-state p { color: #666; margin-bottom: 24px; }

    /* Table View */
    .table-section { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .investments-table { width: 100%; border-collapse: collapse; }
    .investments-table th { text-align: left; padding: 14px 16px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #e0e0e0; }
    .investments-table td { padding: 16px; border-bottom: 1px solid #eee; }
    .investments-table tbody tr:hover { background: #f8f9fa; }
    .name-cell strong { color: #1a1a2e; display: block; }
    .name-cell .desc { font-size: 12px; color: #999; }
    .type-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .type-badge.stock { background: #e3f2fd; color: #1976d2; }
    .type-badge.bond { background: #f3e5f5; color: #7b1fa2; }
    .type-badge.realestate { background: #e8f5e9; color: #388e3c; }
    .type-badge.mutualfund { background: #fff3e0; color: #f57c00; }
    .type-badge.fixeddeposit { background: #fce4ec; color: #c2185b; }
    .type-badge.other { background: #eceff1; color: #546e7a; }
    .currency { font-weight: 600; }
    .currency.positive { color: #27ae60; }
    .currency.negative { color: #e74c3c; }
    .date { color: #666; font-size: 13px; }
    .actions { display: flex; gap: 4px; }

    /* Chart View */
    .chart-section { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .chart-card h3 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0 0 20px; }
    .chart-placeholder { display: flex; align-items: center; gap: 40px; }
    .pie-chart { width: 180px; height: 180px; border-radius: 50%; background: conic-gradient(#667eea 0% 35%, #27ae60 35% 55%, #f39c12 55% 75%, #e74c3c 75% 100%); position: relative; }
    .chart-legend { flex: 1; }
    .legend-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #eee; }
    .legend-color { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }
    .legend-label { flex: 1; font-size: 14px; color: #666; }
    .legend-value { font-weight: 600; color: #1a1a2e; }
    .bar-chart { display: flex; flex-direction: column; gap: 12px; }
    .bar-item { display: grid; grid-template-columns: 100px 1fr 60px; align-items: center; gap: 12px; }
    .bar-label { font-size: 13px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-container { height: 24px; background: #f0f0f0; border-radius: 4px; overflow: hidden; position: relative; }
    .bar { height: 100%; position: absolute; top: 0; border-radius: 4px; }
    .bar.principal { background: #667eea; z-index: 2; }
    .bar.current { background: #27ae60; z-index: 1; }
    .bar-value { font-weight: 600; color: #27ae60; text-align: right; }

    /* Modal */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-large { max-width: 800px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px; border-bottom: 1px solid #eee; }
    .modal-header h3 { font-size: 20px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #666; }
    .modal-body { padding: 24px; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .detail-card { background: #f8f9fa; border-radius: 12px; padding: 16px; }
    .detail-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
    .detail-value { font-size: 18px; font-weight: 600; color: #1a1a2e; display: block; }
    .detail-value.currency.highlight { color: #667eea; }
    .detail-value.positive { color: #27ae60; }
    .detail-value.negative { color: #e74c3c; }
    .description-section h4, .members-section h4 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0 0 12px; }
    .description-section p { font-size: 14px; color: #666; line-height: 1.6; margin: 0 0 24px; }
    .members-list { display: flex; flex-direction: column; gap: 12px; }
    .member-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f9fa; border-radius: 12px; }
    .member-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; }
    .member-info { flex: 1; }
    .member-name { font-weight: 600; color: #1a1a2e; display: block; }
    .member-share { font-size: 12px; color: #666; }
    .member-value { font-weight: 600; color: #667eea; }

    .material-icons { font-size: 20px; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatCardComponent, PageHeaderComponent]
})
export class InvestmentsComponent implements OnInit {
  investments: Investment[] = [];
  filteredInvestments: Investment[] = [];
  viewMode: 'grid' | 'table' | 'chart' = 'grid';
  filterType = '';
  searchTerm = '';
  isLoading = false;
  showViewModal = false;
  selectedInvestment: Investment | null = null;

  Math = Math;

  get totalInvested(): number {
    return this.investments.reduce((sum, inv) => sum + inv.principalAmount, 0);
  }

  get totalCurrentValue(): number {
    return this.investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  }

  get totalReturns(): number {
    return this.totalCurrentValue - this.totalInvested;
  }

  get totalReturnPercentage(): number {
    return this.totalInvested > 0 ? (this.totalReturns / this.totalInvested) * 100 : 0;
  }

  get totalMembers(): number {
    const memberIds = new Set<string>();
    this.investments.forEach(inv => inv.members.forEach(m => memberIds.add(m.memberId)));
    return memberIds.size;
  }

  get maxPrincipal(): number {
    return Math.max(...this.investments.map(inv => Math.max(inv.principalAmount, inv.currentValue)));
  }

  get investmentByType(): { type: string; value: number; percentage: number; color: string }[] {
    const types: { [key: string]: number } = {};
    this.investments.forEach(inv => {
      types[inv.type] = (types[inv.type] || 0) + inv.currentValue;
    });
    const total = Object.values(types).reduce((a, b) => a + b, 0);
    const colors = ['#667eea', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6', '#3498db'];
    return Object.entries(types).map(([type, value], i) => ({
      type,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: colors[i % colors.length]
    }));
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadInvestments();
  }

  loadInvestments() {
    this.isLoading = true;
    this.http.get<Investment[]>('/api/investments').subscribe({
      next: (data) => {
        this.investments = data || [];
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load investments:', err);
        this.investments = [];
        this.filteredInvestments = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters() {
    let data = [...this.investments];
    
    if (this.filterType) {
      data = data.filter(inv => inv.type === this.filterType);
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(inv => 
        inv.name.toLowerCase().includes(term) ||
        inv.type.toLowerCase().includes(term) ||
        inv.description?.toLowerCase().includes(term)
      );
    }
    
    this.filteredInvestments = data;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Stock': 'show_chart',
      'Bond': 'account_balance',
      'RealEstate': 'home',
      'MutualFund': 'pie_chart',
      'FixedDeposit': 'savings',
      'Other': 'category'
    };
    return icons[type] || 'category';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  openCreateModal() {
    // TODO: Implement create modal
    alert('Create investment modal - to be implemented');
  }

  viewInvestment(investment: Investment) {
    this.selectedInvestment = investment;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedInvestment = null;
  }

  editInvestment(investment: Investment) {
    // TODO: Implement edit modal
    alert('Edit investment modal - to be implemented');
  }
}
