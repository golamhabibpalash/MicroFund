import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ChatRoom, ChatMessage, Member } from '../core/services/chat.service';
import { Token } from '../core/services/token';

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-wrapper">
      <!-- Chat Toggle Button -->
      <button 
        class="chat-toggle-btn" 
        (click)="toggleChat()"
        [class.has-unread]="unreadCount > 0"
        [class.has-message]="currentRoom">
        <span class="material-icons">{{ isOpen ? 'close' : 'chat' }}</span>
        <span class="unread-badge" *ngIf="unreadCount > 0 && !isOpen">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>

      <!-- Chat Panel -->
      <div class="chat-panel" [class.open]="isOpen">
        <!-- Panel Header -->
        <div class="panel-header">
          <div class="header-title">
            <span class="material-icons">forum</span>
            <span>Messages</span>
          </div>
          <div class="header-actions">
            <button class="header-btn" (click)="showNewChat = !showNewChat" title="New Chat">
              <span class="material-icons">{{ showNewChat ? 'close' : 'add' }}</span>
            </button>
            <button class="header-btn" (click)="closeChat()" title="Minimize">
              <span class="material-icons">minimize</span>
            </button>
          </div>
        </div>

        <!-- New Chat Selector -->
        <div class="new-chat-section" *ngIf="showNewChat">
          <div class="section-header">
            <span>Start New Chat</span>
            <button class="close-section" (click)="showNewChat = false">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="members-list">
            <div 
              *ngFor="let member of members" 
              class="member-item"
              (click)="startDirectChat(member)">
              <div class="member-avatar">
                <img *ngIf="member.profileImageUrl" [src]="member.profileImageUrl" [alt]="member.name" />
                <span *ngIf="!member.profileImageUrl">{{ getInitials(member.name) }}</span>
              </div>
              <div class="member-info">
                <span class="member-name">{{ member.name }}</span>
                <span class="member-status" *ngIf="member.email">{{ member.email }}</span>
              </div>
              <span class="online-indicator"></span>
            </div>
            <div class="empty-members" *ngIf="members.length === 0 && !loadingMembers">
              <span class="material-icons">person_off</span>
              <span>No active members found</span>
            </div>
            <div class="loading-members" *ngIf="loadingMembers">
              <div class="spinner"></div>
              <span>Loading members...</span>
            </div>
          </div>
        </div>

        <!-- Chat Content -->
        <div class="chat-content" *ngIf="!showNewChat">
          <!-- Rooms List -->
          <div class="rooms-list" *ngIf="!currentRoom">
            <div class="rooms-header">
              <span>Conversations</span>
            </div>
            <div class="rooms-scroll">
              <div 
                *ngFor="let room of rooms" 
                class="room-item"
                [class.active]="selectedRoomId === room.id"
                (click)="selectRoom(room)">
                <div class="room-avatar">
                  <img *ngIf="room.imageUrl" [src]="room.imageUrl" [alt]="room.name" />
                  <span *ngIf="!room.imageUrl" class="room-icon material-icons">group</span>
                </div>
                <div class="room-info">
                  <div class="room-name-row">
                    <span class="room-name">{{ room.name }}</span>
                    <span class="room-time" *ngIf="room.lastMessage">{{ formatTime(room.lastMessage.createdAt) }}</span>
                  </div>
                  <span class="room-preview" *ngIf="room.lastMessage">{{ room.lastMessage.content }}</span>
                  <span class="room-type" *ngIf="!room.lastMessage">{{ room.type === 'Individual' ? 'Direct Message' : 'Group' }}</span>
                </div>
                <span class="unread-indicator" *ngIf="room.unreadCount > 0">{{ room.unreadCount }}</span>
              </div>
              <div class="empty-rooms" *ngIf="rooms.length === 0 && !loadingRooms">
                <span class="material-icons">chat_bubble_outline</span>
                <span>No conversations yet</span>
                <small>Start a new chat to begin</small>
              </div>
              <div class="loading-rooms" *ngIf="loadingRooms">
                <div class="spinner"></div>
              </div>
            </div>
          </div>

          <!-- Message Thread -->
          <div class="message-thread" *ngIf="currentRoom">
            <div class="thread-header">
              <button class="back-btn" (click)="closeRoom()">
                <span class="material-icons">arrow_back</span>
              </button>
              <div class="thread-title">
                <div class="thread-avatar">
                  <img *ngIf="currentRoom.imageUrl" [src]="currentRoom.imageUrl" [alt]="currentRoom.name" />
                  <span *ngIf="!currentRoom.imageUrl" class="material-icons">group</span>
                </div>
                <div class="thread-info">
                  <span class="thread-name">{{ currentRoom.name }}</span>
                  <span class="thread-status">{{ currentRoom.type === 'Individual' ? 'Direct Message' : currentRoom.members.length + ' members' }}</span>
                </div>
              </div>
            </div>

            <div class="messages-container" #messagesContainer>
              <div class="messages-scroll" *ngIf="messages.length > 0">
                <div 
                  *ngFor="let message of messages" 
                  class="message"
                  [class.sent]="message.senderId === currentUserId"
                  [class.received]="message.senderId !== currentUserId">
                  <div class="message-bubble">
                    <span class="message-sender" *ngIf="message.senderId !== currentUserId">{{ message.senderName }}</span>
                    <p class="message-content">{{ message.content }}</p>
                    <span class="message-time">{{ formatTime(message.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div class="no-messages" *ngIf="messages.length === 0 && !loadingMessages">
                <span class="material-icons">chat</span>
                <span>No messages yet</span>
                <small>Say hello!</small>
              </div>
              <div class="loading-messages" *ngIf="loadingMessages">
                <div class="spinner"></div>
              </div>
            </div>

            <div class="message-input-container">
              <div class="message-input-wrapper">
                <input 
                  type="text" 
                  [(ngModel)]="newMessage" 
                  (keyup.enter)="sendMessage()"
                  placeholder="Type a message..."
                  class="message-input"
                  #messageInput />
                <button 
                  class="send-btn" 
                  (click)="sendMessage()"
                  [disabled]="!newMessage.trim()">
                  <span class="material-icons">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-wrapper {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    .chat-toggle-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(12, 76, 125, 0.4);
      transition: all 0.3s ease;
      position: relative;

      .material-icons {
        color: white;
        font-size: 28px;
        transition: transform 0.3s ease;
      }

      &:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px rgba(12, 76, 125, 0.5);

        .material-icons {
          transform: scale(1.1);
        }
      }

      &.has-message {
        background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      }

      &.has-unread {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
      }
    }

    .unread-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #e74c3c;
      color: white;
      font-size: 11px;
      font-weight: 700;
      min-width: 22px;
      height: 22px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      border: 2px solid white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .chat-panel {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 380px;
      height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 50px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s ease;
      overflow: hidden;

      &.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      color: white;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 600;

      .material-icons {
        font-size: 24px;
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .header-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      .material-icons {
        color: white;
        font-size: 20px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }

    .new-chat-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #eee;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .close-section {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;

      .material-icons {
        font-size: 18px;
        color: #666;
      }

      &:hover {
        background: #eee;
      }
    }

    .members-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .member-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #f0f4f8;
      }
    }

    .member-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      span {
        color: white;
        font-size: 14px;
        font-weight: 600;
      }
    }

    .member-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .member-name {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .member-status {
      font-size: 12px;
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .online-indicator {
      width: 10px;
      height: 10px;
      background: #27ae60;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 0 2px #27ae60;
    }

    .chat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .rooms-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .rooms-header {
      padding: 14px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
    }

    .rooms-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .room-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-bottom: 1px solid #f5f5f5;

      &:hover {
        background: #f8f9fa;
      }

      &.active {
        background: #e8f4fc;
        border-left: 3px solid #0C4C7D;
      }
    }

    .room-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .room-icon {
        color: white;
        font-size: 24px;
      }
    }

    .room-info {
      flex: 1;
      min-width: 0;
    }

    .room-name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .room-name {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .room-time {
      font-size: 11px;
      color: #999;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .room-preview {
      font-size: 13px;
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    .room-type {
      font-size: 12px;
      color: #aaa;
    }

    .unread-indicator {
      background: #0C4C7D;
      color: white;
      font-size: 11px;
      font-weight: 700;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }

    .empty-rooms, .empty-members {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #999;

      .material-icons {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      span {
        font-size: 14px;
        font-weight: 500;
      }

      small {
        font-size: 12px;
        margin-top: 4px;
        color: #bbb;
      }
    }

    .loading-rooms, .loading-members, .loading-messages {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      color: #888;

      span {
        margin-top: 10px;
        font-size: 13px;
      }
    }

    .message-thread {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .thread-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
    }

    .back-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;

      .material-icons {
        font-size: 22px;
        color: #333;
      }

      &:hover {
        background: #eee;
      }
    }

    .thread-title {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .thread-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .material-icons {
        color: white;
        font-size: 20px;
      }
    }

    .thread-info {
      display: flex;
      flex-direction: column;
    }

    .thread-name {
      font-size: 15px;
      font-weight: 600;
      color: #333;
    }

    .thread-status {
      font-size: 12px;
      color: #888;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8f9fa;
    }

    .messages-scroll {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .message {
      display: flex;
      max-width: 85%;

      &.sent {
        align-self: flex-end;

        .message-bubble {
          background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
          color: white;
          border-radius: 18px 18px 4px 18px;

          .message-sender {
            display: none;
          }

          .message-time {
            color: rgba(255, 255, 255, 0.7);
          }
        }
      }

      &.received {
        align-self: flex-start;

        .message-bubble {
          background: white;
          color: #333;
          border-radius: 18px 18px 18px 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          .message-sender {
            color: #0C4C7D;
          }

          .message-time {
            color: #999;
          }
        }
      }
    }

    .message-bubble {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .message-sender {
      font-size: 11px;
      font-weight: 600;
    }

    .message-content {
      font-size: 14px;
      line-height: 1.4;
      margin: 0;
      word-wrap: break-word;
    }

    .message-time {
      font-size: 10px;
      align-self: flex-end;
    }

    .no-messages {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;

      .material-icons {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      span {
        font-size: 14px;
        font-weight: 500;
      }

      small {
        font-size: 12px;
        margin-top: 4px;
        color: #bbb;
      }
    }

    .message-input-container {
      padding: 12px 16px;
      background: white;
      border-top: 1px solid #eee;
    }

    .message-input-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f5f6fa;
      border-radius: 24px;
      padding: 4px;
    }

    .message-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;

      &::placeholder {
        color: #aaa;
      }
    }

    .send-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      .material-icons {
        color: white;
        font-size: 20px;
      }

      &:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(12, 76, 125, 0.3);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #0C4C7D;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .chat-wrapper {
        bottom: 16px;
        right: 16px;
      }

      .chat-panel {
        width: calc(100vw - 32px);
        height: calc(100vh - 120px);
        max-height: 520px;
      }

      .chat-toggle-btn {
        width: 54px;
        height: 54px;

        .material-icons {
          font-size: 24px;
        }
      }
    }
  `]
})
export class ChatInterfaceComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  isOpen = false;
  showNewChat = false;
  loadingRooms = false;
  loadingMessages = false;
  loadingMembers = false;
  
  rooms: ChatRoom[] = [];
  currentRoom: ChatRoom | null = null;
  selectedRoomId: string | null = null;
  messages: ChatMessage[] = [];
  members: Member[] = [];
  
  newMessage = '';
  unreadCount = 0;
  currentUserId = '';
  isInitialized = false;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private tokenService: Token,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.getCurrentUserId();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.stopConnection();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    
    if (this.isOpen && !this.isInitialized) {
      this.initializeChat();
    }
  }

  private initializeChat(): void {
    this.isInitialized = true;
    this.currentUserId = this.getCurrentUserId();
    this.setupSubscriptions();
    this.chatService.startConnection();
    this.loadRooms();
    this.loadUnreadCount();
  }

  private setupSubscriptions(): void {
    this.chatService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        if (this.currentRoom && message.chatRoomId === this.currentRoom.id) {
          this.messages.unshift(message);
          this.shouldScrollToBottom = true;
          this.chatService.markAsRead(this.currentRoom.id);
        } else {
          this.loadRooms();
        }
      });

    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  private getCurrentUserId(): string {
    const decoded = this.tokenService.decodeToken();
    return decoded?.member_id || decoded?.sub || '';
  }

  closeChat(): void {
    this.isOpen = false;
  }

  loadRooms(): void {
    this.loadingRooms = true;
    this.chatService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.loadingRooms = false;
      },
      error: () => {
        this.loadingRooms = false;
      }
    });
  }

  loadMembers(): void {
    this.loadingMembers = true;
    this.chatService.getActiveMembers().subscribe({
      next: (members) => {
        this.members = members.filter(m => m.id !== this.currentUserId);
        this.loadingMembers = false;
      },
      error: () => {
        this.loadingMembers = false;
      }
    });
  }

  loadUnreadCount(): void {
    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  selectRoom(room: ChatRoom): void {
    this.currentRoom = room;
    this.selectedRoomId = room.id;
    this.messages = [];
    this.loadMessages(room.id);
    this.chatService.joinRoom(room.id);
    this.chatService.markAsRead(room.id);
  }

  closeRoom(): void {
    if (this.currentRoom) {
      this.chatService.leaveRoom(this.currentRoom.id);
    }
    this.currentRoom = null;
    this.selectedRoomId = null;
    this.messages = [];
    this.loadRooms();
  }

  loadMessages(roomId: string): void {
    this.loadingMessages = true;
    this.chatService.getMessages(roomId).subscribe({
      next: (messages) => {
        this.messages = messages.reverse();
        this.loadingMessages = false;
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentRoom) return;

    const content = this.newMessage.trim();
    this.newMessage = '';

    this.chatService.sendMessage(this.currentRoom.id, content).then(() => {
      this.shouldScrollToBottom = true;
    });
  }

  startDirectChat(member: Member): void {
    this.loadingMessages = true;
    this.chatService.getOrCreateDirectChat(member.id).subscribe({
      next: (room) => {
        this.showNewChat = false;
        this.selectRoom(room);
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {}
  }
}
