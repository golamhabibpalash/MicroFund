import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth } from '../services/auth';
import { Token } from '../services/token';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('[AuthGuard] Checking auth for:', state.url);
    const token = this.tokenService.getToken();
    console.log('[AuthGuard] Token exists:', !!token);
    console.log('[AuthGuard] Expired:', this.tokenService.isTokenExpired());
    
    if (token && !this.tokenService.isTokenExpired()) {
      console.log('[AuthGuard] Allowing access');
      return true;
    }

    console.log('[AuthGuard] Redirecting to login');
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
}

// Functional guard alternative for standalone routes
export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const router = inject(Router);

  console.log('[authGuard] Checking auth for:', state.url);
  const token = tokenService.getToken();
  console.log('[authGuard] Token exists:', !!token);
  console.log('[authGuard] Token expired:', tokenService.isTokenExpired());
  
  if (token && !tokenService.isTokenExpired()) {
    console.log('[authGuard] Allowing access');
    return true;
  }

  console.log('[authGuard] Redirecting to login');
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
