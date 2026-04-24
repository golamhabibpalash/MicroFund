import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

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

  private googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
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
      this.authService.googleLogin(response.credential).subscribe({
        next: () => {
          this.isGoogleLoading = false;
          window.location.href = '/dashboard';
        },
        error: (err) => {
          this.isGoogleLoading = false;
          this.error = err.error?.message || 'Google login failed. Please try again.';
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
      next: (response) => {
        this.isLoading = false;
        window.location.href = '/dashboard';
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Login failed. Please check your credentials.';
      },
    });
  }
}
