import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { AuthService, GoogleAuthResponse } from '../../core/services/auth.service';
import { Token } from '../../core/services/token';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
})
export class LoginComponent implements OnInit, AfterViewInit {
  form: FormGroup;
  error = '';
  isLoading = false;
  isGoogleLoading = false;

  private googleClientId = environment.googleClientId;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private googleAuthService: AuthService,
    private tokenService: Token,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.loadGoogleScript();
  }

  loadGoogleScript(): void {
    const script = document.createElement('script');
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

  handleGoogleResponse(response: any): void {
    if (response.credential) {
      this.isGoogleLoading = true;
      this.googleAuthService.googleLogin(response.credential).subscribe({
        next: (res) => {
          this.isGoogleLoading = false;
          if (res.requiresApproval) {
            this.error = 'Your registration is pending approval.';
            this.tokenService.clearAll();
            this.cdr.detectChanges();
          } else if (res.accessToken) {
            this.navigateToDashboard();
          }
        },
        error: () => {
          this.isGoogleLoading = false;
          this.error = 'Google login failed.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  renderGoogleButton(): void {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large', width: 280 }
      );
    }
  }

  login(): void {
    if (this.form.invalid) return;

    this.error = '';
    this.isLoading = true;

    this.authService.login(this.form.value).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (response.requiresApproval) {
          this.error = response.message || 'Your account is pending approval.';
          this.tokenService.clearAll();
          this.cdr.detectChanges();
          return;
        }

        if (response.accessToken && response.accessToken.length > 0) {
          console.log('Login success, token saved, navigating to dashboard');
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
    console.log('Navigating to dashboard...');
    this.router.navigate(['/dashboard']).then(success => {
      console.log('Navigation success:', success);
    });
  }
}