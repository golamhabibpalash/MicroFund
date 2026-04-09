import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContributionService } from '../../core/services/contribution.service';
import { ContributionSummary, Contribution, ContributionStatus } from '../../core/models/contribution.model';

@Component({
  selector: 'app-contributions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="header">
      <h1>Contributions</h1>
      <button mat-raised-button color="primary" (click)="generateMonthly()">
        <mat-icon>auto_awesome</mat-icon>
        Generate Monthly
      </button>
    </div>
    
    @if (summary) {
      <div class="summary-cards">
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>receipt_long</mat-icon>
            <div class="info">
              <span class="value">{{ summary.totalContributions }}</span>
              <span class="label">Total</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card amount">
          <mat-card-content>
            <mat-icon>payments</mat-icon>
            <div class="info">
              <span class="value">{{ summary.totalAmount | currency }}</span>
              <span class="label">Total Amount</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card paid">
          <mat-card-content>
            <mat-icon>check_circle</mat-icon>
            <div class="info">
              <span class="value">{{ summary.paidCount }}</span>
              <span class="label">Paid</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card pending">
          <mat-card-content>
            <mat-icon>pending</mat-icon>
            <div class="info">
              <span class="value">{{ summary.pendingCount }}</span>
              <span class="label">Pending</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card overdue">
          <mat-card-content>
            <mat-icon>warning</mat-icon>
            <div class="info">
              <span class="value">{{ summary.overdueCount }}</span>
              <span class="label">Overdue</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
      
      <mat-card class="table-card">
        <h2>Recent Contributions</h2>
        <table mat-table [dataSource]="summary.recentContributions">
          <ng-container matColumnDef="member">
            <th mat-header-cell *matHeaderCellDef>Member</th>
            <td mat-cell *matCellDef="let contribution">{{ contribution.memberName }}</td>
          </ng-container>
          
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Amount</th>
            <td mat-cell *matCellDef="let contribution">{{ contribution.amount | currency }}</td>
          </ng-container>
          
          <ng-container matColumnDef="period">
            <th mat-header-cell *matHeaderCellDef>Period</th>
            <td mat-cell *matCellDef="let contribution">{{ contribution.month }} {{ contribution.year }}</td>
          </ng-container>
          
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let contribution">
              <mat-chip [class]="contribution.status.toLowerCase()">
                {{ contribution.status }}
              </mat-chip>
            </td>
          </ng-container>
          
          <ng-container matColumnDef="paidDate">
            <th mat-header-cell *matHeaderCellDef>Paid Date</th>
            <td mat-cell *matCellDef="let contribution">
              {{ contribution.paidDate ? (contribution.paidDate | date:'mediumDate') : '-' }}
            </td>
          </ng-container>
          
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let contribution">
              @if (contribution.status !== 'Paid') {
                <button mat-button color="primary" (click)="markAsPaid(contribution)">
                  Mark Paid
                </button>
              }
            </td>
          </ng-container>
          
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </mat-card>
    }
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    h1 { color: #1B5E20; margin: 0; }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px !important;
    }
    
    .summary-card mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }
    
    .summary-card .info {
      display: flex;
      flex-direction: column;
    }
    
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #212121;
    }
    
    .summary-card .label {
      font-size: 12px;
      color: #757575;
    }
    
    .summary-card.amount mat-icon { color: #2E7D32; }
    .summary-card.paid mat-icon { color: #4CAF50; }
    .summary-card.pending mat-icon { color: #FFC107; }
    .summary-card.overdue mat-icon { color: #D32F2F; }
    
    .table-card {
      padding: 20px;
    }
    
    h2 {
      color: #1B5E20;
      margin: 0 0 20px;
    }
    
    table {
      width: 100%;
    }
    
    mat-chip.paid {
      background: #E8F5E9 !important;
      color: #2E7D32 !important;
    }
    
    mat-chip.pending {
      background: #FFF8E1 !important;
      color: #F57C00 !important;
    }
    
    mat-chip.overdue {
      background: #FFEBEE !important;
      color: #D32F2F !important;
    }
  `]
})
export class ContributionsComponent implements OnInit {
  summary: ContributionSummary | null = null;
  displayedColumns = ['member', 'amount', 'period', 'status', 'paidDate', 'actions'];

  constructor(
    private contributionService: ContributionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadContributions();
  }

  loadContributions() {
    this.contributionService.getContributions().subscribe({
      next: (data) => this.summary = data,
      error: (err) => console.error('Failed to load contributions:', err)
    });
  }

  markAsPaid(contribution: Contribution) {
    this.contributionService.updateContributionStatus(contribution.id, ContributionStatus.Paid).subscribe({
      next: () => {
        this.snackBar.open('Contribution marked as paid', 'Close', { duration: 3000 });
        this.loadContributions();
      },
      error: (err) => {
        this.snackBar.open('Failed to update contribution', 'Close', { duration: 3000 });
      }
    });
  }

  generateMonthly() {
    if (confirm('Generate monthly contributions for all active members?')) {
      this.contributionService.generateMonthlyContributions().subscribe({
        next: () => {
          this.snackBar.open('Monthly contributions generated', 'Close', { duration: 3000 });
          this.loadContributions();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to generate contributions', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
