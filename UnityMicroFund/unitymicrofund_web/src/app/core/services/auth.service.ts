import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isApproved: boolean;
}

export interface GoogleAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
  message?: string;
  requiresApproval?: boolean;
  requiresMemberRegistration?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  googleLogin(token: string): Observable<GoogleAuthResponse> {
    return this.http.post<GoogleAuthResponse>(`${this.apiUrl}/google-login`, { token });
  }

  login(credentials: { email: string; password: string }): Observable<GoogleAuthResponse> {
    return this.http.post<GoogleAuthResponse>(`${this.apiUrl}/login`, credentials);
  }

  completeSsoRegistration(data: {
    name: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
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
  }): Observable<GoogleAuthResponse> {
    return this.http.post<GoogleAuthResponse>(`${this.apiUrl}/complete-sso-registration`, data);
  }

  getGoogleClientId(): string {
    return environment.googleClientId;
  }

  getFacebookAppId(): string {
    return environment.facebookAppId;
  }
}