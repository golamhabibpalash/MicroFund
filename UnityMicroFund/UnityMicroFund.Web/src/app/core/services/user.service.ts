import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, RoleClaim, UserClaim, ClaimPermissions } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/settings';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  getUserClaims(userId: string): Observable<UserClaim[]> {
    return this.http.get<UserClaim[]>(`${this.apiUrl}/users/${userId}/claims`);
  }

  addUserClaim(userId: string, claim: { claimType: string; claimValue: string; description?: string }): Observable<UserClaim> {
    return this.http.post<UserClaim>(`${this.apiUrl}/users/${userId}/claims`, claim);
  }

  removeUserClaim(userId: string, claimId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}/claims/${claimId}`);
  }

  getAllRoleClaims(): Observable<RoleClaim[]> {
    return this.http.get<RoleClaim[]>(`${this.apiUrl}/role-claims`);
  }

  getRoleClaims(role: string): Observable<RoleClaim[]> {
    return this.http.get<RoleClaim[]>(`${this.apiUrl}/role-claims/${role}`);
  }

  addRoleClaim(claim: { role: string; claimType: string; claimValue: string; description?: string }): Observable<RoleClaim> {
    return this.http.post<RoleClaim>(`${this.apiUrl}/role-claims`, claim);
  }

  removeRoleClaim(claimId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/role-claims/${claimId}`);
  }

  getRolePermissions(role: string): Observable<ClaimPermissions> {
    return this.http.get<ClaimPermissions>(`${this.apiUrl}/permissions/${role}`);
  }
}
