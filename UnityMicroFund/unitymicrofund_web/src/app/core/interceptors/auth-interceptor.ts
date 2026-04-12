import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Token } from '../services/token';
import { Auth } from '../services/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private tokenService: Token,
    private authService: Auth
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    console.log('AuthInterceptor - URL:', req.url);
    
    // Skip token attachment only for public auth endpoints (login, register)
    if (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register')) {
      console.log('AuthInterceptor - Skipping token for auth endpoint');
      return next.handle(req);
    }

    // Add token to request if available
    const token = this.tokenService.getToken();
    console.log('AuthInterceptor - Token exists:', !!token);
    
    if (token) {
      req = this.addTokenToRequest(req, token);
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('AuthInterceptor - Error:', error.status, error.message);
        // Handle 401 errors by attempting to refresh token
        if (error.status === 401 && token) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenToRequest(
    req: HttpRequest<any>,
    token: string
  ): HttpRequest<any> {
    console.log('AuthInterceptor - Adding token to request, token length:', token.length);
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return this.authService.refreshToken().pipe(
      switchMap(() => {
        const newToken = this.tokenService.getToken();
        if (newToken) {
          req = this.addTokenToRequest(req, newToken);
          return next.handle(req);
        }
        this.authService.logout();
        return throwError(() => new Error('Token refresh failed'));
      }),
      catchError(() => {
        this.authService.logout();
        return throwError(() => new Error('Unable to refresh token'));
      })
    );
  }
}
