import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  User,
  UserDetail,
  UserClaim,
  CreateUser,
  UpdateUser,
  AssignRole,
  BulkAssignRole,
  CreateUserClaim,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private readonly apiUrl = '/api/settings';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  getUserById(userId: string): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.apiUrl}/users/${userId}`);
  }

  createUser(user: CreateUser): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }

  updateUser(userId: string, user: UpdateUser): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}`, user);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
  }

  updateUserRole(userId: string, role: AssignRole): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/users/${userId}/role`, role);
  }

  bulkUpdateUserRole(data: BulkAssignRole): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/users/bulk-role`, data);
  }

  getUserClaims(userId: string): Observable<UserClaim[]> {
    return this.http.get<UserClaim[]>(`${this.apiUrl}/users/${userId}/claims`);
  }

  addUserClaim(claim: CreateUserClaim): Observable<UserClaim> {
    return this.http.post<UserClaim>(`${this.apiUrl}/users/${claim.userId}/claims`, claim);
  }

  removeUserClaim(userId: string, claimId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/claims/${claimId}`);
  }
}
