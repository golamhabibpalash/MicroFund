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
    const token = this.tokenService.getToken();

    if (!token) {
      return this.router.createUrlTree(['/auth/login']);
    }

    if (this.tokenService.isTokenExpired()) {
      this.tokenService.clearAll();
      return this.router.createUrlTree(['/auth/login']);
    }

    return true;
  }
}

@Injectable({
  providedIn: 'root',
})
export class PublicGuard implements CanActivate {
  constructor(
    private tokenService: Token,
    private router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    const token = this.tokenService.getToken();

    if (token && !this.tokenService.isTokenExpired()) {
      return this.router.createUrlTree(['/dashboard']);
    }

    if (token && this.tokenService.isTokenExpired()) {
      this.tokenService.clearAll();
    }

    return true;
  }
}