import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Token } from '../services/token';
import { Auth } from '../services/auth';

const PUBLIC_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google-login',
  '/api/auth/facebook-login',
  '/api/auth/forgot-password',
  '/api/auth/verify-reset-code',
  '/api/auth/reset-password',
  '/api/auth/refresh-token',
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Coalesces concurrent 401s into a single refresh call instead of firing one per request.
  private isRefreshing = false;
  private refreshedToken$ = new BehaviorSubject<string | null>(null);

  constructor(
    private tokenService: Token,
    private auth: Auth,
    private router: Router,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    // Skip token attachment (and refresh handling) for public auth endpoints
    if (PUBLIC_ENDPOINTS.some(e => req.url.includes(e))) {
      return next.handle(req);
    }

    const token = this.tokenService.getToken();
    const authReq = token ? this.addTokenToRequest(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && this.tokenService.getRefreshToken()) {
          return this.handle401(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshedToken$.next(null);

      return this.auth.refreshToken().pipe(
        switchMap((res) => {
          this.isRefreshing = false;
          const newToken = res.accessToken || this.tokenService.getToken();
          this.refreshedToken$.next(newToken ?? null);
          return next.handle(this.addTokenToRequest(req, newToken!));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          // Refresh token is invalid/expired too — this is a real session end.
          this.tokenService.clearAll();
          this.router.navigate(['/auth/login']);
          return throwError(() => err);
        })
      );
    }

    // A refresh for another request is already in flight — wait for it, then retry.
    return this.refreshedToken$.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap(t => next.handle(this.addTokenToRequest(req, t)))
    );
  }

  private addTokenToRequest(
    req: HttpRequest<any>,
    token: string
  ): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
