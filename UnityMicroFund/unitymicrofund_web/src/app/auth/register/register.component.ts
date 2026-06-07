import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { AuthService } from '../../core/services/auth.service';
import { Token } from '../../core/services/token';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppConfigService } from '../../core/services/app-config.service';

declare const google: any;
declare const FB: any;

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
})
export class RegisterComponent implements OnInit, AfterViewInit {
  form: FormGroup;
  error: string = '';
  success: string = '';
  currentStep: number = 1;
  totalSteps: number = 4;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  isGoogleLoading = false;
  isFacebookLoading = false;

  private googleClientId = '';
  private facebookAppId = '';

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private googleAuthService: AuthService,
    private tokenService: Token,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private configService: AppConfigService,
  ) {
    this.googleClientId = this.configService.googleClientId;
    this.facebookAppId = this.configService.facebookAppId;
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

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.loadGoogleScript();
    this.loadFacebookSdk();
  }

  loadGoogleScript(): void {
    if (typeof google !== 'undefined' && google.accounts) return;
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeGoogleSignIn();
    document.head.appendChild(script);
  }

  initializeGoogleSignIn(): void {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: any) => this.handleGoogleResponse(response),
      });
    }
  }

  signInWithGoogle(): void {
    if (typeof google === 'undefined' || !google.accounts) {
      this.loadGoogleScript();
      return;
    }

    this.isGoogleLoading = true;
    this.error = '';

    const tempDiv = document.createElement('div');
    tempDiv.id = 'google-temp-btn-' + Date.now();
    tempDiv.style.position = 'fixed';
    tempDiv.style.opacity = '0';
    tempDiv.style.pointerEvents = 'none';
    tempDiv.style.zIndex = '-1';
    document.body.appendChild(tempDiv);

    google.accounts.id.renderButton(
      document.getElementById(tempDiv.id),
      { theme: 'outline', size: 'large' }
    );

    requestAnimationFrame(() => {
      const btn = tempDiv.querySelector('[role="button"], button') as HTMLElement;
      if (btn) {
        btn.click();
      } else {
        this.isGoogleLoading = false;
        this.error = 'Google sign-in unavailable.';
        this.cdr.detectChanges();
      }
      setTimeout(() => tempDiv.remove(), 1000);
    });
  }

  handleGoogleResponse(response: any): void {
    if (response.credential) {
      this.isGoogleLoading = true;
      this.authService.googleLogin(response.credential).subscribe({
        next: (res) => {
          this.isGoogleLoading = false;
          if (res.accessToken) {
            this.router.navigate(['/dashboard']);
          } else {
            this.error = res.message || 'Registration pending approval.';
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.isGoogleLoading = false;
          this.error = 'Google sign up failed.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  loadFacebookSdk(): void {
    if (document.getElementById('facebook-jssdk')) return;
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeFacebookSdk();
    document.head.appendChild(script);
  }

  initializeFacebookSdk(): void {
    if (typeof FB !== 'undefined') {
      FB.init({
        appId: this.facebookAppId,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    }
  }

  facebookSignUp(): void {
    if (typeof FB === 'undefined') {
      this.error = 'Facebook SDK not loaded.';
      return;
    }

    this.isFacebookLoading = true;
    FB.login((response: any) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        this.authService.facebookLogin(accessToken).subscribe({
          next: (res) => {
            this.isFacebookLoading = false;
            if (res.requiresApproval) {
              this.error = 'Registration submitted! Your account is pending approval.';
              this.tokenService.clearAll();
              this.cdr.detectChanges();
            } else if (res.accessToken) {
              this.router.navigate(['/dashboard']);
            }
          },
          error: () => {
            this.isFacebookLoading = false;
            this.error = 'Facebook sign up failed.';
            this.cdr.detectChanges();
          }
        });
      } else {
        this.isFacebookLoading = false;
        this.cdr.detectChanges();
      }
    }, { scope: 'public_profile,email' });
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
    this.success = '';
    this.isLoading = true;

    this.authService.register({ ...memberData, password }).subscribe({
      next: () => {
        this.success = 'Registration successful! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Registration failed. Please try again.';
      },
    });
  }
}
