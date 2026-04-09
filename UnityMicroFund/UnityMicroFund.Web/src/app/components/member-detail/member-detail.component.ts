import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MemberService } from '../../core/services/member.service';
import { Member } from '../../core/models/member.model';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule
  ],
  template: `
    @if (member) {
      <div class="header">
        <button mat-icon-button routerLink="/members">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Member Profile</h1>
        <div class="spacer"></div>
        <button mat-raised-button color="warn" (click)="deleteMember()">
          <mat-icon>delete</mat-icon>
          Delete
        </button>
      </div>
      
      <div class="profile-grid">
        <mat-card class="profile-card">
          <div class="avatar">
            {{ getInitials(member.name) }}
          </div>
          <h2>{{ member.name }}</h2>
          <mat-chip [class.active]="member.isActive" [class.inactive]="!member.isActive">
            {{ member.isActive ? 'Active' : 'Inactive' }}
          </mat-chip>
          
          <div class="info-list">
            <div class="info-item">
              <mat-icon>phone</mat-icon>
              <span>{{ member.phone }}</span>
            </div>
            @if (member.alternatePhone) {
              <div class="info-item">
                <mat-icon>phone_android</mat-icon>
                <span>{{ member.alternatePhone }}</span>
              </div>
            }
            @if (member.email) {
              <div class="info-item">
                <mat-icon>email</mat-icon>
                <span>{{ member.email }}</span>
              </div>
            }
            <div class="info-item">
              <mat-icon>calendar_today</mat-icon>
              <span>Joined {{ member.joinDate | date:'mediumDate' }}</span>
            </div>
            @if (member.occupation) {
              <div class="info-item">
                <mat-icon>work</mat-icon>
                <span>{{ member.occupation }}</span>
              </div>
            }
          </div>
        </mat-card>
        
        <div class="details-section">
          <mat-card>
            <mat-card-content>
              <mat-tab-group>
                <mat-tab label="Personal Info">
                  <div class="tab-content">
                    <div class="detail-row">
                      <span class="label">Full Name</span>
                      <span class="value">{{ member.name }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Date of Birth</span>
                      <span class="value">{{ member.dateOfBirth | date:'mediumDate' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Gender</span>
                      <span class="value">{{ member.gender }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Nationality</span>
                      <span class="value">{{ member.nationality }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Address</span>
                      <span class="value">{{ member.address }}</span>
                    </div>
                    @if (member.employerName) {
                      <div class="detail-row">
                        <span class="label">Employer</span>
                        <span class="value">{{ member.employerName }}</span>
                      </div>
                    }
                  </div>
                </mat-tab>
                
                <mat-tab label="Emergency Contact">
                  <div class="tab-content">
                    @if (member.emergencyContactName) {
                      <div class="detail-row">
                        <span class="label">Name</span>
                        <span class="value">{{ member.emergencyContactName }}</span>
                      </div>
                    }
                    <div class="detail-row">
                      <span class="label">Phone</span>
                      <span class="value">{{ member.emergencyContactPhone }}</span>
                    </div>
                    @if (member.emergencyContactRelation) {
                      <div class="detail-row">
                        <span class="label">Relation</span>
                        <span class="value">{{ member.emergencyContactRelation }}</span>
                      </div>
                    }
                  </div>
                </mat-tab>
                
                <mat-tab label="Nominee">
                  <div class="tab-content">
                    <div class="detail-row">
                      <span class="label">Name</span>
                      <span class="value">{{ member.nomineeName }}</span>
                    </div>
                    @if (member.nomineeRelation) {
                      <div class="detail-row">
                        <span class="label">Relation</span>
                        <span class="value">{{ member.nomineeRelation }}</span>
                      </div>
                    }
                    @if (member.nomineePhone) {
                      <div class="detail-row">
                        <span class="label">Phone</span>
                        <span class="value">{{ member.nomineePhone }}</span>
                      </div>
                    }
                  </div>
                </mat-tab>
                
                <mat-tab label="Bank Details">
                  <div class="tab-content">
                    <div class="detail-row">
                      <span class="label">Bank Name</span>
                      <span class="value">{{ member.bankName }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Account Holder</span>
                      <span class="value">{{ member.accountHolderName }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Account Number</span>
                      <span class="value">{{ member.accountNumber }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Routing Number</span>
                      <span class="value">{{ member.routingNumber }}</span>
                    </div>
                    @if (member.swiftCode) {
                      <div class="detail-row">
                        <span class="label">SWIFT Code</span>
                        <span class="value">{{ member.swiftCode }}</span>
                      </div>
                    }
                  </div>
                </mat-tab>
                
                <mat-tab label="Financial">
                  <div class="tab-content">
                    <div class="detail-row highlight">
                      <span class="label">Total Contributions</span>
                      <span class="value">{{ member.totalContributions | currency }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Installments Paid</span>
                      <span class="value">{{ member.totalInstallmentsPaid }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Monthly Amount</span>
                      <span class="value">{{ member.monthlyAmount | currency }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Share Percentage</span>
                      <span class="value">{{ member.sharePercentage | number:'1.1-1' }}%</span>
                    </div>
                    <div class="detail-row highlight-green">
                      <span class="label">Current Share Value</span>
                      <span class="value">{{ member.currentShareValue | currency }}</span>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
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
    
    .profile-grid {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
    }
    
    @media (max-width: 900px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .profile-card {
      text-align: center;
      padding: 30px;
    }
    
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: #2E7D32;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: bold;
      margin: 0 auto 15px;
    }
    
    h2 {
      margin: 0 0 10px;
      color: #212121;
    }
    
    .info-list {
      margin-top: 20px;
      text-align: left;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    
    .info-item mat-icon {
      color: #757575;
    }
    
    .details-section mat-card {
      padding: 0;
    }
    
    .tab-content {
      padding: 20px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-row .label {
      color: #757575;
      font-size: 14px;
    }
    
    .detail-row .value {
      color: #212121;
      font-weight: 500;
    }
    
    .detail-row.highlight {
      background: #E8F5E9;
      padding: 15px;
      margin: 10px -20px;
      border-radius: 8px;
    }
    
    .detail-row.highlight-green {
      background: #1B5E20;
      padding: 15px;
      margin: 10px -20px;
      border-radius: 8px;
    }
    
    .detail-row.highlight-green .label,
    .detail-row.highlight-green .value {
      color: white;
    }
    
    .active {
      background: #E8F5E9 !important;
      color: #2E7D32 !important;
    }
    
    .inactive {
      background: #FFEBEE !important;
      color: #D32F2F !important;
    }
  `]
})
export class MemberDetailComponent implements OnInit {
  member: Member | null = null;

  constructor(
    private route: ActivatedRoute,
    private memberService: MemberService,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.memberService.getMember(id).subscribe({
        next: (data) => this.member = data,
        error: (err) => console.error('Failed to load member:', err)
      });
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  deleteMember() {
    if (this.member?.id && confirm('Are you sure you want to delete this member?')) {
      this.memberService.deleteMember(this.member.id).subscribe({
        next: () => this.router.navigate(['/members']),
        error: (err) => console.error('Failed to delete member:', err)
      });
    }
  }
}
