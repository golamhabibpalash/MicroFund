import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MemberProfileService } from '../../core/services/member-profile.service';

type ViewState = 'loading' | 'form' | 'pending' | 'submitted';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
})
export class CompleteProfileComponent implements OnInit {
  form: FormGroup;
  state: ViewState = 'loading';
  currentStep = 1;
  totalSteps = 4;
  error = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private memberProfile: MemberProfileService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      dateOfBirth: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      nationality: ['', [Validators.required]],
      address: ['', [Validators.required]],
      occupation: ['', [Validators.required]],
      employerName: ['', []],
      monthlyAmount: ['', [Validators.required, Validators.min(0)]],
      bankName: ['', [Validators.required]],
      accountHolderName: ['', [Validators.required]],
      accountNumber: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      routingNumber: ['', [Validators.pattern(/^[0-9]*$/)]],
      swiftCode: ['', []],
      nomineeName: ['', [Validators.required]],
      nomineePhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      nomineeRelation: ['', [Validators.required]],
      emergencyContactName: ['', [Validators.required]],
      emergencyContactPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      emergencyContactRelation: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    });
  }

  ngOnInit(): void {
    this.memberProfile.getStatus().subscribe({
      next: (res) => {
        if (res.status === 'active') {
          this.router.navigate(['/dashboard']);
        } else if (res.status === 'pending') {
          this.state = 'pending';
        } else {
          this.state = 'form';
        }
      },
      error: () => {
        this.state = 'form';
      },
    });
  }

  get step1Fields() {
    return ['name', 'phone', 'dateOfBirth', 'gender', 'nationality', 'occupation', 'employerName'];
  }

  get step2Fields() {
    return ['address', 'monthlyAmount'];
  }

  get step3Fields() {
    return ['bankName', 'accountHolderName', 'accountNumber', 'routingNumber', 'swiftCode'];
  }

  get step4Fields() {
    return [
      'nomineeName',
      'nomineePhone',
      'nomineeRelation',
      'emergencyContactName',
      'emergencyContactPhone',
      'emergencyContactRelation',
      'acceptTerms',
    ];
  }

  isStepValid(step: number): boolean {
    const fields = this.fieldsForStep(step);
    return fields.every((field) => {
      const control = this.form.get(field);
      return control ? control.valid : true;
    });
  }

  private fieldsForStep(step: number): string[] {
    switch (step) {
      case 1:
        return this.step1Fields;
      case 2:
        return this.step2Fields;
      case 3:
        return this.step3Fields;
      case 4:
        return this.step4Fields;
      default:
        return [];
    }
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) {
      this.currentStep++;
      this.error = '';
    } else {
      this.fieldsForStep(this.currentStep).forEach((f) => this.form.get(f)?.markAsTouched());
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = '';
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
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
        employerName: v.employerName || undefined,
        monthlyAmount: Number(v.monthlyAmount),
        bankName: v.bankName,
        accountHolderName: v.accountHolderName,
        accountNumber: v.accountNumber,
        routingNumber: v.routingNumber || undefined,
        swiftCode: v.swiftCode || undefined,
        nomineeName: v.nomineeName,
        nomineePhone: v.nomineePhone,
        nomineeRelation: v.nomineeRelation,
        emergencyContactName: v.emergencyContactName,
        emergencyContactPhone: v.emergencyContactPhone,
        emergencyContactRelation: v.emergencyContactRelation,
        acceptTerms: v.acceptTerms,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.state = 'submitted';
        },
        error: (err) => {
          this.isLoading = false;
          this.error = err.error?.message || 'Failed to submit your profile. Please try again.';
        },
      });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
