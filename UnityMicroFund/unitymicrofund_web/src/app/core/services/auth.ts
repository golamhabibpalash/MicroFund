import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError, map, of, switchMap } from 'rxjs';
import { Token } from './token';
import { SmsService } from './sms.service';

interface AuthResponseDto {
  AccessToken: string;
  RefreshToken?: string;
  ExpiresAt?: string;
  User?: {
    Id: string;
    Name: string;
    Email: string;
    Role: string;
    IsActive?: boolean;
    IsApproved?: boolean;
  };
  Message?: string;
  RequiresApproval?: boolean;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive?: boolean;
    isApproved?: boolean;
  };
  message?: string;
  requiresApproval?: boolean;
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
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map((response) => {
        if (response.requiresApproval) {
          return {
            requiresApproval: true,
            message: response.message || 'Your account is pending approval.',
            user: response.user,
          };
        }

        const token = response.accessToken || response.AccessToken;
        const refreshToken = response.refreshToken || response.RefreshToken;
        const expiresAt = response.expiresAt || response.ExpiresAt;

        if (token && token.length > 0) {
          this.tokenService.saveToken(token);
          if (refreshToken) {
            this.tokenService.saveRefreshToken(refreshToken);
          }
          if (expiresAt) {
            this.tokenService.setTokenExpiry(new Date(expiresAt));
          }
          this.isAuthenticatedSubject.next(true);

          return {
            accessToken: token,
            refreshToken: refreshToken,
            expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
            user: response.user,
          };
        }

        return { 
          accessToken: '', 
          message: response.message || 'Invalid email or password.' 
        };
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }

  register(data: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/register-with-member`, data).pipe(
      map((response) => {
        const token = response.accessToken || response.AccessToken;
        const refreshToken = response.refreshToken || response.RefreshToken;
        const expiresAt = response.expiresAt || response.ExpiresAt;

        if (token) {
          this.tokenService.saveToken(token);
        }
        if (refreshToken) {
          this.tokenService.saveRefreshToken(refreshToken);
        }
        if (expiresAt) {
          this.tokenService.setTokenExpiry(new Date(expiresAt));
        }
        this.isAuthenticatedSubject.next(true);

        return {
          accessToken: token || '',
          refreshToken: refreshToken,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
          user: response.user,
        };
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
    return this.http.post<any>(`${this.apiUrl}/google-login`, { token }).pipe(
      map((response) => {
        if (response.requiresApproval) {
          return {
            requiresApproval: true,
            message: response.message || 'Your account is pending approval.',
            user: response.user,
          };
        }

        const loginToken = response.accessToken || response.AccessToken;
        const refreshToken = response.refreshToken || response.RefreshToken;
        const expiresAt = response.expiresAt || response.ExpiresAt;

        if (loginToken && loginToken.length > 0) {
          this.tokenService.saveToken(loginToken);
          if (refreshToken) {
            this.tokenService.saveRefreshToken(refreshToken);
          }
          if (expiresAt) {
            this.tokenService.setTokenExpiry(new Date(expiresAt));
          }
          this.isAuthenticatedSubject.next(true);

          return {
            accessToken: loginToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
            user: response.user,
          };
        }

        return { accessToken: '' };
      }),
      catchError((error: HttpErrorResponse) => {
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
            error: (err: any) => console.error('Failed to send OTP:', err),
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
