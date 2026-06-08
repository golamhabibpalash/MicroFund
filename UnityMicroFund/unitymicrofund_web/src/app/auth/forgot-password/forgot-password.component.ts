import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { Auth, ResetMethod } from '../../core/services/auth';
import { BrandingService } from '../../core/services/branding.service';

/** Max time to wait for an auth request before showing the user an error instead of an endless spinner. */
const REQUEST_TIMEOUT_MS = 20000;

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
})
export class ForgotPasswordComponent implements OnInit {
  form: FormGroup;
  currentStep: number = 1;
  totalSteps: number = 3;
  error: string = '';
  success: string = '';
  isLoading = false;
  method: ResetMethod = 'email';
  destination: string = '';
  logoUrl = 'assets/organization/logo.png';

  private readonly emailValidators = [Validators.required, Validators.email];

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
    private brandingService: BrandingService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      email: ['', this.emailValidators],
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.brandingService.getBranding().subscribe({
      next: (b) => { this.logoUrl = b.logoUrl; },
      error: () => { /* keep default logo */ },
    });
  }

  selectMethod(method: ResetMethod): void {
    if (method === 'phone') return;
    if (this.method === method) return;
    this.method = method;
    this.error = '';
    this.success = '';
  }

  get step1Fields() {
    return ['email'];
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
      this.destination = this.getIdentifier();
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

  private getIdentifier(): string {
    const control = this.form.get('email');
    return (control?.value || '').trim();
  }

  requestResetCode() {
    this.isLoading = true;
    this.error = '';
    this.authService.forgotPassword(this.method, this.destination)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.currentStep = 2;
          this.success = 'A 6-digit code has been sent to your email.';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.error = this.describeError(err, 'Failed to send reset code. Please try again.');
          this.cdr.detectChanges();
        },
      });
  }

  verifyCode() {
    this.isLoading = true;
    this.error = '';
    const code = this.form.get('code')?.value;
    this.authService.verifyResetCode(this.method, this.destination, code)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.valid) {
            this.currentStep = 3;
            this.success = 'Code verified. Please enter your new password.';
          } else {
            this.error = 'Invalid or expired verification code.';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.error = this.describeError(err, 'Failed to verify code. Please try again.');
          this.cdr.detectChanges();
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
    this.authService.resetPassword(this.method, this.destination, code, newPassword)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.success = 'Password reset successful! Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
            this.cdr.detectChanges();
          }, 2000);
        },
        error: (err) => {
          this.isLoading = false;
          this.error = this.describeError(err, 'Failed to reset password. Please try again.');
          this.cdr.detectChanges();
        },
      });
  }

  /** Maps an HTTP/timeout error to a user-friendly message so the UI never gets stuck on a spinner. */
  private describeError(err: any, fallback: string): string {
    if (err?.name === 'TimeoutError') {
      return 'The request timed out. Please check your connection and try again.';
    }
    if (err?.status === 404) {
      return 'No account found with this email address.';
    }
    if (err?.status === 0) {
      return 'Could not reach the server. Please try again later.';
    }
    return err?.error?.message || fallback;
  }
}