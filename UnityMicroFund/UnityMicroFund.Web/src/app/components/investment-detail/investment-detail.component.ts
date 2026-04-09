import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { InvestmentService } from '../../core/services/investment.service';
import { Investment } from '../../core/models/investment.model';

@Component({
  selector: 'app-investment-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule
  ],
  template: `
    @if (investment) {
      <div class="header">
        <button mat-icon-button routerLink="/investments">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>{{ investment.name }}</h1>
        <div class="spacer"></div>
        <button mat-raised-button color="warn" (click)="deleteInvestment()">
          <mat-icon>delete</mat-icon>
          Delete
        </button>
      </div>
      
      <div class="detail-grid">
        <mat-card class="info-card">
          <h2>Investment Details</h2>
          <div class="info-row">
            <span class="label">Type</span>
            <mat-chip>{{ investment.type }}</mat-chip>
          </div>
          @if (investment.description) {
            <div class="info-row">
              <span class="label">Description</span>
              <span>{{ investment.description }}</span>
            </div>
          }
          <div class="info-row">
            <span class="label">Date Invested</span>
            <span>{{ investment.dateInvested | date:'mediumDate' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Created</span>
            <span>{{ investment.createdAt | date:'medium' }}</span>
          </div>
        </mat-card>
        
        <mat-card class="info-card">
          <h2>Financial Summary</h2>
          <div class="amounts-grid">
            <div class="amount-box">
              <span class="amount-label">Principal</span>
              <span class="amount-value">{{ investment.principalAmount | currency }}</span>
            </div>
            <div class="amount-box">
              <span class="amount-label">Current Value</span>
              <span class="amount-value">{{ investment.currentValue | currency }}</span>
            </div>
            <div class="amount-box highlight" [class.positive]="investment.returnAmount > 0" [class.negative]="investment.returnAmount < 0">
              <span class="amount-label">Return</span>
              <span class="amount-value">{{ investment.returnAmount | currency }}</span>
              <span class="percentage">{{ investment.returnPercentage | number:'1.1-1' }}%</span>
            </div>
          </div>
        </mat-card>
      </div>
      
      @if (investment.members.length > 0) {
        <mat-card class="members-card">
          <h2>Assigned Members</h2>
          <table mat-table [dataSource]="investment.members">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Member</th>
              <td mat-cell *matCellDef="let member">{{ member.memberName }}</td>
            </ng-container>
            
            <ng-container matColumnDef="share">
              <th mat-header-cell *matHeaderCellDef>Share %</th>
              <td mat-cell *matCellDef="let member">{{ member.sharePercentage | number:'1.1-1' }}%</td>
            </ng-container>
            
            <ng-container matColumnDef="value">
              <th mat-header-cell *matHeaderCellDef>Value</th>
              <td mat-cell *matCellDef="let member">{{ member.shareValue | currency }}</td>
            </ng-container>
            
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card>
      }
    }
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    h1 { color: #1B5E20; margin: 0; }
    
    .spacer { flex: 1; }
    
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    @media (max-width: 800px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .info-card, .members-card {
      padding: 20px;
    }
    
    h2 {
      color: #1B5E20;
      margin: 0 0 20px;
      font-size: 18px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    
    .info-row .label {
      color: #757575;
    }
    
    .amounts-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    
    .amount-box {
      text-align: center;
      padding: 20px;
      background: #F5F5F5;
      border-radius: 12px;
    }
    
    .amount-box.highlight {
      background: #E8F5E9;
    }
    
    .amount-box.highlight.positive {
      background: #E8F5E9;
      color: #2E7D32;
    }
    
    .amount-box.highlight.negative {
      background: #FFEBEE;
      color: #D32F2F;
    }
    
    .amount-label {
      display: block;
      font-size: 12px;
      color: #757575;
      margin-bottom: 5px;
    }
    
    .amount-value {
      display: block;
      font-size: 20px;
      font-weight: bold;
    }
    
    .percentage {
      display: block;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .members-card {
      padding: 20px;
    }
    
    table {
      width: 100%;
    }
  `]
})
export class InvestmentDetailComponent implements OnInit {
  investment: Investment | null = null;
  displayedColumns = ['name', 'share', 'value'];

  constructor(
    private route: ActivatedRoute,
    private investmentService: InvestmentService,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.investmentService.getInvestment(id).subscribe({
        next: (data) => this.investment = data,
        error: (err) => console.error('Failed to load investment:', err)
      });
    }
  }

  deleteInvestment() {
    if (this.investment && confirm('Are you sure you want to delete this investment?')) {
      this.investmentService.deleteInvestment(this.investment.id).subscribe({
        next: () => this.router.navigate(['/investments']),
        error: (err) => console.error('Failed to delete investment:', err)
      });
    }
  }
}
