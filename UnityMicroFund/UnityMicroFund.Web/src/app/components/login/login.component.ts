import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <h1>Unity MicroFund</h1>
          </mat-card-title>
          <mat-card-subtitle>Sign in to your account</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="Email address">
              <mat-icon matPrefix>email</mat-icon>
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <mat-error>Invalid email format</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password" placeholder="Password">
              <mat-icon matPrefix>lock</mat-icon>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>
            
            @if (errorMessage) {
              <div class="error-message">{{ errorMessage }}</div>
            }
            
            <button mat-raised-button color="primary" type="submit" [disabled]="!form.valid || isLoading">
              @if (isLoading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Sign In
              }
            </button>
          </form>
        </mat-card-content>
        
        <mat-card-actions>
          <a routerLink="/register">Don't have an account? Register</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1B5E20 0%, #4CAF50 100%);
      padding: 20px;
    }
    
    .login-card {
      max-width: 400px;
      width: 100%;
      padding: 30px;
    }
    
    mat-card-header {
      justify-content: center;
      margin-bottom: 20px;
    }
    
    h1 {
      color: #1B5E20;
      margin: 0;
      font-size: 1.8rem;
      text-align: center;
    }
    
    mat-card-subtitle {
      text-align: center;
      margin-top: 5px;
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    mat-form-field {
      width: 100%;
    }
    
    ::ng-deep .mat-mdc-form-field-icon-prefix {
      padding: 0 12px 0 0 !important;
      display: flex !important;
      align-items: center !important;
    }
    
    ::ng-deep .mat-mdc-form-field-icon-prefix mat-icon {
      color: #666;
    }
    
    button {
      width: 100%;
      height: 48px;
      margin-top: 10px;
    }
    
    mat-spinner {
      display: inline-block;
    }
    
    .error-message {
      color: #D32F2F;
      padding: 12px;
      background: #FFEBEE;
      border-radius: 4px;
      text-align: center;
      margin: 10px 0;
    }
    
    mat-card-actions {
      justify-content: center;
      padding: 16px;
    }
    
    mat-card-actions a {
      color: #1B5E20;
      text-decoration: none;
      font-weight: 500;
    }
    
    mat-card-actions a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  form: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      console.log('Attempting login with:', this.form.value);
      
      this.authService.login(this.form.value).subscribe({
        next: (response) => {
          console.log('Login successful:', response);
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Login failed:', err);
          this.isLoading = false;
          if (err.status === 401) {
            this.errorMessage = 'Invalid email or password';
          } else if (err.status === 0) {
            this.errorMessage = 'Cannot connect to server. Please check if the API is running.';
          } else {
            this.errorMessage = err.error?.message || 'Login failed. Please try again.';
          }
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
