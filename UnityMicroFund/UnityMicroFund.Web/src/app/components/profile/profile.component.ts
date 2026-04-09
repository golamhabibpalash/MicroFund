import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
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
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="profile-container">
      <div class="header">
        <button mat-icon-button routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>My Profile</h1>
      </div>
      
      <mat-card class="profile-card">
        <div class="profile-header">
          <div class="avatar">
            {{ getInitials() }}
          </div>
          <div class="user-info">
            <h2>{{ authService.currentUser()?.name }}</h2>
            <span class="role-badge">{{ authService.currentUser()?.role }}</span>
            <p class="email">{{ authService.currentUser()?.email }}</p>
          </div>
        </div>
      </mat-card>
      
      <mat-card class="password-card">
        <mat-card-header>
          <mat-card-title>Change Password</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()">
            <mat-form-field appearance="outline">
              <mat-label>Current Password</mat-label>
              <input matInput formControlName="currentPassword" type="password">
              @if (passwordForm.get('currentPassword')?.hasError('required')) {
                <mat-error>Current password is required</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>New Password</mat-label>
              <input matInput formControlName="newPassword" type="password">
              @if (passwordForm.get('newPassword')?.hasError('required')) {
                <mat-error>New password is required</mat-error>
              }
              @if (passwordForm.get('newPassword')?.hasError('minlength')) {
                <mat-error>Password must be at least 6 characters</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Confirm New Password</mat-label>
              <input matInput formControlName="confirmPassword" type="password">
              @if (passwordForm.get('confirmPassword')?.hasError('required')) {
                <mat-error>Please confirm your password</mat-error>
              }
              @if (passwordForm.hasError('passwordMismatch')) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>
            
            @if (errorMessage) {
              <div class="error-message">{{ errorMessage }}</div>
            }
            
            @if (successMessage) {
              <div class="success-message">{{ successMessage }}</div>
            }
            
            <button mat-raised-button color="primary" type="submit" [disabled]="!passwordForm.valid || isLoading">
              @if (isLoading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Change Password
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 600px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    h1 {
      color: #1B5E20;
      margin: 0;
    }
    
    .profile-card {
      margin-bottom: 20px;
      padding: 20px;
    }
    
    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1B5E20, #4CAF50);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: bold;
    }
    
    .user-info h2 {
      margin: 0 0 5px 0;
      color: #333;
    }
    
    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #E8F5E9;
      color: #1B5E20;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .email {
      color: #666;
      margin: 5px 0 0 0;
      font-size: 0.9rem;
    }
    
    .password-card {
      padding: 10px;
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 15px;
    }
    
    mat-form-field {
      width: 100%;
    }
    
    button {
      align-self: flex-end;
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
    }
    
    .success-message {
      color: #1B5E20;
      padding: 12px;
      background: #E8F5E9;
      border-radius: 4px;
      text-align: center;
    }
  `]
})
export class ProfileComponent implements OnInit {
  passwordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    console.log('Profile user:', this.authService.currentUser());
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  getInitials(): string {
    const name = this.authService.currentUser()?.name || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  onChangePassword() {
    if (this.passwordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const { currentPassword, newPassword } = this.passwordForm.value;
      
      this.authService.changePassword(currentPassword, newPassword).subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = 'Password changed successfully!';
          this.passwordForm.reset();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Failed to change password';
        }
      });
    }
  }
}
