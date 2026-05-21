import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { Token } from './token';

export interface ChatRoom {
  id: string;
  name: string;
  type: string;
  description?: string;
  imageUrl?: string;
  createdBy: string;
  createdAt: string;
  members: ChatMember[];
  unreadCount: number;
  lastMessage?: ChatMessage;
}

export interface ChatMember {
  id: string;
  memberId: string;
  memberName: string;
  profileImageUrl?: string;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderImageUrl?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Member {
  id: string;       // Member.Id
  userId?: string;  // User.Id — used for online presence check
  name: string;
  email?: string;
  phone?: string;
  profileImageUrl?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly apiUrl = '/api/chat';
  private hubConnection: signalR.HubConnection | null = null;

  private messageReceivedSubject = new Subject<ChatMessage>();
  public messageReceived$ = this.messageReceivedSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private onlineUserIdsSubject = new BehaviorSubject<Set<string>>(new Set());
  public onlineUserIds$ = this.onlineUserIdsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private ngZone: NgZone
  ) {}

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    const token = this.tokenService.getToken();
    if (!token) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('/chat', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.setupEventHandlers();

    try {
      await this.hubConnection.start();
      this.connectionStatusSubject.next(true);
    } catch {
      this.connectionStatusSubject.next(false);
    }
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
      this.ngZone.run(() => {
        this.messageReceivedSubject.next(message);
        this.refreshUnreadCount();
      });
    });

    this.hubConnection.on('OnlineList', (userIds: string[]) => {
      this.ngZone.run(() => {
        this.onlineUserIdsSubject.next(new Set(userIds));
      });
    });

    this.hubConnection.on('UserOnline', (userId: string) => {
      this.ngZone.run(() => {
        const current = new Set(this.onlineUserIdsSubject.value);
        current.add(userId);
        this.onlineUserIdsSubject.next(current);
      });
    });

    this.hubConnection.on('UserOffline', (userId: string) => {
      this.ngZone.run(() => {
        const current = new Set(this.onlineUserIdsSubject.value);
        current.delete(userId);
        this.onlineUserIdsSubject.next(current);
      });
    });

    this.hubConnection.onreconnecting(() => {
      this.ngZone.run(() => this.connectionStatusSubject.next(false));
    });

    this.hubConnection.onreconnected(() => {
      this.ngZone.run(() => this.connectionStatusSubject.next(true));
    });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next(false);
        this.onlineUserIdsSubject.next(new Set());
      });
    });
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionStatusSubject.next(false);
      this.onlineUserIdsSubject.next(new Set());
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected)
      await this.hubConnection.invoke('JoinRoom', roomId);
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected)
      await this.hubConnection.invoke('LeaveRoom', roomId);
  }

  async sendMessage(roomId: string, content: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected)
      await this.hubConnection.invoke('SendMessage', { chatRoomId: roomId, content });
  }

  async markAsRead(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected)
      await this.hubConnection.invoke('MarkRead', roomId);
  }

  getRooms(): Observable<ChatRoom[]> {
    return this.http.get<ChatRoom[]>(`${this.apiUrl}/rooms`);
  }

  getRoom(roomId: string): Observable<ChatRoom> {
    return this.http.get<ChatRoom>(`${this.apiUrl}/rooms/${roomId}`);
  }

  getMessages(roomId: string, skip = 0, take = 50): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/rooms/${roomId}/messages?skip=${skip}&take=${take}`);
  }

  getOrCreateDirectChat(memberId: string): Observable<ChatRoom> {
    return this.http.post<ChatRoom>(`${this.apiUrl}/direct/${memberId}`, {});
  }

  getActiveMembers(): Observable<Member[]> {
    return this.http.get<Member[]>('/api/members?isActive=true');
  }

  isUserOnline(userId: string | undefined): boolean {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') return false;
    return this.onlineUserIdsSubject.value.has(userId);
  }

  private refreshUnreadCount(): void {
    this.getRooms().subscribe({
      next: (rooms) => {
        const total = rooms.reduce((sum, r) => sum + r.unreadCount, 0);
        this.ngZone.run(() => this.unreadCountSubject.next(total));
      },
      error: () => {}
    });
  }

  resetUnreadCount(): void {
    this.unreadCountSubject.next(0);
  }
}
