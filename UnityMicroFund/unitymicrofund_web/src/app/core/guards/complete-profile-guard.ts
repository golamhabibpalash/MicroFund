import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
      map((res) =>
        res.status === 'active' ? true : this.router.createUrlTree(['/complete-profile']),
      ),
      catchError(() => of(this.router.createUrlTree(['/complete-profile']))),
    );
  }
}
