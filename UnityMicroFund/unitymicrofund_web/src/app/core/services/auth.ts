import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Token } from './token';

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
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
        this.tokenService.saveToken(response.access_token);
        if (response.refresh_token) {
          this.tokenService.saveRefreshToken(response.refresh_token);
        }
        this.tokenService.setTokenExpiry(response.expires_in);
        this.isAuthenticatedSubject.next(true);
      }),
    );
  }

  register(data: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => {
        this.tokenService.saveToken(response.access_token);
        if (response.refresh_token) {
          this.tokenService.saveRefreshToken(response.refresh_token);
        }
        this.tokenService.setTokenExpiry(response.expires_in);
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
      .post<AuthResponse>(`${this.apiUrl}/refresh`, { refresh_token: refreshToken })
      .pipe(
        tap((response) => {
          this.tokenService.saveToken(response.access_token);
          if (response.refresh_token) {
            this.tokenService.saveRefreshToken(response.refresh_token);
          }
          this.tokenService.setTokenExpiry(response.expires_in);
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
