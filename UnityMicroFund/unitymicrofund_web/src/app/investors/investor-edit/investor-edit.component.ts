import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Token } from '../../core/services/token';
import { BdtCurrencyPipe } from '../../shared/pipes/bdt-currency.pipe';

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
}

@Component({
  selector: 'app-investor-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule, BdtCurrencyPipe, DatePipe],
  template: `
    <div class="edit-wrapper">
      <div class="edit-header">
        <button class="btn-back" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back to Investors
        </button>
        <h1>Edit Investor</h1>
      </div>

      <div class="edit-content" *ngIf="!isLoading && member">
        <div class="form-card">
          <form (ngSubmit)="saveMember()">
            <div class="form-section">
              <h3>Personal Information</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label for="name">Full Name</label>
                  <input type="text" id="name" [(ngModel)]="member.name" name="name" required>
                </div>
                <div class="form-group">
                  <label for="email">Email</label>
                  <input type="email" id="email" [(ngModel)]="member.email" name="email" required>
                </div>
                <div class="form-group">
                  <label for="phone">Phone</label>
                  <input type="tel" id="phone" [(ngModel)]="member.phone" name="phone" required>
                </div>
                <div class="form-group full-width">
                  <label for="address">Address</label>
                  <textarea id="address" [(ngModel)]="member.address" name="address" rows="2"></textarea>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>Financial Information</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label for="monthlyAmount">Monthly Amount (BDT)</label>
                  <input type="number" id="monthlyAmount" [(ngModel)]="member.monthlyAmount" name="monthlyAmount">
                </div>
                <div class="form-group">
                  <label for="isActive">Status</label>
                  <select id="isActive" [(ngModel)]="member.isActive" name="isActive">
                    <option [ngValue]="true">Active</option>
                    <option [ngValue]="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-section readonly">
              <h3>Read-only Information</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label>Member ID</label>
                  <input type="text" [value]="member.id" readonly>
                </div>
                <div class="form-group">
                  <label>Join Date</label>
                  <input type="text" [value]="member.joinDate | date:'longDate'" readonly>
                </div>
                <div class="form-group">
                  <label>Total Contributions</label>
                  <input type="text" [value]="member.totalContributions | bdtCurrency" readonly>
                </div>
                <div class="form-group">
                  <label>Installments Paid</label>
                  <input type="text" [value]="member.totalInstallmentsPaid" readonly>
                </div>
                <div class="form-group">
                  <label>Current Share Value</label>
                  <input type="text" [value]="member.currentShareValue | bdtCurrency" readonly>
                </div>
                <div class="form-group">
                  <label>Share Percentage</label>
                  <input type="text" [value]="member.sharePercentage + '%'" readonly>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="goBack()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                <span *ngIf="isSaving" class="spinner-small"></span>
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="loading" *ngIf="isLoading">
        <div class="spinner"></div>
      </div>

      <div class="error-message" *ngIf="errorMessage">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .edit-wrapper { max-width: 900px; margin: 0 auto; padding: 24px; }
    .edit-header { margin-bottom: 24px; }
    .edit-header h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 16px 0 0 0; }
    .btn-back { display: inline-flex; align-items: center; gap: 8px; background: none; border: none; color: #667eea; cursor: pointer; font-size: 14px; padding: 8px 0; }
    .btn-back:hover { text-decoration: underline; }
    .btn-back .material-icons { font-size: 20px; }
    .form-card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .form-section { margin-bottom: 32px; }
    .form-section h3 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #eee; }
    .form-section.readonly h3 { color: #666; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { font-size: 13px; color: #666; margin-bottom: 6px; font-weight: 500; }
    .form-group input, .form-group select, .form-group textarea { padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
    .form-group input[readonly] { background: #f8f9fa; color: #666; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #eee; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #5568d3; }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    .btn-secondary { background: #f5f6fa; color: #666; border: 1px solid #ddd; }
    .btn-secondary:hover { background: #eee; }
    .loading { display: flex; justify-content: center; padding: 60px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
    .spinner-small { width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-message { padding: 16px; background: #ffebee; color: #c62828; border-radius: 8px; margin-top: 16px; }
    @media (max-width: 768px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class InvestorEditComponent implements OnInit {
  member: Member | null = null;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  memberId: string = '';

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id') || '';
    if (this.memberId) {
      this.loadMember();
    } else {
      this.errorMessage = 'Invalid member ID';
      this.isLoading = false;
    }
  }

  loadMember() {
    this.http.get<Member>(`/api/members/${this.memberId}`).subscribe({
      next: (data) => {
        this.member = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading member:', err);
        this.errorMessage = 'Failed to load member details';
        this.isLoading = false;
      }
    });
  }

  saveMember() {
    if (!this.member) return;
    
    this.isSaving = true;
    this.errorMessage = '';

    this.http.put<Member>(`/api/members/${this.member.id}`, this.member).subscribe({
      next: (data) => {
        this.member = data;
        this.isSaving = false;
        this.router.navigate(['/investors']);
      },
      error: (err) => {
        console.error('Error saving member:', err);
        this.errorMessage = 'Failed to save changes';
        this.isSaving = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/investors']);
  }
}
