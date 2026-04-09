import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { InvestmentService } from '../../core/services/investment.service';
import { Investment, InvestmentType } from '../../core/models/investment.model';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule
  ],
  template: `
    <div class="header">
      <h1>Investments</h1>
      <button mat-raised-button color="primary" routerLink="/investments/new">
        <mat-icon>add_chart</mat-icon>
        Add Investment
      </button>
    </div>
    
    <mat-card class="filter-card">
      <mat-form-field appearance="outline">
        <mat-label>Filter by Type</mat-label>
        <mat-select [(ngModel)]="selectedType" (ngModelChange)="loadInvestments()">
          <mat-option [value]="null">All Types</mat-option>
          @for (type of investmentTypes; track type) {
            <mat-option [value]="type">{{ type }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-card>
    
    @if (investments.length === 0) {
      <mat-card class="empty-state">
        <mat-icon>trending_up</mat-icon>
        <h3>No investments yet</h3>
        <p>Add your first investment to start tracking returns</p>
        <button mat-raised-button color="primary" routerLink="/investments/new">
          Add Investment
        </button>
      </mat-card>
    } @else {
      <div class="investments-grid">
        @for (investment of investments; track investment.id) {
          <mat-card class="investment-card" [routerLink]="['/investments', investment.id]">
            <div class="card-header">
              <mat-icon class="type-icon">{{ getTypeIcon(investment.type) }}</mat-icon>
              <mat-chip>{{ investment.type }}</mat-chip>
            </div>
            <h3>{{ investment.name }}</h3>
            @if (investment.description) {
              <p class="description">{{ investment.description }}</p>
            }
            <div class="amounts">
              <div class="amount">
                <span class="label">Invested</span>
                <span class="value">{{ investment.principalAmount | currency }}</span>
              </div>
              <div class="amount">
                <span class="label">Current Value</span>
                <span class="value">{{ investment.currentValue | currency }}</span>
              </div>
            </div>
            <div class="returns" [class.positive]="investment.returnAmount > 0" [class.negative]="investment.returnAmount < 0">
              <mat-icon>{{ investment.returnAmount >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
              <span>{{ investment.returnAmount | currency }} ({{ investment.returnPercentage | number:'1.1-1' }}%)</span>
            </div>
            <div class="footer">
              <span class="date">
                <mat-icon>calendar_today</mat-icon>
                {{ investment.dateInvested | date:'mediumDate' }}
              </span>
              <span class="members">
                <mat-icon>people</mat-icon>
                {{ investment.members.length }} members
              </span>
            </div>
          </mat-card>
        }
      </div>
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
    
    .filter-card {
      padding: 10px 20px;
      margin-bottom: 20px;
    }
    
    mat-form-field {
      width: 200px;
    }
    
    .investments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .investment-card {
      padding: 20px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .investment-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .type-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #7B1FA2;
    }
    
    h3 {
      margin: 0 0 10px;
      color: #212121;
    }
    
    .description {
      color: #757575;
      font-size: 14px;
      margin: 0 0 15px;
    }
    
    .amounts {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .amount {
      display: flex;
      flex-direction: column;
    }
    
    .amount .label {
      font-size: 12px;
      color: #757575;
    }
    
    .amount .value {
      font-size: 16px;
      font-weight: bold;
      color: #212121;
    }
    
    .returns {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    
    .returns.positive {
      background: #E8F5E9;
      color: #2E7D32;
    }
    
    .returns.negative {
      background: #FFEBEE;
      color: #D32F2F;
    }
    
    .returns mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #757575;
    }
    
    .footer span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .footer mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    
    .empty-state mat-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #BDBDBD;
    }
    
    .empty-state h3 {
      margin: 20px 0 10px;
      color: #757575;
    }
    
    .empty-state p {
      color: #9E9E9E;
      margin-bottom: 20px;
    }
  `]
})
export class InvestmentsComponent implements OnInit {
  investments: Investment[] = [];
  investmentTypes = Object.values(InvestmentType);
  selectedType: InvestmentType | null = null;

  constructor(private investmentService: InvestmentService) {}

  ngOnInit() {
    this.loadInvestments();
  }

  loadInvestments() {
    this.investmentService.getInvestments(this.selectedType || undefined).subscribe({
      next: (data) => this.investments = data,
      error: (err) => console.error('Failed to load investments:', err)
    });
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'Stocks': 'show_chart',
      'RealEstate': 'home',
      'Business': 'business',
      'Savings': 'savings',
      'Other': 'category'
    };
    return icons[type] || 'category';
  }
}
