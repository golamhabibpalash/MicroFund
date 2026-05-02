import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { AuthService, GoogleAuthResponse } from '../../core/services/auth.service';
import { Token } from '../../core/services/token';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';

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
  error: string = '';
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
            this.error = 'Your registration is pending approval. You will be notified once an admin approves your account.';
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            this.cdr.detectChanges();
          } else if (res.accessToken) {
            localStorage.setItem('token', res.accessToken);
            localStorage.setItem('refreshToken', res.refreshToken);
            this.tokenService.setUserApproved(res.user.isApproved);
            window.location.href = '/dashboard';
          }
        },
        error: (err) => {
          this.isGoogleLoading = false;
          this.error = err.error?.message || err.error?.RequiresApproval || 'Google login failed. Please try again.';
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

  login() {
    if (this.form.invalid) return;

    this.error = '';
    this.isLoading = true;

    this.authService.login(this.form.value).subscribe({
      next: (response: any) => {
        console.log('Login response:', JSON.stringify(response));
        this.isLoading = false;

        if (response.requiresApproval) {
          this.error = response.message || 'Your account is pending approval. You will be notified once an admin approves your account.';
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          this.cdr.detectChanges();
          return;
        }

        if (response.accessToken) {
          localStorage.setItem('token', response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
          this.tokenService.setUserApproved(response.user?.isApproved ?? false);
          window.location.href = '/dashboard';
          return;
        }

        this.error = 'Invalid email or password. Please try again.';
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.isLoading = false;
        if (err.name === 'TimeoutError') {
          this.error = 'Request timed out. Please try again.';
        } else if (err.status === 401) {
          this.error = err.error?.message || 'Invalid email or password';
        } else if (err.status === 0) {
          this.error = 'Unable to connect to server. Please check if the backend is running.';
        } else {
          this.error = err.error?.message || 'Login failed. Please check your credentials.';
        }
        this.cdr.detectChanges();
      },
    });
  }
}
