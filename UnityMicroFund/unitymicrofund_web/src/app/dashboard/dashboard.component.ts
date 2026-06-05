import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Token } from '../core/services/token';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subscription } from 'rxjs';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';

interface DashboardStats {
  totalPoolAmount: number;
  totalMembersCount: number;
  monthlyContributionTotal: number;
  activeInvestmentsCount: number;
  totalReturns: number;
  returnPercentage: number;
  pendingContributions: number;
  averageContribution: number;
  totalInvested: number;
  contributionsThisMonth: number;
  recentActivities: RecentActivity[];
  topInvestors: TopInvestor[];
  monthlyTrend: MonthlyTrend;
}

interface RecentActivity {
  type: string;
  description: string;
  memberName: string;
  amount: number;
  date: string;
}

interface TopInvestor {
  memberName: string;
  totalContributions: number;
  sharePercentage: number;
}

interface MonthlyTrend {
  labels: string[];
  contributions: number[];
  investments: number[];
  returns: number[];
}

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-wrapper">
      <!-- Welcome Section -->
      <header class="dashboard-header">
        <div class="welcome-section">
          <div class="welcome-content">
            <h1>Welcome back, <span class="user-name">{{ userName }}</span></h1>
            <p class="date-display">{{ currentDate | date:'EEEE, MMMM d, y' }}</p>
            <p class="subtitle">Here's what's happening with your microfund today.</p>
          </div>
          <div class="header-actions">
            <button class="btn-refresh" (click)="refreshData()" [class.spinning]="isLoading">
              <span class="material-icons">refresh</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Loading State -->
      <div *ngIf="isLoading && !hasData" class="loading-container">
        <div class="loader">
          <div class="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>

      <!-- Main Content -->
      <div *ngIf="!isLoading || hasData" class="dashboard-content">
        <!-- Stats Cards -->
        <section class="stats-section">
          <div class="stats-grid">
            <div class="stat-card stat-card-primary">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <span class="material-icons">account_balance_wallet</span>
                </div>
                <div class="stat-glow"></div>
              </div>
              <div class="stat-content">
                <span class="stat-label">Total Pool Amount</span>
                <span class="stat-value">{{ stats.totalPoolAmount | bdtCurrency }}</span>
                <div class="stat-trend positive">
                  <span class="material-icons">trending_up</span>
                  <span>+12.5% from last month</span>
                </div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper">
                <div class="stat-icon" style="background: linear-gradient(135deg, #27ae60, #2ecc71);">
                  <span class="material-icons">people</span>
                </div>
              </div>
              <div class="stat-content">
                <span class="stat-label">Active Investors</span>
                <span class="stat-value">{{ stats.totalMembersCount }}</span>
                <div class="stat-detail">{{ stats.contributionsThisMonth }} contributions this month</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper">
                <div class="stat-icon" style="background: linear-gradient(135deg, #3498db, #2980b9);">
                  <span class="material-icons">payments</span>
                </div>
              </div>
              <div class="stat-content">
                <span class="stat-label">Monthly Contribution</span>
                <span class="stat-value">{{ stats.monthlyContributionTotal | bdtCurrency }}</span>
                <div class="stat-detail">Avg: {{ stats.averageContribution | bdtCurrency }} per investor</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper">
                <div class="stat-icon" style="background: linear-gradient(135deg, #9b59b6, #8e44ad);">
                  <span class="material-icons">trending_up</span>
                </div>
              </div>
              <div class="stat-content">
                <span class="stat-label">Total Returns</span>
                <span class="stat-value">{{ stats.totalReturns | bdtCurrency }}</span>
                <div class="stat-trend" [class.positive]="stats.returnPercentage >= 0" [class.negative]="stats.returnPercentage < 0">
                  <span class="material-icons">{{ stats.returnPercentage >= 0 ? 'trending_up' : 'trending_down' }}</span>
                  <span>{{ stats.returnPercentage | number:'1.1-1' }}% ROI</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Charts Section -->
        <section class="charts-section">
          <div class="charts-grid">
            <!-- Main Chart -->
            <div class="chart-card chart-main">
              <div class="chart-header">
                <h3><span class="material-icons">show_chart</span> Contribution Trends</h3>
                <div class="chart-legend">
                  <span class="legend-item"><span class="dot" style="background: #667eea;"></span> Contributions</span>
                  <span class="legend-item"><span class="dot" style="background: #27ae60;"></span> Investments</span>
                </div>
              </div>
              <div class="chart-container">
                <canvas baseChart
                  [data]="lineChartData"
                  [options]="lineChartOptions"
                  [type]="'line'">
                </canvas>
              </div>
            </div>

            <!-- Doughnut Chart -->
            <div class="chart-card chart-side">
              <div class="chart-header">
                <h3><span class="material-icons">pie_chart</span> Portfolio Breakdown</h3>
              </div>
              <div class="chart-container-doughnut">
                <canvas baseChart
                  [data]="doughnutChartData"
                  [options]="doughnutChartOptions"
                  [type]="'doughnut'">
                </canvas>
              </div>
              <div class="doughnut-legend">
                <div class="legend-row">
                  <span class="legend-color" style="background: #667eea;"></span>
                  <span class="legend-label">Investments</span>
                  <span class="legend-value">{{ stats.totalInvested | bdtCurrency }}</span>
                </div>
                <div class="legend-row">
                  <span class="legend-color" style="background: #27ae60;"></span>
                  <span class="legend-label">Pool</span>
                  <span class="legend-value">{{ stats.totalPoolAmount - stats.totalInvested | bdtCurrency }}</span>
                </div>
                <div class="legend-row">
                  <span class="legend-color" style="background: #f39c12;"></span>
                  <span class="legend-label">Returns</span>
                  <span class="legend-value">{{ stats.totalReturns | bdtCurrency }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Bottom Section -->
        <section class="bottom-section">
          <div class="bottom-grid">
            <!-- Recent Activities -->
            <div class="activity-card">
              <div class="card-header">
                <h3><span class="material-icons">history</span> Recent Activity</h3>
                <a routerLink="/payments" class="view-all">View All</a>
              </div>
              <div class="activity-list">
                <div class="activity-item" *ngFor="let activity of stats.recentActivities; let i = index" [style.animation-delay]="i * 50 + 'ms'">
                  <div class="activity-icon" [ngClass]="activity.type.toLowerCase()">
                    <span class="material-icons">{{ activity.type === 'Contribution' ? 'savings' : 'trending_up' }}</span>
                  </div>
                  <div class="activity-content">
                    <div class="activity-main">
                      <span class="activity-title">{{ activity.memberName }}</span>
                      <span class="activity-amount">{{ activity.amount | bdtCurrency }}</span>
                    </div>
                    <div class="activity-detail">
                      <span class="activity-desc">{{ activity.description }}</span>
                      <span class="activity-time">{{ getTimeAgo(activity.date) }}</span>
                    </div>
                  </div>
                </div>
                <div class="empty-activity" *ngIf="stats.recentActivities.length === 0">
                  <span class="material-icons">inbox</span>
                  <p>No recent activities</p>
                </div>
              </div>
            </div>

            <!-- Top Investors -->
            <div class="investors-card">
              <div class="card-header">
                <h3><span class="material-icons">star</span> Top Investors</h3>
                <a routerLink="/investors" class="view-all">View All</a>
              </div>
              <div class="investors-list">
                <div class="investor-item" *ngFor="let investor of stats.topInvestors; let i = index" [style.animation-delay]="i * 50 + 'ms'">
                  <div class="investor-rank" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                    #{{ i + 1 }}
                  </div>
                  <div class="investor-avatar">
                    {{ getInitials(investor.memberName) }}
                  </div>
                  <div class="investor-info">
                    <span class="investor-name">{{ investor.memberName }}</span>
                    <div class="investor-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="investor.sharePercentage"></div>
                      </div>
                      <span class="investor-share">{{ investor.sharePercentage | number:'1.1-1' }}%</span>
                    </div>
                  </div>
                  <div class="investor-amount">
                    {{ investor.totalContributions | bdtCurrency }}
                  </div>
                </div>
                <div class="empty-investors" *ngIf="stats.topInvestors.length === 0">
                  <span class="material-icons">people_outline</span>
                  <p>No investors yet</p>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="actions-card">
              <div class="card-header">
                <h3><span class="material-icons">bolt</span> Quick Actions</h3>
              </div>
              <div class="actions-grid">
                <a routerLink="/accounts" class="action-item">
                  <div class="action-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                    <span class="material-icons">account_balance</span>
                  </div>
                  <span>Accounts</span>
                </a>
                <a routerLink="/investors" class="action-item">
                  <div class="action-icon" style="background: linear-gradient(135deg, #27ae60, #2ecc71);">
                    <span class="material-icons">person_add</span>
                  </div>
                  <span>Add Investor</span>
                </a>
                <a routerLink="/payments" class="action-item">
                  <div class="action-icon" style="background: linear-gradient(135deg, #3498db, #2980b9);">
                    <span class="material-icons">payments</span>
                  </div>
                  <span>Payments</span>
                </a>
                <a routerLink="/reports" class="action-item">
                  <div class="action-icon" style="background: linear-gradient(135deg, #f39c12, #e67e22);">
                    <span class="material-icons">assessment</span>
                  </div>
                  <span>Reports</span>
                </a>
              </div>

              <!-- Pending Items Alert -->
              <div class="pending-alert" *ngIf="stats.pendingContributions > 0">
                <div class="alert-icon">
                  <span class="material-icons">notifications_active</span>
                </div>
                <div class="alert-content">
                  <strong>{{ stats.pendingContributions }}</strong> pending contributions need attention
                </div>
                <a routerLink="/payments" class="alert-action">Review</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper { width: 100%; }

    /* Header */
    .dashboard-header { margin-bottom: var(--space-6); }
    .welcome-section { display: flex; justify-content: space-between; align-items: flex-start; }
    .welcome-content h1 { font-size: var(--text-3xl); font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; line-height: 1.3; }
    .user-name { background: var(--brand-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .date-display { font-size: var(--text-sm); color: var(--color-accent); font-weight: 500; margin: 0 0 2px 0; }
    .subtitle { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }
    .header-actions { display: flex; gap: var(--space-2); }
    .btn-refresh { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; color: var(--text-muted); transition: all var(--transition-fast); }
    .btn-refresh:hover { background: var(--color-accent); color: white; border-color: var(--color-accent); }
    .btn-refresh.spinning .material-icons { animation: spin 1s linear infinite; }

    /* Loading */
    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; }
    .loader { text-align: center; }
    .loader .spinner { margin: 0 auto var(--space-3); }
    .loader p { color: var(--text-muted); font-size: var(--text-sm); }

    /* Stats Section */
    .stats-section { margin-bottom: var(--space-6); }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-5); }
    .stat-card { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-card); transition: all var(--transition-base); display: flex; gap: var(--space-4); animation: fadeInUp 0.5s ease forwards; opacity: 0; border: 1px solid var(--color-border-light); }
    .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
    .stat-card-primary { background: var(--brand-gradient); color: var(--text-white); border-color: transparent; }
    .stat-card-primary .stat-label { color: rgba(255,255,255,0.8); }
    .stat-card-primary .stat-value { color: white; }
    .stat-card-primary .stat-detail { color: rgba(255,255,255,0.7); }
    .stat-card-primary .stat-trend { background: rgba(255,255,255,0.2); }
    .stat-card-primary .stat-trend .material-icons { color: white; }
    .stat-icon-wrapper { position: relative; }
    .stat-icon { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.15); color: white; flex-shrink: 0; }
    .stat-card:not(.stat-card-primary) .stat-icon { background: var(--color-background-alt); color: var(--color-accent); }
    .stat-glow { position: absolute; top: -16px; right: -16px; width: 64px; height: 64px; background: rgba(255,255,255,0.08); border-radius: 50%; filter: blur(16px); }
    .stat-content { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .stat-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; }
    .stat-value { font-size: var(--text-3xl); font-weight: 700; color: var(--text-primary); margin: 2px 0; line-height: 1.2; }
    .stat-detail { font-size: var(--text-xs); color: var(--text-light); }
    .stat-trend { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-xs); padding: 3px 8px; border-radius: 100px; margin-top: 6px; background: var(--color-success-bg); color: var(--color-success); font-weight: 500; }
    .stat-trend.negative { background: var(--color-error-bg); color: var(--color-error); }

    /* Charts Section */
    .charts-section { margin-bottom: var(--space-6); }
    .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-5); }
    .chart-card { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-card); border: 1px solid var(--color-border-light); }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
    .chart-header h3 { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); margin: 0; }
    .chart-header h3 .material-icons { color: var(--color-accent); font-size: 18px; }
    .chart-legend { display: flex; gap: var(--space-4); }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--text-xs); color: var(--text-muted); }
    .legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }
    .chart-container { height: 260px; position: relative; }
    .chart-container-doughnut { height: 200px; display: flex; justify-content: center; }
    .doughnut-legend { margin-top: var(--space-4); }
    .legend-row { display: flex; align-items: center; gap: var(--space-3); padding: 6px 0; border-bottom: 1px solid var(--color-divider); }
    .legend-row:last-child { border-bottom: none; }
    .legend-color { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .legend-label { flex: 1; font-size: var(--text-sm); color: var(--text-muted); }
    .legend-value { font-weight: 600; color: var(--text-primary); font-size: var(--text-base); }

    /* Bottom Section */
    .bottom-section { margin-bottom: 0; }
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-5); }
    .activity-card, .investors-card, .actions-card { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-card); border: 1px solid var(--color-border-light); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
    .card-header h3 { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); margin: 0; }
    .card-header h3 .material-icons { color: var(--color-accent); font-size: 18px; }
    .view-all { font-size: var(--text-sm); color: var(--color-accent); text-decoration: none; font-weight: 500; transition: opacity var(--transition-fast); }
    .view-all:hover { opacity: 0.75; text-decoration: none; }

    /* Activity List */
    .activity-list { display: flex; flex-direction: column; gap: var(--space-2); max-height: 360px; overflow-y: auto; }
    .activity-item { display: flex; gap: var(--space-3); padding: 10px 12px; border-radius: var(--radius-md); transition: all var(--transition-fast); animation: fadeInUp 0.4s ease forwards; opacity: 0; cursor: default; }
    .activity-item:hover { background: var(--color-background-alt); }
    .activity-icon { width: 36px; height: 36px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .activity-icon .material-icons { font-size: 18px; }
    .activity-icon.contribution { background: var(--brand-gradient); color: white; }
    .activity-icon.investment { background: var(--color-success); color: white; }
    .activity-content { flex: 1; min-width: 0; }
    .activity-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .activity-title { font-weight: 600; color: var(--text-primary); font-size: var(--text-sm); }
    .activity-amount { font-weight: 700; color: var(--color-accent); font-size: var(--text-sm); }
    .activity-detail { display: flex; justify-content: space-between; font-size: var(--text-xs); color: var(--text-light); }
    .empty-activity, .empty-investors { text-align: center; padding: var(--space-8) var(--space-4); color: var(--text-light); }
    .empty-activity .material-icons, .empty-investors .material-icons { font-size: 40px; margin-bottom: var(--space-2); opacity: 0.4; }
    .empty-activity p, .empty-investors p { font-size: var(--text-sm); margin: 0; }

    /* Investors List */
    .investors-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .investor-item { display: flex; align-items: center; gap: var(--space-3); padding: 10px 12px; border-radius: var(--radius-md); transition: all var(--transition-fast); animation: fadeInUp 0.4s ease forwards; opacity: 0; }
    .investor-item:hover { background: var(--color-background-alt); }
    .investor-rank { width: 26px; height: 26px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: var(--text-xs); background: var(--color-background-alt); color: var(--text-muted); flex-shrink: 0; }
    .investor-rank.gold { background: linear-gradient(135deg, #ffd700, #ffb700); color: #5d4e00; }
    .investor-rank.silver { background: linear-gradient(135deg, #c0c0c0, #a8a8a8); color: #4a4a4a; }
    .investor-rank.bronze { background: linear-gradient(135deg, #cd7f32, #b5651d); color: #3d2500; }
    .investor-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand-gradient); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: var(--text-xs); flex-shrink: 0; }
    .investor-info { flex: 1; min-width: 0; }
    .investor-name { font-weight: 600; color: var(--text-primary); font-size: var(--text-sm); display: block; margin-bottom: 4px; }
    .investor-progress { display: flex; align-items: center; gap: var(--space-2); }
    .investor-share { font-size: var(--text-xs); color: var(--color-accent); font-weight: 600; min-width: 40px; text-align: right; }
    .investor-amount { font-weight: 600; color: var(--text-primary); font-size: var(--text-sm); white-space: nowrap; }

    /* Quick Actions */
    .actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: var(--space-4); }
    .action-item { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: 14px; border-radius: var(--radius-md); background: var(--color-background-alt); text-decoration: none; transition: all var(--transition-fast); cursor: pointer; }
    .action-item:hover { transform: translateY(-1px); box-shadow: var(--shadow-card-hover); background: var(--color-surface); }
    .action-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: white; }
    .action-item span:last-child { font-size: var(--text-xs); font-weight: 500; color: var(--text-primary); }
    .pending-alert { display: flex; align-items: center; gap: var(--space-3); padding: 14px 16px; background: var(--color-warning-bg); border: 1px solid var(--color-warning-border); border-radius: var(--radius-lg); }
    .alert-icon { width: 36px; height: 36px; border-radius: 50%; background: var(--color-warning); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .alert-icon .material-icons { font-size: 18px; }
    .alert-content { flex: 1; font-size: var(--text-sm); color: var(--color-warning); }
    .alert-content strong { font-weight: 700; }
    .alert-action { font-size: var(--text-xs); font-weight: 600; color: var(--color-warning); text-decoration: none; padding: 6px 12px; border-radius: var(--radius-sm); transition: background var(--transition-fast); }
    .alert-action:hover { background: rgba(217,119,6,0.1); text-decoration: none; }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
      .charts-grid { grid-template-columns: 1fr; }
      .bottom-grid { grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: 1fr; }
      .bottom-grid { grid-template-columns: 1fr; }
      .actions-grid { grid-template-columns: repeat(2, 1fr); }
      .action-item { padding: 12px; }
      .action-icon { width: 40px; height: 40px; }
      .pending-alert { flex-direction: column; text-align: center; gap: var(--space-2); }
    }
    @media (max-width: 576px) {
      .welcome-section { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
      .quick-actions-grid { grid-template-columns: 1fr; }
    }
  `],
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective, BdtCurrencyPipe],
})
export class DashboardComponent implements OnInit, OnDestroy {
  userName: string = '';
  currentDate = new Date();
  isLoading = false;
  hasData = false;
  
  stats: DashboardStats = {
    totalPoolAmount: 0,
    totalMembersCount: 0,
    monthlyContributionTotal: 0,
    activeInvestmentsCount: 0,
    totalReturns: 0,
    returnPercentage: 0,
    pendingContributions: 0,
    averageContribution: 0,
    totalInvested: 0,
    contributionsThisMonth: 0,
    recentActivities: [],
    topInvestors: [],
    monthlyTrend: { labels: [], contributions: [], investments: [], returns: [] }
  };

  lineChartData: ChartData<'line'> = {
    labels: [],
      datasets: [
        {
          data: [],
          label: 'Contributions',
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#0d9488'
        },
        {
          data: [],
          label: 'Investments',
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#059669'
        }
      ]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 11 } } },
      y: { grid: { color: '#f0f0f0' }, ticks: { color: '#999', font: { size: 11 } } }
    }
  };

  doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Investments', 'Pool', 'Returns'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#0d9488', '#059669', '#d97706'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8
      }
    }
  };

  private subscription?: Subscription;

  constructor(
    private tokenService: Token,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const userName = this.tokenService.getUserName();
    const userEmail = this.tokenService.getUserEmail();
    this.userName = userName || userEmail?.split('@')[0] || 'User';
    this.loadDashboardData();

    this.subscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (event.url.includes('/dashboard')) {
        this.loadDashboardData();
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  refreshData() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    this.http.get<DashboardStats>('/api/dashboard').subscribe({
      next: (data) => {
        this.stats = data;
        this.updateCharts();
        this.hasData = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.hasData = true;
        this.cdr.detectChanges();
      }
    });
  }

  updateCharts() {
    if (this.stats.monthlyTrend) {
      this.lineChartData.labels = this.stats.monthlyTrend.labels;
      this.lineChartData.datasets[0].data = this.stats.monthlyTrend.contributions;
      this.lineChartData.datasets[1].data = this.stats.monthlyTrend.investments;
    }

    this.doughnutChartData.datasets[0].data = [
      this.stats.totalInvested,
      this.stats.totalPoolAmount - this.stats.totalInvested,
      this.stats.totalReturns
    ];
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
