import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardStats, RecentActivity, TopInvestor } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    @if (isLoading) {
      <div class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p class="loading-text">Loading your dashboard...</p>
      </div>
    } @else if (error) {
      <div class="error-container">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h2>Unable to Load Dashboard</h2>
        <p>{{ error }}</p>
        <button mat-raised-button color="primary" (click)="loadStats()">
          <mat-icon>refresh</mat-icon> Try Again
        </button>
      </div>
    } @else if (stats) {
      <div class="dashboard-container">
        <!-- Welcome Header -->
        <div class="welcome-header">
          <div class="welcome-text">
            <h1>Welcome back, {{ currentUser?.name }}</h1>
            <p class="subtitle">Here's what's happening with Unity MicroFund today</p>
          </div>
          <div class="header-date">
            <mat-icon>calendar_today</mat-icon>
            <span>{{ today | date:'fullDate' }}</span>
          </div>
        </div>

        <!-- Main Stats Cards -->
        <div class="stats-section">
          <div class="stats-row">
            <mat-card class="stat-card primary">
              <mat-card-content>
                <div class="stat-icon-wrapper bg-1">
                  <mat-icon>account_balance_wallet</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total Fund Pool</span>
                  <span class="stat-value">{{ stats.totalPoolAmount | currency:'USD':'symbol':'1.2-2' }}</span>
                  <span class="stat-trend positive">
                    <mat-icon>trending_up</mat-icon> Growing
                  </span>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-icon-wrapper bg-2">
                  <mat-icon>people</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Active Members</span>
                  <span class="stat-value">{{ stats.totalMembersCount }}</span>
                  <span class="stat-sub">+{{ stats.contributionsThisMonth }} this month</span>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-icon-wrapper bg-3">
                  <mat-icon>payments</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Monthly Collection</span>
                  <span class="stat-value">{{ stats.monthlyContributionTotal | currency:'USD':'symbol':'1.2-2' }}</span>
                  <span class="stat-sub">Avg: {{ stats.averageContribution | currency:'USD':'symbol':'1.2-2' }}/member</span>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-icon-wrapper bg-4">
                  <mat-icon>trending_up</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total Invested</span>
                  <span class="stat-value">{{ stats.totalInvested | currency:'USD':'symbol':'1.2-2' }}</span>
                  <span class="stat-sub">{{ stats.activeInvestmentsCount }} active investments</span>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>

        <!-- Secondary Stats -->
        <div class="secondary-stats">
          <mat-card class="returns-card" [class.positive]="stats.totalReturns > 0" [class.negative]="stats.totalReturns < 0">
            <mat-card-content>
              <mat-icon>{{ stats.totalReturns >= 0 ? 'show_chart' : ' trending_down' }}</mat-icon>
              <div class="returns-info">
                <span class="label">Total Returns</span>
                <span class="value">{{ stats.totalReturns | currency:'USD':'symbol':'1.2-2' }}</span>
                <span class="percentage">{{ stats.returnPercentage | number:'1.1-1' }}%</span>
              </div>
            </mat-card-content>
          </mat-card>

          @if (stats.pendingContributions > 0) {
            <mat-card class="pending-card">
              <mat-card-content>
                <mat-icon>warning</mat-icon>
                <div class="pending-info">
                  <span class="label">Pending Contributions</span>
                  <span class="value">{{ stats.pendingContributions }}</span>
                </div>
                <button mat-stroked-button color="warn" routerLink="/contributions">Review</button>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Main Content Grid -->
        <div class="content-grid">
          <!-- Recent Activity -->
          <mat-card class="activity-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>history</mat-icon>
              <mat-card-title>Recent Activity</mat-card-title>
              <mat-card-subtitle>Latest contributions and investments</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (stats.recentActivities && stats.recentActivities.length > 0) {
                <div class="activity-list">
                  @for (activity of stats.recentActivities; track activity.date) {
                    <div class="activity-item">
                      <div class="activity-icon" [class]="activity.type.toLowerCase()">
                        <mat-icon>{{ activity.type === 'Contribution' ? 'payments' : 'trending_up' }}</mat-icon>
                      </div>
                      <div class="activity-details">
                        <span class="activity-desc">{{ activity.description }}</span>
                        <span class="activity-member">{{ activity.memberName }}</span>
                      </div>
                      <div class="activity-meta">
                        <span class="activity-amount">{{ activity.amount | currency:'USD':'symbol':'1.2-2' }}</span>
                        <span class="activity-date">{{ activity.date | date:'MMM d, h:mm a' }}</span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>No recent activity</p>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Top Investors -->
          <mat-card class="investors-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>emoji_events</mat-icon>
              <mat-card-title>Top Contributors</mat-card-title>
              <mat-card-subtitle>Members with highest contributions</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (stats.topInvestors && stats.topInvestors.length > 0) {
                <div class="investors-list">
                  @for (investor of stats.topInvestors; track investor.memberName; let i = $index) {
                    <div class="investor-item">
                      <div class="rank" [class]="getRankClass(i)">{{ i + 1 }}</div>
                      <div class="investor-info">
                        <span class="investor-name">{{ investor.memberName }}</span>
                        <div class="progress-bar">
                          <div class="progress" [style.width.%]="investor.sharePercentage"></div>
                        </div>
                      </div>
                      <div class="investor-amount">
                        <span class="amount">{{ investor.totalContributions | currency:'USD':'symbol':'1.2-2' }}</span>
                        <span class="percentage">{{ investor.sharePercentage | number:'1.1-1' }}%</span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>group</mat-icon>
                  <p>No data available</p>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Quick Actions -->
        <mat-card class="actions-card">
          <mat-card-content>
            <h3><mat-icon>bolt</mat-icon> Quick Actions</h3>
            <div class="actions-grid">
              <button mat-raised-button class="action-btn primary" routerLink="/members/new">
                <mat-icon>person_add</mat-icon>
                <span>Add New Member</span>
              </button>
              <button mat-raised-button class="action-btn accent" routerLink="/investments/new">
                <mat-icon>add_chart</mat-icon>
                <span>New Investment</span>
              </button>
              <button mat-raised-button class="action-btn" routerLink="/contributions">
                <mat-icon>receipt_long</mat-icon>
                <span>View Contributions</span>
              </button>
              <button mat-raised-button class="action-btn" routerLink="/members">
                <mat-icon>groups</mat-icon>
                <span>Manage Members</span>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 20px;
    }

    .loading-text {
      color: #666;
      font-size: 1.1rem;
    }

    .error-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #D32F2F;
    }

    .error-container h2 {
      margin: 0;
      color: #333;
    }

    .error-container p {
      color: #666;
    }

    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px 30px;
      background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%);
      border-radius: 16px;
      color: white;
    }

    .welcome-text h1 {
      margin: 0 0 5px 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      opacity: 0.9;
      font-size: 0.95rem;
    }

    .header-date {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.15);
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 0.9rem;
    }

    .stats-section {
      margin-bottom: 24px;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .stat-card {
      border-radius: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px !important;
    }

    .stat-icon-wrapper {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon-wrapper mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .bg-1 { background: linear-gradient(135deg, #1B5E20, #4CAF50); }
    .bg-2 { background: linear-gradient(135deg, #1565C0, #42A5F5); }
    .bg-3 { background: linear-gradient(135deg, #F57C00, #FFB74D); }
    .bg-4 { background: linear-gradient(135deg, #7B1FA2, #AB47BC); }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 0.85rem;
      color: #666;
      font-weight: 500;
    }

    .stat-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: #212121;
    }

    .stat-trend, .stat-sub {
      font-size: 0.8rem;
      color: #888;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-trend mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .stat-trend.positive { color: #2E7D32; }
    .stat-trend.negative { color: #D32F2F; }

    .secondary-stats {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .returns-card, .pending-card {
      flex: 1;
      min-width: 280px;
      border-radius: 16px;
    }

    .returns-card mat-card-content, .pending-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px !important;
    }

    .returns-card mat-icon, .pending-card mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .returns-card.positive mat-icon { color: #2E7D32; }
    .returns-card.negative mat-icon { color: #D32F2F; }
    .pending-card mat-icon { color: #F57C00; }

    .returns-info, .pending-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .returns-info .label, .pending-info .label {
      font-size: 0.85rem;
      color: #666;
    }

    .returns-info .value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #212121;
    }

    .returns-info .percentage {
      font-size: 0.9rem;
      color: #2E7D32;
      font-weight: 600;
    }

    .returns-card.negative .returns-info .percentage {
      color: #D32F2F;
    }

    .pending-info .value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #F57C00;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    @media (max-width: 900px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .activity-card, .investors-card {
      border-radius: 16px;
    }

    .activity-card mat-card-header, .investors-card mat-card-header {
      padding: 20px 20px 0;
    }

    .activity-card mat-card-content, .investors-card mat-card-content {
      padding: 0 !important;
    }

    .activity-list {
      padding: 0;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    }

    .activity-item:hover {
      background: #f8f9fa;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .activity-icon.contribution {
      background: #E8F5E9;
      color: #2E7D32;
    }

    .activity-icon.investment {
      background: #E3F2FD;
      color: #1565C0;
    }

    .activity-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .activity-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .activity-desc {
      font-weight: 500;
      color: #333;
      font-size: 0.95rem;
    }

    .activity-member {
      font-size: 0.85rem;
      color: #888;
    }

    .activity-meta {
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .activity-amount {
      font-weight: 600;
      color: #212121;
    }

    .activity-date {
      font-size: 0.8rem;
      color: #999;
    }

    .investors-list {
      padding: 8px 0;
    }

    .investor-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 20px;
      transition: background 0.2s;
    }

    .investor-item:hover {
      background: #f8f9fa;
    }

    .rank {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .rank.gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: white; }
    .rank.silver { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); color: white; }
    .rank.bronze { background: linear-gradient(135deg, #CD7F32, #A0522D); color: white; }
    .rank.default { background: #E0E0E0; color: #666; }

    .investor-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .investor-name {
      font-weight: 500;
      color: #333;
      font-size: 0.95rem;
    }

    .progress-bar {
      height: 6px;
      background: #E0E0E0;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress {
      height: 100%;
      background: linear-gradient(90deg, #1B5E20, #4CAF50);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .investor-amount {
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .investor-amount .amount {
      font-weight: 600;
      color: #212121;
    }

    .investor-amount .percentage {
      font-size: 0.8rem;
      color: #2E7D32;
      font-weight: 500;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 10px;
    }

    .actions-card {
      border-radius: 16px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .actions-card h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      color: #333;
      font-size: 1.1rem;
    }

    .actions-card h3 mat-icon {
      color: #1B5E20;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .action-btn {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border-radius: 10px;
      font-weight: 500;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #1B5E20, #2E7D32) !important;
      color: white;
    }

    .action-btn.accent {
      background: linear-gradient(135deg, #1565C0, #1976D2) !important;
      color: white;
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  isLoading = true;
  error: string | null = null;
  today = new Date();
  
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  get currentUser() {
    return this.authService.currentUser();
  }

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.isLoading = true;
    this.error = null;
    
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stats:', err);
        this.isLoading = false;
        if (err.status === 401) {
          this.error = 'Session expired. Please login again.';
        } else if (err.status === 0) {
          this.error = 'Cannot connect to server. Make sure the API is running.';
        } else {
          this.error = 'Failed to load dashboard data.';
        }
      }
    });
  }

  getRankClass(index: number): string {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return 'default';
  }
}
