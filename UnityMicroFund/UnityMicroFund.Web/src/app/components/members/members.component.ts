import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MemberService } from '../../core/services/member.service';
import { Member } from '../../core/models/member.model';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatBadgeModule
  ],
  template: `
    <div class="header">
      <h1>Members</h1>
      <button mat-raised-button color="primary" routerLink="/members/new">
        <mat-icon>person_add</mat-icon>
        Add Member
      </button>
    </div>
    
    <mat-card class="search-card">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search members</mat-label>
        <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onSearch()" placeholder="Name or phone">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
    </mat-card>
    
    @if (members.length === 0) {
      <mat-card class="empty-state">
        <mat-icon>people_outline</mat-icon>
        <h3>No members yet</h3>
        <p>Add your first member to get started</p>
        <button mat-raised-button color="primary" routerLink="/members/new">
          Add Member
        </button>
      </mat-card>
    } @else {
      <div class="members-grid">
        @for (member of members; track member.id) {
          <mat-card class="member-card" [routerLink]="['/members', member.id]">
            <div class="member-avatar">
              {{ getInitials(member.name) }}
            </div>
            <div class="member-info">
              <h3>{{ member.name }}</h3>
              <p class="phone">{{ member.phone }}</p>
              <div class="stats">
                <span class="stat">
                  <mat-icon>payments</mat-icon>
                  {{ member.totalInstallmentsPaid }} installments
                </span>
              </div>
            </div>
            <div class="member-amount">
              <span class="label">Contributed</span>
              <span class="value">{{ member.totalContributions | currency }}</span>
              <mat-chip [class.active]="member.isActive" [class.inactive]="!member.isActive">
                {{ member.isActive ? 'Active' : 'Inactive' }}
              </mat-chip>
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
    
    .search-card {
      padding: 10px 20px;
      margin-bottom: 20px;
    }
    
    .search-field {
      width: 100%;
    }
    
    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .member-card {
      display: flex;
      align-items: center;
      padding: 20px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .member-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .member-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #2E7D32;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      margin-right: 15px;
    }
    
    .member-info {
      flex: 1;
    }
    
    .member-info h3 {
      margin: 0 0 5px;
      color: #212121;
    }
    
    .member-info .phone {
      margin: 0 0 8px;
      color: #757575;
      font-size: 14px;
    }
    
    .member-info .stats {
      display: flex;
      gap: 15px;
    }
    
    .member-info .stat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #757575;
    }
    
    .member-info .stat mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .member-amount {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    
    .member-amount .label {
      font-size: 12px;
      color: #757575;
    }
    
    .member-amount .value {
      font-size: 18px;
      font-weight: bold;
      color: #2E7D32;
    }
    
    .active {
      background: #E8F5E9 !important;
      color: #2E7D32 !important;
    }
    
    .inactive {
      background: #FFEBEE !important;
      color: #D32F2F !important;
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
export class MembersComponent implements OnInit {
  members: Member[] = [];
  searchTerm = '';

  constructor(private memberService: MemberService) {}

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.memberService.getMembers(this.searchTerm || undefined).subscribe({
      next: (data) => this.members = data,
      error: (err) => console.error('Failed to load members:', err)
    });
  }

  onSearch() {
    this.loadMembers();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
