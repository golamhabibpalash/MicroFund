import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Role,
  RoleClaim,
  CreateRole,
  UpdateRole,
  CreateRoleClaim,
  ClaimPermissions,
  PermissionCategory,
  RolePermissionsMatrix,
} from '../models/role.model';

@Injectable({
  providedIn: 'root',
})
export class RoleManagementService {
  private readonly apiUrl = '/api/settings';

  constructor(private http: HttpClient) {}

  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  getRoleByName(roleName: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/roles/${roleName}`);
  }

  createRole(role: CreateRole): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/roles`, role);
  }

  updateRole(roleName: string, role: UpdateRole): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/roles/${roleName}`, role);
  }

  deleteRole(roleName: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${roleName}`);
  }

  getAllRoleClaims(): Observable<RoleClaim[]> {
    return this.http.get<RoleClaim[]>(`${this.apiUrl}/role-claims`);
  }

  getRoleClaims(role: string): Observable<RoleClaim[]> {
    return this.http.get<RoleClaim[]>(`${this.apiUrl}/role-claims/${role}`);
  }

  addRoleClaim(claim: CreateRoleClaim): Observable<RoleClaim> {
    return this.http.post<RoleClaim>(`${this.apiUrl}/role-claims`, claim);
  }

  addRoleClaimsBulk(role: string, permissions: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/role-claims/${role}/bulk`, permissions);
  }

  removeRoleClaim(claimId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/role-claims/${claimId}`);
  }

  removeAllRoleClaims(role: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/role-claims/role/${role}`);
  }

  getRolePermissions(role: string): Observable<ClaimPermissions> {
    return this.http.get<ClaimPermissions>(`${this.apiUrl}/permissions/${role}`);
  }

  getPermissionsMatrix(): Observable<RolePermissionsMatrix> {
    return this.http.get<RolePermissionsMatrix>(`${this.apiUrl}/permissions-matrix`);
  }

  getPermissionCategories(): Observable<PermissionCategory[]> {
    return this.http.get<PermissionCategory[]>(`${this.apiUrl}/permission-categories`);
  }
}
