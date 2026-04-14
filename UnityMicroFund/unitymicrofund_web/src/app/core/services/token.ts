import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Token {
  private readonly tokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly tokenExpiryKey = 'token_expiry';

  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  removeRefreshToken(): void {
    localStorage.removeItem(this.refreshTokenKey);
  }

  setTokenExpiry(expiresAt: number | Date): void {
    let expiryTime: number;
    if (expiresAt instanceof Date) {
      expiryTime = expiresAt.getTime();
    } else {
      expiryTime = expiresAt;
    }
    localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
  }

  isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem(this.tokenExpiryKey);
    if (!expiryTime) {
      return true;
    }
    const expiryDate = new Date(parseInt(expiryTime, 10));
    const now = new Date();
    return now.getTime() > expiryDate.getTime();
  }

  getTokenExpiryTime(): number | null {
    const expiryTime = localStorage.getItem(this.tokenExpiryKey);
    return expiryTime ? parseInt(expiryTime, 10) : null;
  }

  decodeToken(): any {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      return JSON.parse(atob(base64));
    } catch (error) {
      return null;
    }
  }

  getUserId(): string | null {
    const decoded = this.decodeToken();
    return decoded?.sub || decoded?.userId || null;
  }

  getUserEmail(): string | null {
    const decoded = this.decodeToken();
    return decoded?.email || null;
  }

  getUserName(): string | null {
    const decoded = this.decodeToken();
    if (!decoded) return null;
    
    return decoded.name || 
           decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
           decoded.unique_name ||
           decoded['unique_name'] ||
           decoded.userName ||
           null;
  }
}
