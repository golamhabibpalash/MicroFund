import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Token } from '../services/token';
import { Auth } from '../services/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private tokenService: Token,
    private auth: Auth,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> {
    const token = this.tokenService.getToken();

    if (!token) {
      return this.router.createUrlTree(['/auth/login']);
    }

    if (!this.tokenService.isTokenExpired()) {
      return true;
    }

    // Access token has expired — try a silent refresh before kicking the user out.
    // Most "sudden logout while using the app" reports are just this case: the user
    // still holds a valid refresh token but the guard used to give up immediately.
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      this.tokenService.clearAll();
      return this.router.createUrlTree(['/auth/login']);
    }

    return this.auth.refreshToken().pipe(
      map(() => true),
      catchError(() => {
        this.tokenService.clearAll();
        return of(this.router.createUrlTree(['/auth/login']));
      })
    );
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
