import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError, of, map, switchMap } from 'rxjs';
import { Token } from './token';
import { SmsService } from './sms.service';

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly apiUrl = '/api/auth';
  private isAuthenticatedSubject = new BehaviorSubject(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private pendingResetCodes = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private smsService: SmsService,
  ) {
    this.checkInitialAuthStatus();
  }

  private checkInitialAuthStatus(): void {
    const token = this.tokenService.getToken();
    if (token) {
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Auth Service: Sending login request to', this.apiUrl + '/login');
    console.log('Auth Service: Credentials', { email: credentials.email });
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        console.log('Auth Service: Response received', response);
        console.log('Auth Service: accessToken exists:', !!response.accessToken);
        if (response.accessToken) {
          console.log('Auth Service: accessToken length:', response.accessToken.length);
          this.tokenService.saveToken(response.accessToken);
          if (response.refreshToken) {
            this.tokenService.saveRefreshToken(response.refreshToken);
          }
          if (response.expiresAt) {
            this.tokenService.setTokenExpiry(new Date(response.expiresAt));
          }
          this.isAuthenticatedSubject.next(true);
          console.log('Auth Service: Token saved successfully');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Auth Service: HTTP Error', error);
        console.error('Auth Service: Error status:', error.status);
        console.error('Auth Service: Error message:', error.error?.message);
        return throwError(() => error);
      })
    );
  }

  register(data: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register-with-member`, data).pipe(
      tap((response) => {
        if (response.accessToken) {
          this.tokenService.saveToken(response.accessToken);
        }
        if (response.refreshToken) {
          this.tokenService.saveRefreshToken(response.refreshToken);
        }
        if (response.expiresAt) {
          this.tokenService.setTokenExpiry(new Date(response.expiresAt));
        }
        this.isAuthenticatedSubject.next(true);
      }),
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh-token`, { refreshToken: refreshToken })
      .pipe(
        tap((response) => {
          if (response.accessToken) {
            this.tokenService.saveToken(response.accessToken);
          }
          if (response.refreshToken) {
            this.tokenService.saveRefreshToken(response.refreshToken);
          }
          if (response.expiresAt) {
            this.tokenService.setTokenExpiry(new Date(response.expiresAt));
          }
        }),
      );
  }

  logout(): void {
    this.tokenService.removeToken();
    this.tokenService.removeRefreshToken();
    this.isAuthenticatedSubject.next(false);
  }

  googleLogin(token: string): Observable<AuthResponse> {
    console.log('Auth Service: Sending Google login request');
    return this.http.post<AuthResponse>(`${this.apiUrl}/google-login`, { token }).pipe(
      tap((response) => {
        console.log('Auth Service: Google login response received');
        if (response.accessToken) {
          this.tokenService.saveToken(response.accessToken);
          if (response.refreshToken) {
            this.tokenService.saveRefreshToken(response.refreshToken);
          }
          if (response.expiresAt) {
            this.tokenService.setTokenExpiry(new Date(response.expiresAt));
          }
          this.isAuthenticatedSubject.next(true);
          console.log('Auth Service: Google token saved successfully');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Auth Service: Google login error', error);
        return throwError(() => error);
      })
    );
  }

  isAuthenticated(): boolean {
    const token = this.tokenService.getToken();
    return !!token;
  }

  forgotPassword(phone: string): Observable<{ message: string }> {
    return this.getUserByPhone(phone).pipe(
      catchError(() => {
        throw new Error('User not found with this phone number');
      }),
      tap((user) => {
        if (this.smsService.isConfigured()) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = Date.now() + 10 * 60 * 1000;
          this.pendingResetCodes.set(phone, { code, expiresAt });
          this.smsService.sendOtp(phone).subscribe({
            next: () => console.log('OTP sent successfully'),
            error: (err) => console.error('Failed to send OTP:', err),
          });
        }
      }),
      map(() => ({ message: 'Reset code sent to your phone number' }))
    );
  }

  private getUserByPhone(phone: string): Observable<{ id: string; name: string; phone: string; email: string }> {
    return this.http.get<{ id: string; name: string; phone: string; email: string }>(
      `${this.apiUrl}/user-by-phone/${phone.replace('+', '')}`
    );
  }

  verifyResetCode(phone: string, code: string): Observable<{ valid: boolean }> {
    const stored = this.pendingResetCodes.get(phone);
    
    if (!stored) {
      return of({ valid: false });
    }
    
    if (Date.now() > stored.expiresAt) {
      this.pendingResetCodes.delete(phone);
      return of({ valid: false });
    }
    
    if (stored.code !== code) {
      return of({ valid: false });
    }
    
    this.pendingResetCodes.delete(phone);
    return of({ valid: true });
  }

  resetPassword(phone: string, code: string, newPassword: string): Observable<{ message: string }> {
    return this.verifyResetCode(phone, code).pipe(
      tap((response) => {
        if (!response.valid) {
          throw new Error('Invalid or expired verification code');
        }
      }),
      switchMap(() => 
        this.http.post<{ message: string }>(`${this.apiUrl}/reset-password-by-phone`, {
          phone,
          newPassword,
        })
      )
    );
  }
}
