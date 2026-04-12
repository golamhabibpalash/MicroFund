import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Token {
  private readonly tokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly tokenExpiryKey = 'token_expiry';

  saveToken(token: string): void {
    console.log('Token.saveToken() - Saving token, length:', token.length);
    localStorage.setItem(this.tokenKey, token);
    console.log('Token.saveToken() - Saved. All keys now:', Object.keys(localStorage));
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    console.log('[Token.getToken] key:', this.tokenKey, 'token exists:', !!token, 'all keys:', Object.keys(localStorage));
    return token;
  }

  removeToken(): void {
    console.log('[Token] Removing access_token. Before:', Object.keys(localStorage));
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
    console.log('[Token] After:', Object.keys(localStorage));
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
    const isExpired = now.getTime() > expiryDate.getTime();
    console.log('Token expiry check - Now:', now.toISOString(), 'Expiry:', expiryDate.toISOString(), 'Expired:', isExpired);
    return isExpired;
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

  getUserName(): string | null {
    const decoded = this.decodeToken();
    return decoded?.name || null;
  }
}
