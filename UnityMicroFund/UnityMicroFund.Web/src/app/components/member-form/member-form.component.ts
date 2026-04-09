import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MemberService } from '../../core/services/member.service';

@Component({
  selector: 'app-member-form',
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
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatStepperModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="header">
      <button mat-icon-button routerLink="/members">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h1>Register New Member</h1>
    </div>
    
    <mat-card class="form-card">
      <mat-stepper linear #stepper>
        <!-- Personal Information -->
        <mat-step [stepControl]="personalForm" label="Personal Information">
          <form [formGroup]="personalForm">
            <div class="section-title">Basic Details</div>
            
            <mat-form-field appearance="outline">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="name" placeholder="Enter full name">
              @if (personalForm.get('name')?.hasError('required')) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>
            
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Date of Birth</mat-label>
                <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth">
                <mat-datepicker-toggle matIconSuffix [for]="dobPicker"></mat-datepicker-toggle>
                <mat-datepicker #dobPicker></mat-datepicker>
                @if (personalForm.get('dateOfBirth')?.hasError('required')) {
                  <mat-error>Date of birth is required</mat-error>
                }
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Gender</mat-label>
                <mat-select formControlName="gender">
                  <mat-option value="Male">Male</mat-option>
                  <mat-option value="Female">Female</mat-option>
                  <mat-option value="Other">Other</mat-option>
                </mat-select>
                @if (personalForm.get('gender')?.hasError('required')) {
                  <mat-error>Gender is required</mat-error>
                }
              </mat-form-field>
            </div>
            
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Nationality</mat-label>
                <input matInput formControlName="nationality" placeholder="Enter nationality">
                @if (personalForm.get('nationality')?.hasError('required')) {
                  <mat-error>Nationality is required</mat-error>
                }
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Occupation</mat-label>
                <input matInput formControlName="occupation" placeholder="Enter occupation">
                @if (personalForm.get('occupation')?.hasError('required')) {
                  <mat-error>Occupation is required</mat-error>
                }
              </mat-form-field>
            </div>
            
            <mat-form-field appearance="outline">
              <mat-label>Employer Name (Optional)</mat-label>
              <input matInput formControlName="employerName" placeholder="Enter employer name">
            </mat-form-field>
            
            <div class="section-title">Contact Information</div>
            
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="phone" placeholder="Enter phone number">
                @if (personalForm.get('phone')?.hasError('required')) {
                  <mat-error>Phone number is required</mat-error>
                }
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Alternate Phone (Optional)</mat-label>
                <input matInput formControlName="alternatePhone" placeholder="Enter alternate phone">
              </mat-form-field>
            </div>
            
            <mat-form-field appearance="outline">
              <mat-label>Email (Optional)</mat-label>
              <input matInput formControlName="email" type="email" placeholder="Enter email">
              @if (personalForm.get('email')?.hasError('email')) {
                <mat-error>Invalid email format</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Address</mat-label>
              <textarea matInput formControlName="address" placeholder="Enter full address" rows="2"></textarea>
              @if (personalForm.get('address')?.hasError('required')) {
                <mat-error>Address is required</mat-error>
              }
            </mat-form-field>
            
            <div class="step-actions">
              <button mat-raised-button color="primary" matStepperNext [disabled]="!personalForm.valid">
                Next
              </button>
            </div>
          </form>
        </mat-step>
        
        <!-- Emergency & Nominee -->
        <mat-step [stepControl]="emergencyForm" label="Emergency & Nominee">
          <form [formGroup]="emergencyForm">
            <div class="section-title">Emergency Contact</div>
            
            <mat-form-field appearance="outline">
              <mat-label>Emergency Contact Name (Optional)</mat-label>
              <input matInput formControlName="emergencyContactName" placeholder="Enter emergency contact name">
            </mat-form-field>
            
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Emergency Contact Phone</mat-label>
                <input matInput formControlName="emergencyContactPhone" placeholder="Enter emergency contact phone">
                @if (emergencyForm.get('emergencyContactPhone')?.hasError('required')) {
                  <mat-error>Emergency contact phone is required</mat-error>
                }
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Relation (Optional)</mat-label>
                <input matInput formControlName="emergencyContactRelation" placeholder="e.g., Wife, Husband, Brother">
              </mat-form-field>
            </div>
            
            <div class="section-title">Nominee Information</div>
            
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Nominee Name</mat-label>
                <input matInput formControlName="nomineeName" placeholder="Enter nominee name">
                @if (emergencyForm.get('nomineeName')?.hasError('required')) {
                  <mat-error>Nominee name is required</mat-error>
                }
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Nominee Relation (Optional)</mat-label>
                <input matInput formControlName="nomineeRelation" placeholder="e.g., Wife, Husband">
              </mat-form-field>
            </div>
            
            <mat-form-field appearance="outline">
              <mat-label>Nominee Phone (Optional)</mat-label>
              <input matInput formControlName="nomineePhone" placeholder="Enter nominee phone">
            </mat-form-field>
            
            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!emergencyForm.valid">
                Next
              </button>
            </div>
          </form>
        </mat-step>
        
        <!-- Bank Details -->
        <mat-step [stepControl]="bankForm" label="Bank Details">
          <form [formGroup]="bankForm">
            <div class="section-title">Bank Account Information</div>
            
            <mat-form-field appearance="outline">
              <mat-label>Bank Name</mat-label>
              <input matInput formControlName="bankName" placeholder="Enter bank name">
              @if (bankForm.get('bankName')?.hasError('required')) {
                <mat-error>Bank name is required</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Account Holder Name</mat-label>
              <input matInput formControlName="accountHolderName" placeholder="Enter account holder name">
              @if (bankForm.get('accountHolderName')?.hasError('required')) {
                <mat-error>Account holder name is required</mat-error>
              }
            </mat-form-field>
            
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Account Number</mat-label>
                <input matInput formControlName="accountNumber" placeholder="Enter account number">
                @if (bankForm.get('accountNumber')?.hasError('required')) {
                  <mat-error>Account number is required</mat-error>
                }
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Routing Number</mat-label>
                <input matInput formControlName="routingNumber" placeholder="Enter routing number">
                @if (bankForm.get('routingNumber')?.hasError('required')) {
                  <mat-error>Routing number is required</mat-error>
                }
              </mat-form-field>
            </div>
            
            <mat-form-field appearance="outline">
              <mat-label>SWIFT Code (Optional)</mat-label>
              <input matInput formControlName="swiftCode" placeholder="Enter SWIFT code">
            </mat-form-field>
            
            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!bankForm.valid">
                Next
              </button>
            </div>
          </form>
        </mat-step>
        
        <!-- Investment Details -->
        <mat-step [stepControl]="investmentForm" label="Investment Details">
          <form [formGroup]="investmentForm">
            <div class="section-title">Contribution Details</div>
            
            <mat-form-field appearance="outline">
              <mat-label>Monthly Contribution Amount</mat-label>
              <input matInput formControlName="monthlyAmount" type="number" placeholder="Enter amount">
              <span matTextPrefix>$&nbsp;</span>
              @if (investmentForm.get('monthlyAmount')?.hasError('required')) {
                <mat-error>Amount is required</mat-error>
              }
              @if (investmentForm.get('monthlyAmount')?.hasError('min')) {
                <mat-error>Amount must be greater than 0</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Join Date</mat-label>
              <input matInput [matDatepicker]="joinPicker" formControlName="joinDate">
              <mat-datepicker-toggle matIconSuffix [for]="joinPicker"></mat-datepicker-toggle>
              <mat-datepicker #joinPicker></mat-datepicker>
              @if (investmentForm.get('joinDate')?.hasError('required')) {
                <mat-error>Join date is required</mat-error>
              }
            </mat-form-field>
            
            <div class="section-title">Terms & Conditions</div>
            
            <mat-checkbox formControlName="acceptTerms" color="primary" class="terms-checkbox">
              I accept the <a href="#" (click)="$event.preventDefault()">terms and conditions</a> and agree to the rules of the investment group.
            </mat-checkbox>
            @if (investmentForm.get('acceptTerms')?.hasError('required') && investmentForm.get('acceptTerms')?.touched) {
              <div class="checkbox-error">You must accept the terms</div>
            }
            
            @if (errorMessage) {
              <div class="error-message">{{ errorMessage }}</div>
            }
            
            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!isFormValid() || isLoading">
                @if (isLoading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Register Member
                }
              </button>
            </div>
          </form>
        </mat-step>
      </mat-stepper>
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
      padding: 20px;
      max-width: 800px;
    }
    
    .section-title {
      font-size: 1.1rem;
      font-weight: 500;
      color: #2E7D32;
      margin: 20px 0 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E8F5E9;
    }
    
    .section-title:first-child {
      margin-top: 0;
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding: 20px 0;
    }
    
    mat-form-field {
      width: 100%;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    
    .terms-checkbox {
      margin: 10px 0;
    }
    
    .terms-checkbox a {
      color: #1B5E20;
      text-decoration: none;
    }
    
    .checkbox-error {
      color: #D32F2F;
      font-size: 75%;
      margin-top: -8px;
    }
    
    .error-message {
      color: #D32F2F;
      padding: 12px;
      background: #FFEBEE;
      border-radius: 4px;
      text-align: center;
      margin: 10px 0;
    }
    
    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #E0E0E0;
    }
    
    mat-spinner {
      display: inline-block;
    }
  `]
})
export class MemberFormComponent {
  personalForm: FormGroup;
  emergencyForm: FormGroup;
  bankForm: FormGroup;
  investmentForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private router: Router
  ) {
    this.personalForm = this.fb.group({
      name: ['', Validators.required],
      dateOfBirth: [new Date(), Validators.required],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      occupation: ['', Validators.required],
      employerName: [''],
      phone: ['', Validators.required],
      alternatePhone: [''],
      email: ['', Validators.email],
      address: ['', Validators.required]
    });

    this.emergencyForm = this.fb.group({
      emergencyContactName: [''],
      emergencyContactPhone: ['', Validators.required],
      emergencyContactRelation: [''],
      nomineeName: ['', Validators.required],
      nomineeRelation: [''],
      nomineePhone: ['']
    });

    this.bankForm = this.fb.group({
      bankName: ['', Validators.required],
      accountHolderName: ['', Validators.required],
      accountNumber: ['', Validators.required],
      routingNumber: ['', Validators.required],
      swiftCode: ['']
    });

    this.investmentForm = this.fb.group({
      monthlyAmount: [null, [Validators.required, Validators.min(1)]],
      joinDate: [new Date(), Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  isFormValid(): boolean {
    return this.personalForm.valid && this.emergencyForm.valid && this.bankForm.valid && this.investmentForm.valid;
  }

  onSubmit() {
    if (!this.isFormValid()) return;

    this.isLoading = true;
    this.errorMessage = '';

    const memberData = {
      ...this.personalForm.value,
      ...this.emergencyForm.value,
      ...this.bankForm.value,
      ...this.investmentForm.value
    };

    this.memberService.createMember(memberData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/members']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to register member';
      }
    });
  }
}
