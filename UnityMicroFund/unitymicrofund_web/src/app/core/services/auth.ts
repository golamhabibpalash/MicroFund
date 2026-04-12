import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Token } from './token';

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

  constructor(
    private http: HttpClient,
    private tokenService: Token,
  ) {
    this.checkInitialAuthStatus();
  }

  private checkInitialAuthStatus(): void {
    const token = this.tokenService.getToken();
    if (token && !this.tokenService.isTokenExpired()) {
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        console.log('Auth.login - Response:', response);
        console.log('Auth.login - AccessToken present:', !!response.accessToken);
        this.tokenService.saveToken(response.accessToken);
        if (response.refreshToken) {
          this.tokenService.saveRefreshToken(response.refreshToken);
        }
        this.tokenService.setTokenExpiry(new Date(response.expiresAt));
        this.isAuthenticatedSubject.next(true);
        console.log('Auth.login - Token saved, verifying:', !!this.tokenService.getToken());
      }),
    );
  }

  register(data: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register-with-member`, data).pipe(
      tap((response) => {
        this.tokenService.saveToken(response.accessToken);
        if (response.refreshToken) {
          this.tokenService.saveRefreshToken(response.refreshToken);
        }
        this.tokenService.setTokenExpiry(new Date(response.expiresAt));
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
          this.tokenService.saveToken(response.accessToken);
          if (response.refreshToken) {
            this.tokenService.saveRefreshToken(response.refreshToken);
          }
          this.tokenService.setTokenExpiry(new Date(response.expiresAt));
        }),
      );
  }

  logout(): void {
    this.tokenService.removeToken();
    this.tokenService.removeRefreshToken();
    this.isAuthenticatedSubject.next(false);
  }

  isAuthenticated(): boolean {
    const token = this.tokenService.getToken();
    return !!token && !this.tokenService.isTokenExpired();
  }
}
