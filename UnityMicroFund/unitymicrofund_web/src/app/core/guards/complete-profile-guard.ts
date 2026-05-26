import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Token } from '../services/token';

@Injectable({
  providedIn: 'root',
})
export class CompleteProfileGuard implements CanActivate {
  constructor(
    private tokenService: Token,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    const role = this.tokenService.getUserRole();
    // Admins and Managers operate these pages without a member record of their own.
    if (role === 'Admin' || role === 'Manager') {
      return of(true);
    }

    const decoded = this.tokenService.decodeToken();
    const memberStatus = decoded?.memberStatus;
    if (memberStatus === 'active') {
      return of(true);
    }

    return of(this.router.createUrlTree(['/complete-profile']));
  }
}
