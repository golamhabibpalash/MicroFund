import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
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
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>
            <h1>Join Unity MicroFund</h1>
          </mat-card-title>
          <mat-card-subtitle>Create your account and become a member</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <mat-stepper linear #stepper>
            <!-- Step 1: Account -->
            <mat-step [stepControl]="accountForm" label="Account Details">
              <form [formGroup]="accountForm">
                <div class="section-title">Login Credentials</div>
                
                <mat-form-field appearance="outline">
                  <mat-label>Full Name</mat-label>
                  <input matInput formControlName="name" placeholder="Enter your full name">
                  <mat-icon matPrefix>person</mat-icon>
                  @if (accountForm.get('name')?.hasError('required') && accountForm.get('name')?.touched) {
                    <mat-error>Name is required</mat-error>
                  }
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" placeholder="Enter your email">
                  <mat-icon matPrefix>email</mat-icon>
                  @if (accountForm.get('email')?.hasError('required') && accountForm.get('email')?.touched) {
                    <mat-error>Email is required</mat-error>
                  }
                  @if (accountForm.get('email')?.hasError('email') && accountForm.get('email')?.touched) {
                    <mat-error>Invalid email format</mat-error>
                  }
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>Password</mat-label>
                  <input matInput formControlName="password" type="password" placeholder="Enter your password">
                  <mat-icon matPrefix>lock</mat-icon>
                  @if (accountForm.get('password')?.hasError('required') && accountForm.get('password')?.touched) {
                    <mat-error>Password is required</mat-error>
                  }
                  @if (accountForm.get('password')?.hasError('minlength') && accountForm.get('password')?.touched) {
                    <mat-error>Password must be at least 6 characters</mat-error>
                  }
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>Confirm Password</mat-label>
                  <input matInput formControlName="confirmPassword" type="password" placeholder="Confirm your password">
                  <mat-icon matPrefix>lock</mat-icon>
                  @if (accountForm.get('confirmPassword')?.hasError('required') && accountForm.get('confirmPassword')?.touched) {
                    <mat-error>Please confirm your password</mat-error>
                  }
                  @if (accountForm.hasError('passwordMismatch') && accountForm.get('confirmPassword')?.touched) {
                    <mat-error>Passwords do not match</mat-error>
                  }
                </mat-form-field>
                
                <div class="step-actions">
                  <button mat-raised-button color="primary" matStepperNext [disabled]="!accountForm.valid">
                    Next <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </form>
            </mat-step>
            
            <!-- Step 2: Personal Info -->
            <mat-step [stepControl]="personalForm" label="Personal Info">
              <form [formGroup]="personalForm">
                <div class="section-title">Personal Information</div>
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Date of Birth</mat-label>
                    <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth">
                    <mat-datepicker-toggle matIconSuffix [for]="dobPicker"></mat-datepicker-toggle>
                    <mat-datepicker #dobPicker></mat-datepicker>
                    @if (personalForm.get('dateOfBirth')?.hasError('required') && personalForm.get('dateOfBirth')?.touched) {
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
                    @if (personalForm.get('gender')?.hasError('required') && personalForm.get('gender')?.touched) {
                      <mat-error>Gender is required</mat-error>
                    }
                  </mat-form-field>
                </div>
                
                <mat-form-field appearance="outline">
                  <mat-label>Nationality</mat-label>
                  <input matInput formControlName="nationality" placeholder="Enter nationality">
                  @if (personalForm.get('nationality')?.hasError('required') && personalForm.get('nationality')?.touched) {
                    <mat-error>Nationality is required</mat-error>
                  }
                </mat-form-field>
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Phone Number</mat-label>
                    <input matInput formControlName="phone" placeholder="Enter phone number">
                    @if (personalForm.get('phone')?.hasError('required') && personalForm.get('phone')?.touched) {
                      <mat-error>Phone number is required</mat-error>
                    }
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Alternate Phone (Optional)</mat-label>
                    <input matInput formControlName="alternatePhone" placeholder="Enter alternate phone">
                  </mat-form-field>
                </div>
                
                <mat-form-field appearance="outline">
                  <mat-label>Address</mat-label>
                  <textarea matInput formControlName="address" placeholder="Enter your full address" rows="2"></textarea>
                  @if (personalForm.get('address')?.hasError('required') && personalForm.get('address')?.touched) {
                    <mat-error>Address is required</mat-error>
                  }
                </mat-form-field>
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Occupation</mat-label>
                    <input matInput formControlName="occupation" placeholder="Enter occupation">
                    @if (personalForm.get('occupation')?.hasError('required') && personalForm.get('occupation')?.touched) {
                      <mat-error>Occupation is required</mat-error>
                    }
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Employer Name (Optional)</mat-label>
                    <input matInput formControlName="employerName" placeholder="Enter employer name">
                  </mat-form-field>
                </div>
                
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext [disabled]="!personalForm.valid">
                    Next <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </form>
            </mat-step>
            
            <!-- Step 3: Emergency & Nominee -->
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
                    @if (emergencyForm.get('emergencyContactPhone')?.hasError('required') && emergencyForm.get('emergencyContactPhone')?.touched) {
                      <mat-error>Emergency contact phone is required</mat-error>
                    }
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Relation (Optional)</mat-label>
                    <input matInput formControlName="emergencyContactRelation" placeholder="e.g., Wife, Husband">
                  </mat-form-field>
                </div>
                
                <div class="section-title">Nominee Information</div>
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Nominee Name</mat-label>
                    <input matInput formControlName="nomineeName" placeholder="Enter nominee name">
                    @if (emergencyForm.get('nomineeName')?.hasError('required') && emergencyForm.get('nomineeName')?.touched) {
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
                    Next <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </form>
            </mat-step>
            
            <!-- Step 4: Bank & Investment -->
            <mat-step [stepControl]="bankForm" label="Bank & Investment">
              <form [formGroup]="bankForm">
                <div class="section-title">Bank Account Information</div>
                
                <mat-form-field appearance="outline">
                  <mat-label>Bank Name</mat-label>
                  <input matInput formControlName="bankName" placeholder="Enter bank name">
                  @if (bankForm.get('bankName')?.hasError('required') && bankForm.get('bankName')?.touched) {
                    <mat-error>Bank name is required</mat-error>
                  }
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>Account Holder Name</mat-label>
                  <input matInput formControlName="accountHolderName" placeholder="Enter account holder name">
                  @if (bankForm.get('accountHolderName')?.hasError('required') && bankForm.get('accountHolderName')?.touched) {
                    <mat-error>Account holder name is required</mat-error>
                  }
                </mat-form-field>
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Account Number</mat-label>
                    <input matInput formControlName="accountNumber" placeholder="Enter account number">
                    @if (bankForm.get('accountNumber')?.hasError('required') && bankForm.get('accountNumber')?.touched) {
                      <mat-error>Account number is required</mat-error>
                    }
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Routing Number</mat-label>
                    <input matInput formControlName="routingNumber" placeholder="Enter routing number">
                    @if (bankForm.get('routingNumber')?.hasError('required') && bankForm.get('routingNumber')?.touched) {
                      <mat-error>Routing number is required</mat-error>
                    }
                  </mat-form-field>
                </div>
                
                <mat-form-field appearance="outline">
                  <mat-label>SWIFT Code (Optional)</mat-label>
                  <input matInput formControlName="swiftCode" placeholder="Enter SWIFT code">
                </mat-form-field>
                
                <div class="section-title">Investment Details</div>
                
                <mat-form-field appearance="outline">
                  <mat-label>Monthly Contribution Amount</mat-label>
                  <input matInput formControlName="monthlyAmount" type="number" placeholder="Enter amount">
                  <span matTextPrefix>$&nbsp;</span>
                  @if (bankForm.get('monthlyAmount')?.hasError('required') && bankForm.get('monthlyAmount')?.touched) {
                    <mat-error>Monthly amount is required</mat-error>
                  }
                  @if (bankForm.get('monthlyAmount')?.hasError('min') && bankForm.get('monthlyAmount')?.touched) {
                    <mat-error>Amount must be greater than 0</mat-error>
                  }
                </mat-form-field>
                
                <mat-checkbox formControlName="acceptTerms" color="primary" class="terms-checkbox">
                  I agree to the <a href="#" (click)="$event.preventDefault()">Terms & Conditions</a> and rules of the investment group.
                </mat-checkbox>
                @if (bankForm.get('acceptTerms')?.hasError('required') && bankForm.get('acceptTerms')?.touched) {
                  <div class="checkbox-error">You must accept the terms</div>
                }
                
                @if (errorMessage) {
                  <div class="error-message">{{ errorMessage }}</div>
                }
                
                @if (successMessage) {
                  <div class="success-message">{{ successMessage }}</div>
                }
                
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!isFormValid() || isLoading">
                    @if (isLoading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>how_to_reg</mat-icon>
                      Register & Join
                    }
                  </button>
                </div>
              </form>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
        
        <mat-card-actions>
          <a routerLink="/login">Already have an account? Sign In</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: linear-gradient(135deg, #1B5E20 0%, #4CAF50 100%);
      padding: 30px 20px;
      overflow-y: auto;
    }
    
    .register-card {
      max-width: 700px;
      width: 100%;
      padding: 20px;
    }
    
    mat-card-header {
      justify-content: center;
      margin-bottom: 20px;
    }
    
    h1 {
      color: #1B5E20;
      margin: 0;
      font-size: 1.6rem;
      text-align: center;
    }
    
    mat-card-subtitle {
      text-align: center;
      margin-top: 5px;
    }
    
    .section-title {
      font-size: 1rem;
      font-weight: 500;
      color: #2E7D32;
      margin: 20px 0 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E8F5E9;
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    mat-form-field {
      width: 100%;
    }
    
    ::ng-deep .mat-mdc-form-field-icon-prefix {
      padding: 0 12px 0 0 !important;
      display: flex !important;
      align-items: center !important;
    }
    
    ::ng-deep .mat-mdc-form-field-icon-prefix mat-icon {
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    ::ng-deep .mat-mdc-text-field-wrapper {
      padding-top: 0 !important;
    }
    
    ::ng-deep .mat-mdc-form-field-infix {
      display: flex !important;
      align-items: center !important;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
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
    
    button {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    
    mat-spinner {
      display: inline-block;
    }
    
    .error-message {
      color: #D32F2F;
      padding: 12px;
      background: #FFEBEE;
      border-radius: 4px;
      text-align: center;
    }
    
    .success-message {
      color: #1B5E20;
      padding: 12px;
      background: #E8F5E9;
      border-radius: 4px;
      text-align: center;
    }
    
    mat-card-actions {
      justify-content: center;
      padding: 16px;
    }
    
    mat-card-actions a {
      color: #1B5E20;
      text-decoration: none;
      font-weight: 500;
    }
    
    mat-card-actions a:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  accountForm: FormGroup;
  personalForm: FormGroup;
  emergencyForm: FormGroup;
  bankForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.personalForm = this.fb.group({
      dateOfBirth: [new Date(1990, 0, 1), Validators.required],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      phone: ['', Validators.required],
      alternatePhone: [''],
      address: ['', Validators.required],
      occupation: ['', Validators.required],
      employerName: ['']
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
      swiftCode: [''],
      monthlyAmount: [null, [Validators.required, Validators.min(1)]],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  isFormValid(): boolean {
    return this.accountForm.valid && this.personalForm.valid && this.emergencyForm.valid && this.bankForm.valid;
  }

  onSubmit() {
    if (!this.isFormValid()) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const registrationData = {
      name: this.accountForm.value.name,
      email: this.accountForm.value.email,
      password: this.accountForm.value.password,
      dateOfBirth: this.personalForm.value.dateOfBirth,
      gender: this.personalForm.value.gender,
      nationality: this.personalForm.value.nationality,
      phone: this.personalForm.value.phone,
      alternatePhone: this.personalForm.value.alternatePhone,
      address: this.personalForm.value.address,
      occupation: this.personalForm.value.occupation,
      employerName: this.personalForm.value.employerName,
      emergencyContactName: this.emergencyForm.value.emergencyContactName,
      emergencyContactPhone: this.emergencyForm.value.emergencyContactPhone,
      emergencyContactRelation: this.emergencyForm.value.emergencyContactRelation,
      nomineeName: this.personalForm.value.nomineeName,
      nomineeRelation: this.personalForm.value.nomineeRelation,
      nomineePhone: this.personalForm.value.nomineePhone,
      bankName: this.bankForm.value.bankName,
      accountHolderName: this.bankForm.value.accountHolderName,
      accountNumber: this.bankForm.value.accountNumber,
      routingNumber: this.bankForm.value.routingNumber,
      swiftCode: this.bankForm.value.swiftCode,
      monthlyAmount: this.bankForm.value.monthlyAmount,
      acceptTerms: this.bankForm.value.acceptTerms
    };

    this.authService.registerWithMember(registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Registration successful! Redirecting to dashboard...';
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Email may already be in use.';
      }
    });
  }
}
