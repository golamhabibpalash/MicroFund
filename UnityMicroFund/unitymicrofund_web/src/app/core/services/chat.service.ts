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
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profileImageUrl?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiUrl = '/api/chat';
  private hubConnection: signalR.HubConnection | null = null;
  
  private messageReceivedSubject = new Subject<ChatMessage>();
  public messageReceived$ = this.messageReceivedSubject.asObservable();
  
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private ngZone: NgZone
  ) {}

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = this.tokenService.getToken();
    if (!token) {
      console.warn('No token available for chat connection');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('/chat', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.setupEventHandlers();

    try {
      await this.hubConnection.start();
      this.connectionStatusSubject.next(true);
      console.log('Chat connection started');
    } catch (error) {
      console.error('Failed to start chat connection:', error);
      this.connectionStatusSubject.next(false);
    }
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
      this.ngZone.run(() => {
        this.messageReceivedSubject.next(message);
        this.updateUnreadCount();
      });
    });

    this.hubConnection.onreconnecting(() => {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next(false);
      });
    });

    this.hubConnection.onreconnected(() => {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next(true);
      });
    });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next(false);
      });
    });
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionStatusSubject.next(false);
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('JoinRoom', roomId);
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('LeaveRoom', roomId);
    }
  }

  async sendMessage(roomId: string, content: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('SendMessage', {
        chatRoomId: roomId,
        content: content
      });
    }
  }

  async markAsRead(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('MarkRead', roomId);
    }
  }

  getRooms(): Observable<ChatRoom[]> {
    return this.http.get<ChatRoom[]>(`${this.apiUrl}/rooms`);
  }

  getRoom(roomId: string): Observable<ChatRoom> {
    return this.http.get<ChatRoom>(`${this.apiUrl}/rooms/${roomId}`);
  }

  createRoom(name: string, description: string, memberIds: string[]): Observable<ChatRoom> {
    return this.http.post<ChatRoom>(`${this.apiUrl}/rooms`, {
      name,
      description,
      memberIds
    });
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

  private updateUnreadCount(): void {
    this.getRooms().subscribe({
      next: (rooms) => {
        const totalUnread = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
        this.ngZone.run(() => {
          this.unreadCountSubject.next(totalUnread);
        });
      },
      error: () => {}
    });
  }

  resetUnreadCount(): void {
    this.unreadCountSubject.next(0);
  }
}
