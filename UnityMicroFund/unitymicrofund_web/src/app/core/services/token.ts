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

  setTokenExpiry(expiresIn: number): void {
    const expiryTime = new Date().getTime() + expiresIn * 1000;
    localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
  }

  isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem(this.tokenExpiryKey);
    if (!expiryTime) {
      return true;
    }
    return new Date().getTime() > parseInt(expiryTime, 10);
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
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
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
}
