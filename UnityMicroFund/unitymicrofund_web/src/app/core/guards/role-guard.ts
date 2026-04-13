import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService, UserRole } from '../services/user';
import { Auth } from '../services/auth';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | any> | Promise<boolean> | boolean {
    const allowedRoles = route.data['roles'] as UserRole[];
    
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const userRole = this.userService.getRole();
    
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}

export const roleGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as UserRole[];
  
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRole = userService.getRole();
  
  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | any> | Promise<boolean> | boolean {
    const requiredPermissions = route.data['permissions'] as string[];
    const requireAll = route.data['requireAllPermissions'] as boolean || false;
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    if (requireAll) {
      if (this.userService.hasAllPermissions(requiredPermissions)) {
        return true;
      }
    } else {
      if (this.userService.hasAnyPermission(requiredPermissions)) {
        return true;
      }
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
};

export const permissionGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const router = inject(Router);

  const requiredPermissions = route.data['permissions'] as string[];
  const requireAll = route.data['requireAllPermissions'] as boolean || false;
  
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  if (requireAll) {
    if (userService.hasAllPermissions(requiredPermissions)) {
      return true;
    }
  } else {
    if (userService.hasAnyPermission(requiredPermissions)) {
      return true;
    }
  }

  router.navigate(['/dashboard']);
  return false;
};

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.userService.isAdmin()) {
      return true;
    }
    this.router.navigate(['/dashboard']);
    return false;
  }
}

export const adminGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  const role = userService.getRole();
  console.log('[AdminGuard] User role:', role);
  
  if (userService.isAdmin()) {
    console.log('[AdminGuard] User is admin, allowing access');
    return true;
  }
  console.log('[AdminGuard] User is NOT admin, redirecting');
  router.navigate(['/dashboard']);
  return false;
};

@Injectable({
  providedIn: 'root',
})
export class ManagerGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.userService.isAdminOrManager()) {
      return true;
    }
    this.router.navigate(['/dashboard']);
    return false;
  }
}

export const managerGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (userService.isAdminOrManager()) {
    return true;
  }
  router.navigate(['/dashboard']);
  return false;
};
