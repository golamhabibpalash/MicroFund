import { Injectable } from '@angular/core';
import { Token } from './token';

export type UserRole = 'Admin' | 'User' | 'Investor' | 'Manager';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private tokenService: Token) {}

  getRole(): UserRole | null {
    const decoded = this.tokenService.decodeToken();
    return decoded?.role || decoded?.userRole || null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'Admin';
  }

  isUser(): boolean {
    const role = this.getRole();
    return role === 'User' || role === 'Investor' || role === 'Manager';
  }

  getUserId(): string | null {
    return this.tokenService.getUserId();
  }

  getUserName(): string | null {
    return this.tokenService.getUserName();
  }

  getUserEmail(): string | null {
    return this.tokenService.getUserEmail();
  }
}
