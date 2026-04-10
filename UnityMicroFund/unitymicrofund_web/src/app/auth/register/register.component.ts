import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
})
export class RegisterComponent {
  form: FormGroup;
  error: string = '';
  success: string = '';
  currentStep: number = 1;
  totalSteps: number = 4;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
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
      routingNumber: ['', [Validators.pattern(/^[0-9]+$/)]],
      swiftCode: ['', [Validators.pattern(/^[A-Z]{4}[A-Z]{2}[0-9]{2}[A-Z0-9]{0,3}$/)]],
      nomineeName: ['', [Validators.required]],
      nomineePhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      nomineeRelation: ['', [Validators.required]],
      emergencyContactName: ['', [Validators.required]],
      emergencyContactPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      emergencyContactRelation: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    });
  }

  get step1Fields() {
    return ['name', 'phone', 'dateOfBirth', 'gender', 'nationality', 'occupation', 'employerName'];
  }

  get step2Fields() {
    return ['address', 'email', 'monthlyAmount', 'password', 'confirmPassword'];
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
      case 4:
        fields = this.step4Fields;
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
    if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  register() {
    if (this.form.invalid) return;

    const { confirmPassword, acceptTerms, password, ...memberData } = this.form.value;

    if (password !== confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.error = '';
    this.authService.register({ ...memberData, password }).subscribe({
      next: () => {
        this.success = 'Registration successful! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Registration failed. Please try again.';
      },
    });
  }
}
