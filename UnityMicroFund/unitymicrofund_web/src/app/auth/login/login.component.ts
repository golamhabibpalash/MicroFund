import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { AuthService } from '../../core/services/auth.service';
import { Token } from '../../core/services/token';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

declare const google: any;
declare const FB: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  error = '';
  isLoading = false;
  isGoogleLoading = false;
  isFacebookLoading = false;

  private googleClientId = environment.googleClientId;
  private facebookAppId = environment.facebookAppId;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private googleAuthService: AuthService,
    private tokenService: Token,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false],
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
      this.authService.googleLogin(response.credential).subscribe({
        next: (res) => {
          this.isGoogleLoading = false;
          if (res.requiresMemberRegistration) {
            if (res.accessToken) {
              this.tokenService.saveToken(res.accessToken);
            }
            this.router.navigate(['/auth', 'complete-profile']);
            this.cdr.detectChanges();
          } else if (res.requiresApproval) {
            this.error = 'Your registration is pending approval.';
            this.tokenService.clearAll();
            this.cdr.detectChanges();
          } else if (res.accessToken) {
            this.tokenService.saveToken(res.accessToken);
            if (res.refreshToken) this.tokenService.saveRefreshToken(res.refreshToken);
            if (res.expiresAt) this.tokenService.setTokenExpiry(new Date(res.expiresAt));
            this.navigateToDashboard();
          }
        },
        error: () => {
          this.isGoogleLoading = false;
          this.error = 'Google login failed.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isGoogleLoading = false;
      this.cdr.detectChanges();
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

  facebookLogin(): void {
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
            if (res.requiresMemberRegistration) {
              if (res.accessToken) {
                this.tokenService.saveToken(res.accessToken);
              }
              this.router.navigate(['/complete-profile']);
              this.cdr.detectChanges();
            } else if (res.requiresApproval) {
              this.error = 'Your registration is pending approval.';
              this.tokenService.clearAll();
              this.cdr.detectChanges();
            } else if (res.accessToken) {
              this.tokenService.saveToken(res.accessToken);
              if (res.refreshToken) this.tokenService.saveRefreshToken(res.refreshToken);
              if (res.expiresAt) this.tokenService.setTokenExpiry(new Date(res.expiresAt));
              this.navigateToDashboard();
            }
          },
          error: () => {
            this.isFacebookLoading = false;
            this.error = 'Facebook login failed.';
            this.cdr.detectChanges();
          }
        });
      } else {
        this.isFacebookLoading = false;
        this.cdr.detectChanges();
      }
    }, { scope: 'public_profile,email' });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.error = '';
    this.isLoading = true;

    this.authService.login({
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (response.requiresApproval) {
          this.error = response.message || 'Your account is pending approval.';
          this.tokenService.clearAll();
          this.cdr.detectChanges();
          return;
        }

        if (response.accessToken && response.accessToken.length > 0) {
          this.tokenService.saveToken(response.accessToken);
          if (response.refreshToken) this.tokenService.saveRefreshToken(response.refreshToken);
          if (response.expiresAt) this.tokenService.setTokenExpiry(new Date(response.expiresAt));
          this.navigateToDashboard();
          return;
        }

        this.error = response.message || 'Invalid email or password.';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.name === 'TimeoutError') {
          this.error = 'Request timed out.';
        } else if (err.status === 401) {
          this.error = 'Invalid email or password.';
        } else if (err.status === 0) {
          this.error = 'Server not running.';
        } else {
          this.error = 'Login failed.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  private navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
