import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
})
export class ForgotPasswordComponent {
  form: FormGroup;
  currentStep: number = 1;
  totalSteps: number = 3;
  error: string = '';
  success: string = '';
  isLoading = false;
  phone: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
  ) {
    this.form = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  get step1Fields() {
    return ['phone'];
  }

  get step2Fields() {
    return ['code'];
  }

  get step3Fields() {
    return ['newPassword', 'confirmPassword'];
  }

  isStepValid(step: number): boolean {
    let fields: string[];
    switch (step) {
      case 1:
        fields = this.step1Fields;
        break;
      case 2:
        fields = this.step2Fields;
        break;
      case 3:
        fields = this.step3Fields;
        break;
      default:
        return false;
    }
    return fields.every((field) => {
      const control = this.form.get(field);
      return control ? control.valid : true;
    });
  }

  nextStep() {
    if (this.currentStep === 1 && this.isStepValid(1)) {
      this.phone = this.formatPhoneNumber(this.form.get('phone')?.value);
      this.requestResetCode();
    } else if (this.currentStep === 2 && this.isStepValid(2)) {
      this.verifyCode();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = '';
    }
  }

  private formatPhoneNumber(phone: string): string {
    let number = phone.replace(/[\s\-\(\)]/g, '');
    
    if (number.startsWith('+880')) {
      return number;
    } else if (number.startsWith('880')) {
      return '+' + number;
    } else if (number.startsWith('0')) {
      return '+88' + number.substring(1);
    } else if (number.length === 10) {
      return '+88' + number;
    }
    return '+' + number;
  }

  requestResetCode() {
    this.isLoading = true;
    this.error = '';
    this.authService.forgotPassword(this.phone).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.currentStep = 2;
        this.success = 'Reset code sent to your phone. Please enter the 6-digit code.';
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Failed to send reset code. Please try again.';
      },
    });
  }

  verifyCode() {
    this.isLoading = true;
    this.error = '';
    const code = this.form.get('code')?.value;
    this.authService.verifyResetCode(this.phone, code).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.valid) {
          this.currentStep = 3;
          this.success = 'Code verified. Please enter your new password.';
        } else {
          this.error = 'Invalid verification code.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Failed to verify code. Please try again.';
      },
    });
  }

  resetPassword() {
    const newPassword = this.form.get('newPassword')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;

    if (newPassword !== confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.error = '';
    const code = this.form.get('code')?.value;
    this.authService.resetPassword(this.phone, code, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.success = 'Password reset successful! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Failed to reset password. Please try again.';
      },
    });
  }
}