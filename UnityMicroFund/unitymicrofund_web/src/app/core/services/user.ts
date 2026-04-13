import { Injectable } from '@angular/core';
import { Token } from './token';

export type UserRole = 'Admin' | 'Manager' | 'Member' | 'Viewer';

export interface Permission {
  key: string;
  name: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private cachedPermissions: string[] | null = null;

  constructor(private tokenService: Token) {}

  getRole(): UserRole | null {
    const decoded = this.tokenService.decodeToken();
    if (!decoded) return null;
    
    console.log('[UserService] All decoded fields:', Object.keys(decoded));
    
    const role = decoded.role || 
                  decoded.userRole || 
                  decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                  decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] ||
                  decoded['role'];
    
    console.log('[UserService] Found role:', role);
    
    if (role === 'Admin' || role === 'Manager' || role === 'Member' || role === 'Viewer') {
      return role as UserRole;
    }
    
    return null;
  }

  getPermissions(): string[] {
    if (this.cachedPermissions) {
      return this.cachedPermissions;
    }

    const decoded = this.tokenService.decodeToken();
    if (!decoded) return [];

    const permissions: string[] = [];

    if (decoded.permissions && Array.isArray(decoded.permissions)) {
      permissions.push(...decoded.permissions);
    }

    const role = this.getRole();
    if (role === 'Admin') {
      permissions.push(
        'dashboard.view', 'dashboard.export',
        'members.view', 'members.create', 'members.edit', 'members.delete',
        'contributions.view', 'contributions.create', 'contributions.edit', 'contributions.delete', 'contributions.approve',
        'investments.view', 'investments.create', 'investments.edit', 'investments.delete',
        'accounts.view', 'accounts.create', 'accounts.edit', 'accounts.delete', 'accounts.transfer',
        'reports.view', 'reports.export', 'reports.create',
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
        'settings.view', 'settings.manage'
      );
    } else if (role === 'Manager') {
      permissions.push(
        'dashboard.view', 'dashboard.export',
        'members.view', 'members.create', 'members.edit',
        'contributions.view', 'contributions.create', 'contributions.edit', 'contributions.approve',
        'investments.view', 'investments.create', 'investments.edit',
        'accounts.view', 'accounts.create', 'accounts.edit',
        'reports.view', 'reports.export',
        'users.view',
        'settings.view'
      );
    } else if (role === 'Member') {
      permissions.push(
        'dashboard.view',
        'members.view', 'members.edit',
        'contributions.view', 'contributions.create',
        'investments.view',
        'accounts.view',
        'reports.view'
      );
    } else if (role === 'Viewer') {
      permissions.push(
        'dashboard.view',
        'members.view',
        'contributions.view',
        'investments.view',
        'accounts.view',
        'reports.view'
      );
    }

    this.cachedPermissions = [...new Set(permissions)];
    return this.cachedPermissions;
  }

  hasPermission(permission: string): boolean {
    const permissions = this.getPermissions();
    return permissions.includes(permission);
  }

  hasAnyPermission(requiredPermissions: string[]): boolean {
    const permissions = this.getPermissions();
    return requiredPermissions.some(p => permissions.includes(p));
  }

  hasAllPermissions(requiredPermissions: string[]): boolean {
    const permissions = this.getPermissions();
    return requiredPermissions.every(p => permissions.includes(p));
  }

  isAdmin(): boolean {
    return this.getRole() === 'Admin';
  }

  isManager(): boolean {
    return this.getRole() === 'Manager';
  }

  isAdminOrManager(): boolean {
    const role = this.getRole();
    return role === 'Admin' || role === 'Manager';
  }

  isMember(): boolean {
    return this.getRole() === 'Member';
  }

  isViewer(): boolean {
    return this.getRole() === 'Viewer';
  }

  getUserId(): string | null {
    return this.tokenService.getUserId();
  }

  getUserName(): string | null {
    return this.tokenService.getUserName();
  }

  getUserEmail(): string | null {
    return this.tokenService.getUserEmail();
  }

  clearPermissionCache(): void {
    this.cachedPermissions = null;
  }
}
