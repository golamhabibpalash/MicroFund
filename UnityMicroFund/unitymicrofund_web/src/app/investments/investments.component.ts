import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { Investment, InvestmentService } from '../core/services/investment.service';
import { ToastService } from '../core/services/toast.service';
import { InvestmentFormComponent } from './investment-form.component';
import { InvestmentManageComponent } from './investment-manage.component';
import { UserService } from '../core/services/user';
import { DraggableModalDirective } from '../shared/directives/draggable-modal.directive';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatCardComponent, PageHeaderComponent, DatePipe, InvestmentFormComponent, InvestmentManageComponent, DraggableModalDirective],
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
        <button actions class="btn-primary" *ngIf="isAdmin" (click)="openCreateModal()">
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
              <option value="Stocks">Stocks</option>
              <option value="RealEstate">Real Estate</option>
              <option value="Business">Business</option>
              <option value="Savings">Savings</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="filter-group">
            <select [(ngModel)]="filterStatus" (change)="applyFilters()">
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="OpenForSubscription">Open for Subscription</option>
              <option value="FullySubscribed">Fully Subscribed</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="ProfitDistributed">Profit Distributed</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
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
          <div class="icard-top">
            <span class="icard-type" [ngClass]="investment.type.toLowerCase()">
              <span class="material-icons">{{ getTypeIcon(investment.type) }}</span>
              {{ investment.type }}
            </span>
            <span class="icard-status" [class.active]="investment.status === 'Active'"
                  [class.circulated]="investment.status === 'OpenForSubscription'"
                  [class.closed]="investment.status === 'Closed' || investment.status === 'Cancelled'"
                  [class.completed]="investment.status === 'Completed' || investment.status === 'ProfitDistributed'">
              <span class="material-icons">{{ statusIcon(investment.status) }}</span>
              {{ statusLabel(investment.status) }}
            </span>
          </div>

          <h3 class="icard-name">{{ investment.name }}</h3>
          <div class="icard-meta">
            <span *ngIf="investment.category" class="icard-meta-item">
              <span class="material-icons">label</span> {{ investment.category }}
            </span>
            <span *ngIf="investment.maturityDate" class="icard-meta-item">
              <span class="material-icons">event</span> Matures {{ investment.maturityDate | date:'mediumDate' }}
            </span>
          </div>
          <div class="icard-desc-wrap"
               (mouseenter)="onDescEnter(investment.id, $event.currentTarget)"
               (mouseleave)="onDescLeave()">
            <p class="icard-desc" *ngIf="investment.description">{{ investment.description }}</p>
            <span class="icard-readmore" *ngIf="investment.description && descMeta[investment.id] && hoveredDescId !== investment.id">
              Read more
            </span>
            <div class="icard-desc-tooltip" *ngIf="investment.description && hoveredDescId === investment.id">{{ investment.description }}</div>
          </div>

          <div class="icard-stats">
            <div class="icard-stat">
              <span class="icard-stat-label">Principal</span>
              <span class="icard-stat-value">{{ formatCurrency(investment.principalAmount) }}</span>
            </div>
            <div class="icard-stat">
              <span class="icard-stat-label">Current Value</span>
              <span class="icard-stat-value">{{ formatCurrency(investment.currentValue) }}</span>
            </div>
            <div class="icard-stat">
              <span class="icard-stat-label">Returns</span>
              <span class="icard-stat-value" [class.pos]="investment.returnAmount >= 0" [class.neg]="investment.returnAmount < 0">
                {{ investment.returnAmount >= 0 ? '+' : '' }}{{ formatCurrency(investment.returnAmount) }}
                <em class="icard-stat-sub">{{ investment.returnPercentage >= 0 ? '+' : '' }}{{ investment.returnPercentage.toFixed(1) }}%</em>
              </span>
            </div>
          </div>

          <div class="icard-progress">
            <div class="icard-progress-head">
              <span class="icard-progress-label">Return Progress</span>
              <span class="icard-progress-pct">{{ investment.returnPercentage >= 0 ? '+' : '' }}{{ investment.returnPercentage.toFixed(1) }}%</span>
            </div>
            <div class="icard-progress-bar">
              <div class="icard-progress-fill" [class.neg]="investment.returnPercentage < 0"
                   [style.width.%]="returnProgress(investment.returnPercentage)"></div>
            </div>
          </div>

          <div class="icard-shares" *ngIf="investment.totalShares">
            <div class="icard-shares-head">
              <span class="icard-shares-label">Share Subscription</span>
              <span class="icard-shares-count"><strong>{{ investment.remainingShares }}</strong> / {{ investment.totalShares }} available</span>
            </div>
            <div class="icard-shares-bar">
              <div class="icard-shares-fill" [class.sold-out]="investment.subscriptionPercentage >= 100"
                   [style.width.%]="Math.min(investment.subscriptionPercentage, 100)"></div>
            </div>
            <div class="icard-shares-foot">
              <span>{{ investment.soldShares | number }} sold</span>
              <span class="icard-shares-pct">{{ investment.subscriptionPercentage.toFixed(0) }}% subscribed</span>
            </div>
          </div>

          <div class="icard-footer">
            <button
              class="btn-invest"
              *ngIf="investment.status === 'OpenForSubscription'"
              (click)="openInvest(investment)">
              <span class="material-icons">payments</span>
              Invest / Buy Shares
            </button>
            <div class="members-preview" *ngIf="investment.members.length > 0 && investment.status !== 'OpenForSubscription'">
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
              <button class="btn-icon" (click)="viewInvestment(investment)" title="View details">
                <span class="material-icons">visibility</span>
              </button>
              <button class="btn-icon" *ngIf="isAdmin" (click)="editInvestment(investment)" title="Edit">
                <span class="material-icons">edit</span>
              </button>
              <button class="btn-icon" *ngIf="isAdmin" (click)="manageInvestment(investment)" title="Shares & lifecycle">
                <span class="material-icons">tune</span>
              </button>
              <button class="btn-icon danger" *ngIf="isAdmin" (click)="confirmDelete(investment)" title="Delete">
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredInvestments.length === 0">
          <span class="material-icons">trending_up</span>
          <h3>No Investments Found</h3>
          <p>{{ isAdmin ? 'Start by creating your first investment' : 'No circulated investments are available yet' }}</p>
          <button class="btn-primary" *ngIf="isAdmin" (click)="openCreateModal()">
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
                <th>Status</th>
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
                <td>
                  <span class="status-pill" [ngClass]="statusClass(inv.status)">{{ inv.status }}</span>
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
                  <button class="btn-icon" (click)="viewInvestment(inv)" title="View">
                    <span class="material-icons">visibility</span>
                  </button>
                  <button
                    class="btn-invest-table"
                    *ngIf="inv.status === 'OpenForSubscription'"
                    (click)="openInvest(inv)">
                    <span class="material-icons">payments</span> Invest
                  </button>
                  <button class="btn-icon" *ngIf="isAdmin" (click)="editInvestment(inv)" title="Edit">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-icon" *ngIf="isAdmin" (click)="manageInvestment(inv)" title="Shares & lifecycle">
                    <span class="material-icons">tune</span>
                  </button>
                  <button class="btn-icon danger" *ngIf="isAdmin" (click)="confirmDelete(inv)" title="Delete">
                    <span class="material-icons">delete</span>
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
      <div class="modal-content vmodal" (click)="$event.stopPropagation()">
        <div class="vmodal-hero" *ngIf="selectedInvestment">
          <div class="vmodal-hero-top">
            <span class="vmodal-type" [ngClass]="selectedInvestment.type.toLowerCase()">
              <span class="material-icons">{{ getTypeIcon(selectedInvestment.type) }}</span>
              {{ selectedInvestment.type }}
            </span>
            <span class="vmodal-status" [ngClass]="statusClass(selectedInvestment.status)">
              {{ selectedInvestment.status }}
            </span>
            <button class="vmodal-close" (click)="closeViewModal()" title="Close">
              <span class="material-icons">close</span>
            </button>
          </div>
          <h2 class="vmodal-title">{{ selectedInvestment.name }}</h2>
          <p class="vmodal-subtitle" *ngIf="selectedInvestment.category || selectedInvestment.durationMonths">
            {{ selectedInvestment.category }}<span *ngIf="selectedInvestment.category && selectedInvestment.durationMonths">&nbsp;&middot;&nbsp;</span>
            <ng-container *ngIf="selectedInvestment.durationMonths">{{ selectedInvestment.durationMonths }} months</ng-container>
          </p>

          <div class="vmodal-kpis">
            <div class="kpi">
              <span class="kpi-label">Principal</span>
              <span class="kpi-value">{{ formatCurrency(selectedInvestment.principalAmount) }}</span>
            </div>
            <div class="kpi">
              <span class="kpi-label">Current Value</span>
              <span class="kpi-value">{{ formatCurrency(selectedInvestment.currentValue) }}</span>
            </div>
            <div class="kpi">
              <span class="kpi-label">Total Returns</span>
              <span class="kpi-value" [class.pos]="selectedInvestment.returnAmount >= 0" [class.neg]="selectedInvestment.returnAmount < 0">
                {{ selectedInvestment.returnAmount >= 0 ? '+' : '' }}{{ formatCurrency(selectedInvestment.returnAmount) }}
                <em class="kpi-sub">{{ selectedInvestment.returnPercentage >= 0 ? '+' : '' }}{{ selectedInvestment.returnPercentage.toFixed(2) }}%</em>
              </span>
            </div>
            <div class="kpi" *ngIf="selectedInvestment.totalShares">
              <span class="kpi-label">Subscription</span>
              <span class="kpi-value">
                {{ selectedInvestment.subscriptionPercentage.toFixed(0) }}%
                <span class="kpi-progress"><i [style.width.%]="selectedInvestment.subscriptionPercentage"></i></span>
              </span>
            </div>
          </div>
        </div>

        <div class="vmodal-body" *ngIf="selectedInvestment">
          <div class="vmodal-section">
            <h4 class="vmodal-section-title"><span class="material-icons">info</span> Investment Details</h4>
            <dl class="vmodal-defs">
              <div class="def" *ngIf="selectedInvestment.dateInvested">
                <dt>Start Date</dt>
                <dd>{{ selectedInvestment.dateInvested | date:'mediumDate' }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.maturityDate">
                <dt>Maturity Date</dt>
                <dd>{{ selectedInvestment.maturityDate | date:'mediumDate' }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.totalShares">
                <dt>Total Shares</dt>
                <dd>{{ selectedInvestment.totalShares | number }} <span class="def-muted">@ {{ formatCurrency(selectedInvestment.sharePrice || 0) }}/share</span></dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.soldShares > 0">
                <dt>Shares Sold</dt>
                <dd>{{ selectedInvestment.soldShares | number }} <span class="def-muted">/ {{ selectedInvestment.totalShares | number }}</span></dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.minimumSharesPerMember">
                <dt>Min Shares / Member</dt>
                <dd>{{ selectedInvestment.minimumSharesPerMember | number }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.maximumSharesPerMember">
                <dt>Max Shares / Member</dt>
                <dd>{{ selectedInvestment.maximumSharesPerMember | number }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.targetGrossProfit">
                <dt>Target Gross Profit</dt>
                <dd>{{ formatCurrency(selectedInvestment.targetGrossProfit) }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.grossReceivedAmount">
                <dt>Gross Received</dt>
                <dd>{{ formatCurrency(selectedInvestment.grossReceivedAmount) }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.interimProfitTotal">
                <dt>Interim Profits</dt>
                <dd class="pos">{{ formatCurrency(selectedInvestment.interimProfitTotal) }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.totalProjectCost">
                <dt>Project Costs</dt>
                <dd class="neg">{{ formatCurrency(selectedInvestment.totalProjectCost) }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.maintenancePercentage > 0">
                <dt>Maintenance</dt>
                <dd>{{ selectedInvestment.maintenancePercentage }}% of profit</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.certificateNumber">
                <dt>Certificate No.</dt>
                <dd>{{ selectedInvestment.certificateNumber }}</dd>
              </div>
              <div class="def" *ngIf="selectedInvestment.referenceNumber">
                <dt>Reference No.</dt>
                <dd>{{ selectedInvestment.referenceNumber }}</dd>
              </div>
            </dl>
          </div>

          <div class="vmodal-section" *ngIf="selectedInvestment.description">
            <h4 class="vmodal-section-title"><span class="material-icons">notes</span> Description</h4>
            <p class="vmodal-desc">{{ selectedInvestment.description }}</p>
          </div>

          <div class="vmodal-section" *ngIf="selectedInvestment.partners?.length">
            <div class="vmodal-section-head">
              <h4 class="vmodal-section-title"><span class="material-icons">handshake</span> Partners</h4>
              <span class="vmodal-count">{{ selectedInvestment.partners.length }}</span>
            </div>
            <div class="vmodal-rows">
              <div class="vrow partner" *ngFor="let p of selectedInvestment.partners">
                <div class="vrow-avatar">{{ getInitials(p.partnerName) }}</div>
                <div class="vrow-main">
                  <span class="vrow-name">{{ p.partnerName }}</span>
                  <span class="vrow-meta">{{ p.phone1 }}<ng-container *ngIf="p.email"> &middot; {{ p.email }}</ng-container></span>
                  <span class="vrow-meta" *ngIf="p.nomineeName">Nominee: {{ p.nomineeName }}<ng-container *ngIf="p.nomineeRelationship"> ({{ p.nomineeRelationship }})</ng-container></span>
                </div>
                <span class="vrow-tag" *ngIf="p.memberId">Member</span>
              </div>
            </div>
          </div>

          <div class="vmodal-section" *ngIf="selectedInvestment.members && selectedInvestment.members.length > 0">
            <div class="vmodal-section-head">
              <h4 class="vmodal-section-title"><span class="material-icons">group</span> Invested Members</h4>
              <span class="vmodal-count">{{ selectedInvestment.members.length }}</span>
            </div>
            <div class="vmodal-rows">
              <div class="vrow" *ngFor="let m of selectedInvestment.members">
                <div class="vrow-avatar">{{ getInitials(m.memberName) }}</div>
                <div class="vrow-main">
                  <span class="vrow-name">{{ m.memberName }}</span>
                  <span class="vrow-meta">{{ m.sharePercentage.toFixed(2) }}% share</span>
                </div>
                <span class="vrow-value">{{ formatCurrency(m.shareValue) }}</span>
              </div>
            </div>
          </div>

          <div class="vmodal-section" *ngIf="selectedInvestment.documents?.length">
            <div class="vmodal-section-head">
              <h4 class="vmodal-section-title"><span class="material-icons">attach_file</span> Documents</h4>
              <span class="vmodal-count">{{ selectedInvestment.documents.length }}</span>
            </div>
            <div class="vmodal-rows">
              <a class="vrow doc" *ngFor="let d of selectedInvestment.documents" [href]="d.fileUrl" target="_blank" rel="noopener">
                <span class="vrow-docicon material-icons">description</span>
                <div class="vrow-main">
                  <span class="vrow-name">{{ d.fileName }}</span>
                  <span class="vrow-meta">{{ (d.fileSizeBytes / 1024) | number:'1.0-0' }} KB</span>
                </div>
                <span class="material-icons vrow-arrow">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Form -->
    <app-investment-form
      *ngIf="showForm"
      [investment]="editingInvestment"
      (saved)="onFormSaved()"
      (cancelled)="onFormCancelled()">
    </app-investment-form>

    <!-- Shares & Lifecycle -->
    <app-investment-manage
      *ngIf="managing"
      [investment]="managing"
      [isAdmin]="isAdmin"
      (changed)="loadInvestments()"
      (closed)="managing = null">
    </app-investment-manage>

    <!-- Invest / Buy Shares -->
    <div class="modal-overlay" *ngIf="investingInvestment" (click)="cancelInvest()">
      <div class="modal-content invest-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Invest in {{ investingInvestment.name }}</h3>
          <button class="close-btn" (click)="cancelInvest()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body" *ngIf="investingInvestment as inv">
          <div class="invest-summary">
            <div><span class="k">Share Price</span><span class="v">{{ formatCurrency(inv.sharePrice || 0) }}</span></div>
            <div><span class="k">Available</span><span class="v">{{ inv.remainingShares }}</span></div>
            <div *ngIf="inv.minimumSharesPerMember"><span class="k">Minimum</span><span class="v">{{ inv.minimumSharesPerMember }}</span></div>
            <div *ngIf="inv.maximumSharesPerMember"><span class="k">Maximum</span><span class="v">{{ inv.maximumSharesPerMember }}</span></div>
          </div>

          <div class="field">
            <label>Number of shares *</label>
            <input
              type="number"
              min="1"
              [max]="inv.remainingShares"
              step="1"
              [(ngModel)]="investShares"
              name="invest-shares" />
            <span class="field-error" *ngIf="investShares && (inv.minimumSharesPerMember && investShares < inv.minimumSharesPerMember)">
              Minimum purchase is {{ inv.minimumSharesPerMember }} share(s).
            </span>
          </div>

          <div class="field" *ngIf="isAdmin && investBalances.length > 0">
            <label>Invest on behalf of (delegation)</label>
            <select [(ngModel)]="investForMemberId" name="invest-member">
              <option [ngValue]="null">Myself</option>
              <option *ngFor="let b of investBalances" [ngValue]="b.memberId">
                {{ b.memberName }}
              </option>
            </select>
            <span class="field-hint">Select a member to allocate the shares to their account.</span>
          </div>

          <div class="cost-box">
            <span class="k">Total cost</span>
            <span class="v">{{ formatCurrency((investShares || 0) * (inv.sharePrice || 0)) }}</span>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-secondary" (click)="cancelInvest()">Cancel</button>
          <button
            class="btn-invest-confirm"
            [disabled]="isInvesting || !investValid()"
            (click)="confirmInvest()">
            <span class="material-icons">payments</span>
            {{ isInvesting ? 'Investing...' : 'Confirm Investment' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div class="modal-overlay" *ngIf="showDeleteModal" (click)="cancelDelete()">
      <div class="modal-content delete-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Delete Investment</h3>
          <button class="close-btn" (click)="cancelDelete()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>Delete <strong>{{ deletingInvestment?.name }}</strong>?</p>
          <p class="warning-text">
            This also removes its partner records and supporting documents. This cannot be undone.
          </p>
        </div>
        <div class="form-actions">
          <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
          <button class="btn-danger" (click)="deleteInvestment()" [disabled]="isDeleting">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Delete confirmation modal */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-content.delete-modal { max-width: 400px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; }
    .modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #666; }
    .modal-body { padding: 24px; }
    .modal-body p { margin: 0 0 12px 0; color: #333; }
    .warning-text { color: #e74c3c; font-size: 13px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; padding: 0 24px 24px; }
    .btn-secondary { padding: 12px 24px; background: #f5f6fa; color: #666; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; }
    .btn-secondary:hover { background: #eee; }
    .btn-danger { padding: 12px 24px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; }
    .btn-danger:hover:not(:disabled) { background: #c0392b; }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-icon.danger { color: #e74c3c; }

    /* Status pill */
    .investment-meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
    .meta-chip { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 500; background: #f1f3f9; color: #555; }
    .status-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .status-active { background: #e8f5e9; color: #2e7d32; }
    .status-matured { background: #e3f2fd; color: #1565c0; }
    .status-closed { background: #eceff1; color: #546e7a; }
    .status-suspended { background: #fff3e0; color: #ef6c00; }

    .investments-wrapper { max-width: 1600px; margin: 0 auto; padding: 20px 24px; box-sizing: border-box; }

    /* Stats */
    .stats-section { margin-bottom: 16px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

    /* Filter Section */
    .filter-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: white; padding: 12px 16px; border-radius: var(--radius-lg, 12px); border: 1px solid var(--color-border-light, #f1f5f9); box-shadow: var(--shadow-card, none); }
    .filter-left { display: flex; align-items: center; gap: 12px; }
    .view-toggle { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); overflow: hidden; }
    .view-toggle button { background: white; border: none; padding: 8px 12px; cursor: pointer; color: var(--text-muted, #64748b); transition: all 0.2s; }
    .view-toggle button:hover { background: var(--color-background-alt, #f8fafc); }
    .view-toggle button.active { background: var(--color-accent, #0d9488); color: white; }
    .filter-group select { padding: 8px 12px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); font-size: 13px; background: white; cursor: pointer; color: var(--text-primary, #0f172a); }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); background: white; }
    .search-box .material-icons { color: var(--text-muted, #64748b); font-size: 18px; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 13px; width: 200px; color: var(--text-primary, #0f172a); }

    /* Button Styles */
    .btn-refresh { background: white; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); padding: 8px; cursor: pointer; color: var(--text-muted, #64748b); transition: all 0.2s; }
    .btn-refresh:hover { background: var(--color-accent, #0d9488); color: white; border-color: var(--color-accent, #0d9488); }
    .btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: linear-gradient(135deg, #0d9488, #1e40af); color: white; border: none; border-radius: var(--radius-md, 8px); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary:hover { box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35); }

    /* Invest / buy share */
    .btn-invest { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; background: linear-gradient(135deg, #059669, #0d9488); color: white; border: none; border-radius: var(--radius-md, 8px); font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-invest .material-icons { font-size: 16px; }
    .btn-invest:hover { box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35); }
    .btn-invest-table { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
    .btn-invest-table:hover { box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4); }
    .invest-modal { max-width: 460px; }
    .invest-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .invest-summary > div { display: flex; flex-direction: column; gap: 3px; }
    .invest-summary .k { font-size: 12px; color: #888; }
    .invest-summary .v { font-size: 16px; font-weight: 600; color: #1a1a2e; }
    .cost-box { display: flex; justify-content: space-between; align-items: center; background: #e8f5e9; border-radius: 12px; padding: 14px 16px; margin-top: 12px; }
    .cost-box .k { font-size: 13px; color: #2e7d32; }
    .cost-box .v { font-size: 20px; font-weight: 700; color: #1b5e20; }
    .btn-invest-confirm { display: inline-flex; align-items: center; gap: 6px; padding: 11px 20px; background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-invest-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Loading */
    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; }
    .spinner { width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Grid View */
    .investments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; align-items: stretch; perspective: 1200px; }
    .investment-card { display: flex; flex-direction: column; background: white; border: 1px solid var(--color-border-light, #eef2f7); border-radius: var(--radius-xl, 14px); padding: 14px 14px 12px; box-shadow: var(--shadow-card, 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)); transition: all 0.25s ease; animation: fadeInUp 0.4s ease forwards; opacity: 0; overflow: hidden; min-width: 0; transform-style: preserve-3d; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .investment-card:hover { transform: translateY(-3px) rotateX(1deg) rotateY(-1deg) scale(1.01); box-shadow: 0 18px 40px rgba(0,0,0,0.16), 0 6px 16px rgba(0,0,0,0.10); }
    .investment-card::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0)); pointer-events: none; }

    .icard-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 12px; min-width: 0; }
    .icard-type { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .icard-type .material-icons { font-size: 14px; }
    .icard-type.stock { background: #e3f2fd; color: #1976d2; }
    .icard-type.bond { background: #f3e5f5; color: #7b1fa2; }
    .icard-type.realestate { background: #e8f5e9; color: #388e3c; }
    .icard-type.business { background: #ccfbf1; color: #0f766e; }
    .icard-type.savings { background: #fff3e0; color: #f57c00; }
    .icard-type.fixeddeposit { background: #fce4ec; color: #c2185b; }
    .icard-type.other { background: #eceff1; color: #546e7a; }
    .icard-status { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--color-background-alt, #f8fafc); color: var(--text-muted, #64748b); max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .icard-status .material-icons { font-size: 13px; }
    .icard-status.active { background: #ecfdf5; color: var(--color-success, #059669); }
    .icard-status.circulated { background: #ecfdf5; color: var(--color-success, #059669); }
    .icard-status.closed { background: #fef2f2; color: var(--color-error, #dc2626); }
    .icard-status.completed { background: #f0f9ff; color: var(--color-info, #0284c7); }

    .icard-name { font-size: 15px; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0 0 2px; letter-spacing: -0.2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .icard-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 4px 0 8px; }
    .icard-meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--text-muted, #64748b); min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .icard-meta-item .material-icons { font-size: 13px; }
    .icard-desc-wrap { position: relative; margin-bottom: 10px; min-height: 35px; }
    .icard-desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 12px; color: var(--text-secondary, #475569); margin: 0; line-height: 1.45; }
    .icard-readmore { display: inline-block; margin-top: 2px; font-size: 11.5px; font-weight: 600; color: var(--color-accent, #0d9488); cursor: pointer; }
    .icard-desc-tooltip { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 20; background: #0f172a; color: #f1f5f9; padding: 10px 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; box-shadow: 0 8px 24px rgba(0,0,0,0.18); white-space: normal; word-break: break-word; }
    .icard-desc-tooltip::before { content: ''; position: absolute; left: 16px; top: -5px; width: 10px; height: 10px; background: #0f172a; transform: rotate(45deg); }

    .icard-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
    .icard-stat { background: var(--color-background-alt, #f8fafc); border: 1px solid var(--color-border-light, #f1f5f9); border-radius: var(--radius-lg, 10px); padding: 7px 8px; min-width: 0; }
    .icard-stat-label { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-muted, #64748b); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .icard-stat-value { display: block; font-size: 13.5px; font-weight: 700; color: var(--text-primary, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .icard-stat-value.pos { color: var(--color-success, #059669); }
    .icard-stat-value.neg { color: var(--color-error, #dc2626); }
    .icard-stat-sub { display: block; font-style: normal; font-size: 11px; font-weight: 600; opacity: 0.85; }

    .icard-progress { margin-bottom: 10px; }
    .icard-progress-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .icard-progress-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-muted, #64748b); font-weight: 600; }
    .icard-progress-pct { font-size: 11.5px; font-weight: 700; color: var(--color-success, #059669); }
    .icard-progress-bar { height: 5px; background: var(--color-border, #e2e8f0); border-radius: 999px; overflow: hidden; }
    .icard-progress-fill { height: 100%; background: linear-gradient(90deg, #14b8a6, #0d9488); border-radius: 999px; transition: width 0.5s ease; }
    .icard-progress-fill.neg { background: linear-gradient(90deg, #f87171, #dc2626); }

    .icard-shares { margin-bottom: 10px; padding: 8px 10px; min-height: 58px; background: var(--color-background-alt, #f8fafc); border: 1px solid var(--color-border-light, #f1f5f9); border-radius: var(--radius-lg, 10px); }
    .icard-shares-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
    .icard-shares-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-muted, #64748b); font-weight: 600; }
    .icard-shares-count { font-size: 12px; color: var(--text-muted, #64748b); }
    .icard-shares-count strong { font-size: 13px; color: var(--color-accent, #0d9488); font-weight: 700; }
    .icard-shares-bar { height: 5px; background: var(--color-border, #e2e8f0); border-radius: 999px; overflow: hidden; }
    .icard-shares-fill { height: 100%; background: linear-gradient(90deg, #14b8a6, #0d9488); border-radius: 999px; transition: width 0.5s ease; }
    .icard-shares-fill.sold-out { background: linear-gradient(90deg, #34d399, #059669); }
    .icard-shares-foot { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10.5px; color: var(--text-muted, #64748b); }
    .icard-shares-pct { font-weight: 600; color: var(--color-accent, #0d9488); }

    .icard-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--color-divider, #f0f0f0); }
    .members-preview { display: flex; align-items: center; gap: 8px; }
    .member-avatars { display: flex; }
    .avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #14b8a6, #0f172a); color: white; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 600; margin-left: -7px; border: 2px solid white; }
    .avatar:first-child { margin-left: 0; }
    .avatar.more { background: #e2e8f0; color: var(--text-muted, #64748b); font-size: 8px; }
    .members-count { font-size: 11px; color: var(--text-muted, #64748b); }
    .card-actions { display: flex; gap: 4px; }
    .btn-icon { background: white; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); padding: 5px; cursor: pointer; color: var(--text-muted, #64748b); transition: all 0.2s; }
    .btn-icon .material-icons { font-size: 17px; }
    .btn-icon:hover { background: var(--color-background-alt, #f8fafc); color: var(--color-accent, #0d9488); border-color: var(--color-accent, #0d9488); }

    /* Empty State */
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 48px 32px; background: white; border: 1px solid var(--color-border-light, #f1f5f9); border-radius: var(--radius-xl, 16px); }
    .empty-state .material-icons { font-size: 48px; color: var(--color-accent, #0d9488); opacity: 0.45; }
    .empty-state h3 { font-size: 18px; color: var(--text-primary, #0f172a); margin: 12px 0 6px; }
    .empty-state p { color: var(--text-muted, #64748b); margin-bottom: 16px; }

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

    /* ==== Investment detail (view) modal ==== */
    .vmodal { max-width: 760px; border-radius: var(--radius-xl, 16px); overflow: hidden; box-shadow: var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.18)); }
    .vmodal-hero { padding: 24px 28px 20px; color: #fff; background: linear-gradient(135deg, var(--color-navy, #0f172a) 0%, #134e4a 100%); }
    .vmodal-hero-top { display: flex; align-items: center; gap: 10px; }
    .vmodal-type { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; background: rgba(255,255,255,0.14); color: #fff; }
    .vmodal-type .material-icons { font-size: 15px; }
    .vmodal-status { margin-left: auto; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255,255,255,0.18); color: #fff; }
    .vmodal-close { margin-left: 4px; background: rgba(255,255,255,0.12); border: none; color: #fff; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background .2s; }
    .vmodal-close:hover { background: rgba(255,255,255,0.24); }
    .vmodal-title { margin: 14px 0 2px; font-size: 22px; font-weight: 700; letter-spacing: -0.2px; }
    .vmodal-subtitle { margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); }
    .vmodal-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; }
    .kpi { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.10); border-radius: var(--radius-lg, 12px); padding: 12px 14px; }
    .kpi-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
    .kpi-value { display: block; font-size: 17px; font-weight: 700; }
    .kpi-value.pos { color: #34d399; }
    .kpi-value.neg { color: #fca5a5; }
    .kpi-sub { display: block; font-style: normal; font-size: 12px; font-weight: 600; opacity: .85; margin-top: 1px; }
    .kpi-progress { display: block; height: 5px; background: rgba(255,255,255,0.18); border-radius: 999px; margin-top: 7px; overflow: hidden; }
    .kpi-progress i { display: block; height: 100%; background: linear-gradient(90deg, #2dd4bf, #14b8a6); border-radius: 999px; }
    .vmodal-body { padding: 12px 28px 28px; }
    .vmodal-section { padding: 20px 0; border-bottom: 1px solid var(--color-divider, #f0f0f0); }
    .vmodal-section:last-child { border-bottom: none; }
    .vmodal-section-head { display: flex; align-items: center; justify-content: space-between; }
    .vmodal-section-title { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; font-size: 14px; font-weight: 700; color: var(--text-primary, #0f172a); letter-spacing: -0.1px; }
    .vmodal-section-head .vmodal-section-title { margin-bottom: 14px; }
    .vmodal-section-title .material-icons { font-size: 18px; color: var(--color-accent, #0d9488); }
    .vmodal-count { font-size: 12px; font-weight: 600; color: var(--text-muted, #64748b); background: var(--color-background-alt, #f8fafc); border-radius: 999px; padding: 3px 10px; margin-bottom: 14px; }
    .vmodal-defs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px 24px; margin: 0; }
    .def dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted, #64748b); margin-bottom: 3px; }
    .def dd { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary, #0f172a); }
    .def dd.pos { color: var(--color-success, #059669); }
    .def-muted { font-weight: 500; color: var(--text-muted, #64748b); }
    .vmodal-desc { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text-secondary, #475569); white-space: pre-wrap; }
    .vmodal-rows { display: flex; flex-direction: column; gap: 10px; }
    .vrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--color-background-alt, #f8fafc); border: 1px solid var(--color-border-light, #f1f5f9); border-radius: var(--radius-lg, 12px); transition: border-color .2s, background .2s; }
    .vrow.partner:hover, .vrow:hover:not(.doc) { border-color: var(--color-border, #e2e8f0); }
    .vrow-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--color-accent, #0d9488), var(--color-navy, #0f172a)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .vrow-main { flex: 1; min-width: 0; }
    .vrow-name { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary, #0f172a); }
    .vrow-meta { display: block; font-size: 12.5px; color: var(--text-muted, #64748b); }
    .vrow-value { font-weight: 700; color: var(--text-primary, #0f172a); }
    .vrow-tag { font-size: 11px; font-weight: 600; color: var(--color-accent, #0d9488); background: var(--color-accent-subtle, #ccfbf1); padding: 3px 10px; border-radius: 999px; }
    .vrow.doc { text-decoration: none; color: inherit; cursor: pointer; }
    .vrow.doc:hover { border-color: var(--color-accent, #0d9488); }
    .vrow-docicon { color: var(--color-accent, #0d9488); }
    .vrow-arrow { color: var(--text-light, #94a3b8); font-size: 18px; }

    .material-icons { font-size: 20px; }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 992px) {
      .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
      .header-actions { width: 100%; flex-wrap: wrap; }
      .stats-grid { grid-template-columns: 1fr; }
      .chart-section { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .top-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .search-box { width: 100%; }
      .view-toggle { display: none; }
      .investments-grid { grid-template-columns: 1fr; }
      .table-container { overflow-x: auto; }
      .investments-table { min-width: 600px; }
    }
    @media (max-width: 576px) {
      .investments-wrapper { padding: 16px; }
      .stat-card { padding: 16px; }
      .stat-card .stat-value { font-size: 20px; }
      .btn { padding: 8px 12px; font-size: 13px; }
      .modal-content { margin: 12px; }
    }
    @media (max-width: 480px) {
      .investments-wrapper { padding: 12px; }
    }
  `]
})
export class InvestmentsComponent implements OnInit, OnDestroy {
  investments: Investment[] = [];
  filteredInvestments: Investment[] = [];
  viewMode: 'grid' | 'table' | 'chart' = 'grid';
  filterType = '';
  filterStatus = '';
  searchTerm = '';
  isLoading = false;
  showViewModal = false;
  selectedInvestment: Investment | null = null;

  descMeta: Record<string, boolean> = {};
  hoveredDescId: string | null = null;

  showForm = false;
  editingInvestment: Investment | null = null;

  managing: Investment | null = null;
  isAdmin = false;

  investingInvestment: Investment | null = null;
  investShares: number | null = null;
  investForMemberId: string | null = null;
  investBalances: { memberId: string; memberName: string }[] = [];
  isInvesting = false;

  showDeleteModal = false;
  deletingInvestment: Investment | null = null;
  isDeleting = false;

  private destroy$ = new Subject<void>();

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
    private investmentService: InvestmentService,
    private toast: ToastService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const role = this.userService.getRole();
    this.isAdmin = role === 'Admin' || role === 'Manager';
    this.loadInvestments();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInvestments() {
    this.isLoading = true;
    const source = this.isAdmin
      ? this.investmentService.getInvestments()
      : this.investmentService.getPublishedInvestments();
    source
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.investments = data || [];
          this.applyFilters();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
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

    if (this.filterStatus) {
      data = data.filter(inv => inv.status === this.filterStatus);
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
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  }

  getTypeIcon(type: string): string {
    // Keys must match the InvestmentType enum exactly.
    const icons: { [key: string]: string } = {
      'Stocks': 'show_chart',
      'RealEstate': 'home',
      'Business': 'storefront',
      'Savings': 'savings',
      'Other': 'category'
    };
    return icons[type] || 'category';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  manageInvestment(investment: Investment) {
    // Re-fetch so the panel opens with current share counts and settlement state.
    this.investmentService
      .getInvestment(investment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: full => {
          this.managing = full;
          this.cdr.detectChanges();
        },
        error: () => this.toast.error('Could not load the investment.'),
      });
  }

  openInvest(investment: Investment) {
    this.investingInvestment = investment;
    this.investShares = investment.minimumSharesPerMember ?? 1;
    this.investForMemberId = null;
    if (this.isAdmin && this.investBalances.length === 0) {
      this.loadInvestBalances();
    }
  }

  private loadInvestBalances(): void {
    this.investmentService
      .getAllBalances()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: b => (this.investBalances = b),
        error: () => (this.investBalances = []),
      });
  }

  cancelInvest() {
    this.investingInvestment = null;
    this.investShares = null;
    this.investForMemberId = null;
    this.isInvesting = false;
  }

  investValid(): boolean {
    const inv = this.investingInvestment;
    if (!inv || !this.investShares || this.investShares < 1) return false;
    if (this.investShares > inv.remainingShares) return false;
    if (inv.minimumSharesPerMember && this.investShares < inv.minimumSharesPerMember) return false;
    if (inv.maximumSharesPerMember && this.investShares > inv.maximumSharesPerMember) return false;
    return true;
  }

  confirmInvest() {
    if (!this.investingInvestment || !this.investValid()) {
      this.toast.error('Please enter a valid number of shares.');
      return;
    }

    this.isInvesting = true;
    this.investmentService
      .subscribe(this.investingInvestment.id, this.investShares!, this.investForMemberId ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(
            this.investForMemberId
              ? `${this.investShares} share(s) allocated.`
              : `${this.investShares} share(s) purchased.`,
          );
          this.isInvesting = false;
          this.cancelInvest();
          this.loadInvestments();
        },
        error: err => {
          this.isInvesting = false;
          this.toast.error(err?.error?.message || 'Could not complete the purchase.');
        },
      });
  }

  openCreateModal() {
    this.editingInvestment = null;
    this.showForm = true;
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
    // Re-fetch so the form gets partners and documents, which the list view
    // does not need to render and may not have kept current.
    this.investmentService
      .getInvestment(investment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: full => {
          this.editingInvestment = full;
          this.showForm = true;
          this.cdr.detectChanges();
        },
        error: () => this.toast.error('Could not load the investment.'),
      });
  }

  onFormSaved() {
    this.showForm = false;
    this.editingInvestment = null;
    this.loadInvestments();
  }

  onFormCancelled() {
    this.showForm = false;
    this.editingInvestment = null;
  }

  confirmDelete(investment: Investment) {
    this.deletingInvestment = investment;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.deletingInvestment = null;
  }

  deleteInvestment() {
    if (!this.deletingInvestment) return;

    this.isDeleting = true;
    this.investmentService
      .deleteInvestment(this.deletingInvestment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.deletingInvestment = null;
          this.toast.success('Investment deleted.');
          this.loadInvestments();
        },
        error: err => {
          this.isDeleting = false;
          this.toast.error(err?.error?.message || 'Could not delete the investment.');
          this.cdr.detectChanges();
        },
      });
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'Draft': 'Draft',
      'OpenForSubscription': 'Open for Subscription',
      'FullySubscribed': 'Fully Subscribed',
      'Active': 'Active',
      'Completed': 'Completed',
      'ProfitDistributed': 'Profit Distributed',
      'Closed': 'Closed',
      'Cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  statusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Draft': 'edit_note',
      'OpenForSubscription': 'storefront',
      'FullySubscribed': 'verified',
      'Active': 'trending_up',
      'Completed': 'task_alt',
      'ProfitDistributed': 'payments',
      'Closed': 'lock',
      'Cancelled': 'block'
    };
    return icons[status] || 'circle';
  }

  /** Return progress normalised to 0–100 for the card bar. */
  returnProgress(pct: number): number {
    return Math.min(Math.max(((pct + 10) / 20) * 100, 0), 100);
  }

  /** Mark a description as truncated (scrolls past its clamped box) for the "Read more" affordance. */
  onDescEnter(id: string, el: EventTarget | null): void {
    const desc = (el as HTMLElement | null)?.querySelector('.icard-desc') as HTMLElement | null;
    const truncated = !!desc && desc.scrollHeight > desc.clientHeight + 1;
    this.descMeta = { ...this.descMeta, [id]: truncated };
    this.hoveredDescId = truncated ? id : null;
  }

  onDescLeave(): void {
    this.hoveredDescId = null;
  }
}
