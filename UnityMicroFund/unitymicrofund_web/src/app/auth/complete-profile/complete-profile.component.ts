import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MemberProfileService } from '../../core/services/member-profile.service';
import { Token } from '../../core/services/token';
import { BrandingService } from '../../core/services/branding.service';

type ViewState = 'form' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
})
export class CompleteProfileComponent implements OnInit {
  form: FormGroup;
  state: ViewState = 'form';
  error = '';
  submitMessage = '';
  logoUrl = 'assets/organization/logo.png';

  constructor(
    private fb: FormBuilder,
    private memberProfile: MemberProfileService,
    private router: Router,
    private token: Token,
    private brandingService: BrandingService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      address: ['', Validators.required],
      occupation: ['', Validators.required],
      monthlyAmount: ['', [Validators.required, Validators.min(0)]],
      bankName: ['', Validators.required],
      accountHolderName: ['', Validators.required],
      accountNumber: ['', Validators.required],
      nomineeName: ['', Validators.required],
      nomineePhone: ['', Validators.required],
      emergencyContactPhone: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue],
    });
  }

  ngOnInit(): void {
    this.brandingService.getBranding().subscribe({
      next: (b) => { this.logoUrl = b.logoUrl; },
      error: () => { /* keep default logo */ },
    });

    const role = this.token.getUserRole();
    if (role === 'Admin' || role === 'Manager') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.memberProfile.getStatus().subscribe({
      next: (res) => {
        if (res.status === 'active') {
          this.router.navigate(['/dashboard']);
        } else if (res.status === 'pending') {
          this.state = 'success';
          this.submitMessage =
            'Your registration has already been submitted and is awaiting admin review. Please check back later.';
          setTimeout(() => {
            this.token.clearAll();
            this.router.navigate(['/auth/login']);
          }, 6000);
        }
      },
      error: (err) => {
        if (err?.status === 401) {
          this.token.clearAll();
          this.router.navigate(['/auth/login']);
        }
      },
    });
  }

  goToLogin(): void {
    this.token.clearAll();
    this.router.navigate(['/auth/login']);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.state = 'submitting';
    this.error = '';

    const v = this.form.value;
    this.memberProfile
      .completeProfile({
        name: v.name,
        phone: v.phone,
        dateOfBirth: v.dateOfBirth,
        gender: v.gender,
        nationality: v.nationality,
        address: v.address,
        occupation: v.occupation,
        monthlyAmount: Number(v.monthlyAmount),
        bankName: v.bankName,
        accountHolderName: v.accountHolderName,
        accountNumber: v.accountNumber,
        nomineeName: v.nomineeName,
        nomineePhone: v.nomineePhone,
        emergencyContactPhone: v.emergencyContactPhone,
        acceptTerms: v.acceptTerms,
      })
      .subscribe({
        next: () => {
          this.state = 'success';
          this.submitMessage =
            'Your registration form has been submitted successfully. Once our admin team reviews and approves your application, you will be able to access your dashboard. Thank you for your patience.';
          setTimeout(() => {
            this.token.clearAll();
            this.router.navigate(['/auth/login']);
          }, 6000);
        },
        error: (err) => {
          this.state = 'error';
          this.error = err.error?.message || 'Failed to submit your profile.';
        },
      });
  }
}
