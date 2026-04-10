import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { Token } from '../services/token';

@Injectable({
  providedIn: 'root',
})
export class PublicGuard implements CanActivate {
  constructor(
    private tokenService: Token,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }

  private isAuthenticated(): boolean {
    const token = this.tokenService.getToken();
    return !!token && !this.tokenService.isTokenExpired();
  }
}

// Functional guard for public routes
export const publicGuard: CanActivateFn = () => {
  const tokenService = inject(Token);
  const router = inject(Router);

  const token = tokenService.getToken();
  if (token && !tokenService.isTokenExpired()) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
