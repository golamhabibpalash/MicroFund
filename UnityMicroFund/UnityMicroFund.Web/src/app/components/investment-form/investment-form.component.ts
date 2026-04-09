import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { InvestmentService } from '../../core/services/investment.service';
import { MemberService } from '../../core/services/member.service';
import { InvestmentType } from '../../core/models/investment.model';
import { Member } from '../../core/models/member.model';

@Component({
  selector: 'app-investment-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  template: `
    <div class="header">
      <button mat-icon-button routerLink="/investments">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h1>Add New Investment</h1>
    </div>
    
    <mat-card class="form-card">
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline">
          <mat-label>Investment Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter investment name">
          @if (form.get('name')?.hasError('required')) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Description (Optional)</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Enter description"></textarea>
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Investment Type</mat-label>
          <mat-select formControlName="type">
            @for (type of investmentTypes; track type) {
              <mat-option [value]="type">{{ type }}</mat-option>
            }
          </mat-select>
          @if (form.get('type')?.hasError('required')) {
            <mat-error>Type is required</mat-error>
          }
        </mat-form-field>
        
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Principal Amount</mat-label>
            <input matInput formControlName="principalAmount" type="number">
            <span matTextPrefix>$&nbsp;</span>
            @if (form.get('principalAmount')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
          
          <mat-form-field appearance="outline">
            <mat-label>Current Value</mat-label>
            <input matInput formControlName="currentValue" type="number">
            <span matTextPrefix>$&nbsp;</span>
            @if (form.get('currentValue')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
        </div>
        
        <mat-form-field appearance="outline">
          <mat-label>Date Invested</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="dateInvested">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
        
        <div class="members-section">
          <h3>Assign to Members</h3>
          <div class="members-list">
            @for (member of availableMembers; track member.id) {
              <mat-chip [class.selected]="isMemberSelected(member.id ?? '')" (click)="toggleMember(member.id ?? '')">
                <mat-icon>{{ isMemberSelected(member.id ?? '') ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
                {{ member.name }}
              </mat-chip>
            }
          </div>
        </div>
        
        @if (errorMessage) {
          <div class="error-message">{{ errorMessage }}</div>
        }
        
        <div class="actions">
          <button mat-button type="button" routerLink="/investments">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="!form.valid || isLoading">
            {{ isLoading ? 'Creating...' : 'Create Investment' }}
          </button>
        </div>
      </form>
    </mat-card>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    h1 { color: #1B5E20; margin: 0; }
    
    .form-card {
      max-width: 700px;
      padding: 30px;
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    mat-form-field {
      width: 100%;
    }
    
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .members-section {
      margin-top: 10px;
    }
    
    .members-section h3 {
      margin-bottom: 10px;
      color: #757575;
      font-size: 14px;
    }
    
    .members-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    mat-chip {
      cursor: pointer;
    }
    
    mat-chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 5px;
    }
    
    mat-chip.selected {
      background: #E8F5E9 !important;
    }
    
    .error-message {
      color: #D32F2F;
      padding: 10px;
      background: #FFEBEE;
      border-radius: 4px;
    }
    
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
  `]
})
export class InvestmentFormComponent implements OnInit {
  form: FormGroup;
  investmentTypes = Object.values(InvestmentType);
  availableMembers: Member[] = [];
  selectedMemberIds: Set<string> = new Set();
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private investmentService: InvestmentService,
    private memberService: MemberService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      type: [InvestmentType.Other, Validators.required],
      principalAmount: [null, Validators.required],
      currentValue: [null, Validators.required],
      dateInvested: [new Date(), Validators.required]
    });
  }

  ngOnInit() {
    this.memberService.getMembers().subscribe({
      next: (data) => this.availableMembers = data,
      error: (err) => console.error('Failed to load members:', err)
    });
  }

  toggleMember(id: string) {
    if (this.selectedMemberIds.has(id)) {
      this.selectedMemberIds.delete(id);
    } else {
      this.selectedMemberIds.add(id);
    }
  }

  isMemberSelected(id: string): boolean {
    return this.selectedMemberIds.has(id);
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      const formData = this.form.value;
      const investmentData = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        principalAmount: formData.principalAmount,
        currentValue: formData.currentValue,
        dateInvested: formData.dateInvested,
        memberIds: Array.from(this.selectedMemberIds)
      };
      
      this.investmentService.createInvestment(investmentData).subscribe({
        next: () => {
          this.router.navigate(['/investments']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Failed to create investment';
        }
      });
    }
  }
}
