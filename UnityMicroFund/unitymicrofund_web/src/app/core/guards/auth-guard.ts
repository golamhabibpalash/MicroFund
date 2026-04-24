import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Token } from '../services/token';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private tokenService: Token,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    console.log('=== AUTH GUARD CHECK ===');
    console.log('URL:', state.url);
    
    // Check localStorage directly
    const localStorageToken = localStorage.getItem('access_token');
    console.log('Direct localStorage check:', !!localStorageToken);
    
    // Check via service
    const serviceToken = this.tokenService.getToken();
    console.log('Service getToken():', !!serviceToken);
    
    if (!localStorageToken && !serviceToken) {
      console.log('AUTH GUARD: No token found - redirecting to login');
      return this.router.createUrlTree(['/auth/login']);
    }

    console.log('AUTH GUARD: Token found - allowing access');
    return true;
  }
}
