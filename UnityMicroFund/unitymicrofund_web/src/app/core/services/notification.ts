import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Token } from './token';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  relatedUserId?: string;
  relatedMemberId?: string;
  createdByUserId: string;
  targetUserId: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface RegistrationRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  memberId?: string;
  requestType: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  processedByUserId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = '/api/notification';
  private unreadCount$ = new BehaviorSubject<number>(0);
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  constructor(private http: HttpClient, private tokenService: Token) {}

  getToken(): string | null {
    return this.tokenService.getToken();
  }

  getNotifications(count = 20): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}?count=${count}`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`);
  }

  loadUnreadCount(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    this.getUnreadCount().subscribe({
      next: (response) => this.unreadCount$.next(response.count),
      error: (err) => {
        if (err.status === 401) {
          window.location.href = '/auth/login';
        }
        this.unreadCount$.next(0);
      }
    });
  }

  getUnreadCountSubject(): BehaviorSubject<number> {
    return this.unreadCount$;
  }

  markAsRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read-all`, {});
  }

  getRegistrationRequests(): Observable<RegistrationRequest[]> {
    return this.http.get<RegistrationRequest[]>(`${this.apiUrl}/registration-requests`);
  }

  approveRegistration(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/registration-requests/${id}/approve`, {});
  }

  rejectRegistration(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/registration-requests/${id}/reject`, {});
  }

  onNotificationReceived(): BehaviorSubject<Notification[]> {
    return this.notifications$;
  }
}