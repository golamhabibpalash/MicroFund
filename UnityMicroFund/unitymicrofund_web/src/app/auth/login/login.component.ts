import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
})
export class LoginComponent {
  form: FormGroup;
  error: string = '';
  isLoading = false;

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

  login() {
    if (this.form.invalid) return;

    this.error = '';
    this.isLoading = true;

    console.log('=== LOGIN START ===');
    console.log('Credentials:', this.form.value);

    this.authService.login(this.form.value).subscribe({
      next: (response) => {
        console.log('=== LOGIN SUCCESS ===');
        console.log('Response keys:', Object.keys(response));
        console.log('Has accessToken:', !!response.accessToken);
        console.log('accessToken length:', response.accessToken?.length);
        
        // Check localStorage
        const savedToken = localStorage.getItem('access_token');
        console.log('Token in localStorage:', !!savedToken);
        console.log('Token value:', savedToken ? savedToken.substring(0, 50) + '...' : 'null');
        
        window.location.href = '/dashboard';
      },
      error: (err) => {
        console.log('=== LOGIN ERROR ===');
        console.log('Error:', err);
        this.isLoading = false;
        this.error = err.error?.message || 'Login failed. Please check your credentials.';
      },
    });
  }
}
