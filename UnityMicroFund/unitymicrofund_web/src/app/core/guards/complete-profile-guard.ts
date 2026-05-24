import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { Token } from '../services/token';
import { MemberProfileService } from '../services/member-profile.service';

@Injectable({
  providedIn: 'root',
})
export class CompleteProfileGuard implements CanActivate {
  constructor(
    private tokenService: Token,
    private memberProfile: MemberProfileService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Admins and Managers operate these pages without a member record of their own.
    const role = this.tokenService.getUserRole();
    if (role === 'Admin' || role === 'Manager') {
      return of(true);
    }

    return this.memberProfile.getStatus().pipe(
      map((res) => {
        if (res.status === 'active') {
          return true;
        }
        // Pending users have a member record but are awaiting approval — redirect
        // to the complete-profile page which will show the "already submitted" message.
        return this.router.createUrlTree(['/complete-profile']);
      }),
      catchError((error: unknown) => {
        // An expired or missing token produces a 401. Clear credentials and
        // send the user to login rather than showing the registration form.
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.tokenService.clearAll();
          return of(this.router.createUrlTree(['/auth/login']));
        }
        return of(this.router.createUrlTree(['/complete-profile']));
      }),
    );
  }
}
