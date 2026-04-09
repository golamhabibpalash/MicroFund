import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface RegisterWithMemberDto {
  name: string;
  email: string;
  password: string;
  role?: string;
  dateOfBirth: Date;
  gender: string;
  nationality: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  occupation: string;
  employerName?: string;
  emergencyContactName?: string;
  emergencyContactPhone: string;
  emergencyContactRelation?: string;
  nomineeName: string;
  nomineeRelation?: string;
  nomineePhone?: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode?: string;
  monthlyAmount: number;
  acceptTerms: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  
  currentUser = signal<UserDto | null>(null);
  isAuthenticated = signal<boolean>(false);
  token = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      this.token.set(storedToken);
      this.currentUser.set(JSON.parse(storedUser));
      this.isAuthenticated.set(true);
    }
  }

  login(credentials: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  register(data: RegisterDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  registerWithMember(data: RegisterWithMemberDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register-with-member`, data).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    this.token.set(response.accessToken);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const body = { currentPassword, newPassword };
    const headers = { Authorization: `Bearer ${this.getToken()}` };
    return this.http.post(`${this.apiUrl}/change-password`, body, { headers });
  }
}
