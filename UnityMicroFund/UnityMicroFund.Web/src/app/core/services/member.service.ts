import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Member, CreateMemberDto, UpdateMemberDto } from '../models/member.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl = '/api/members';
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getMembers(search?: string, isActive?: boolean): Observable<Member[]> {
    let params: any = {};
    if (search) params['search'] = search;
    if (isActive !== undefined) params['isActive'] = isActive;
    return this.http.get<Member[]>(this.apiUrl, { params, headers: this.getHeaders() });
  }

  getMember(id: string): Observable<Member> {
    return this.http.get<Member>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createMember(member: CreateMemberDto): Observable<Member> {
    return this.http.post<Member>(this.apiUrl, member, { headers: this.getHeaders() });
  }

  updateMember(id: string, member: UpdateMemberDto): Observable<Member> {
    return this.http.put<Member>(`${this.apiUrl}/${id}`, member, { headers: this.getHeaders() });
  }

  deleteMember(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
