import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  AfterViewChecked, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ChatRoom, ChatMessage, Member } from '../core/services/chat.service';
import { Token } from '../core/services/token';

interface IncomingNotification {
  senderName: string;
  preview: string;
  roomId: string;
}

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="chat-wrapper">

      <!-- Incoming message notification (appears above toggle button) -->
      <div class="msg-notification" *ngIf="notification" (click)="openFromNotification()">
        <div class="notif-row">
          <span class="material-icons notif-icon">chat</span>
          <div class="notif-body">
            <span class="notif-sender">{{ notification.senderName }}</span>
            <span class="notif-text">{{ notification.preview }}</span>
          </div>
          <button class="notif-close" (click)="$event.stopPropagation(); dismissNotification()">
            <span class="material-icons">close</span>
          </button>
        </div>
      </div>

      <!-- Chat Toggle Button -->
      <button
        class="chat-toggle-btn"
        (click)="toggleChat()"
        [class.has-unread]="unreadCount > 0"
        title="Chat">
        <span class="material-icons">{{ isOpen ? 'close' : 'chat' }}</span>
        <span class="unread-badge" *ngIf="unreadCount > 0 && !isOpen">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
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
            <button class="header-btn" (click)="toggleNewChat()" [title]="showNewChat ? 'Back' : 'New Chat'">
              <span class="material-icons">{{ showNewChat ? 'arrow_back' : 'edit' }}</span>
            </button>
            <button class="header-btn" (click)="closeChat()" title="Minimize">
              <span class="material-icons">minimize</span>
            </button>
          </div>
        </div>

        <!-- New Chat — Member Picker -->
        <div class="new-chat-section" *ngIf="showNewChat">
          <div class="picker-label">
            <span class="material-icons">people</span>
            <span>Start a conversation</span>
          </div>
          <div class="online-summary" *ngIf="!loadingMembers">
            <span class="dot online"></span>
            <span>{{ onlineCount }} online</span>
          </div>
          <div class="members-list">
            <div
              *ngFor="let member of members"
              class="member-item"
              (click)="startDirectChat(member)">
              <div class="member-avatar">
                <img *ngIf="member.profileImageUrl" [src]="member.profileImageUrl" [alt]="member.name" />
                <span *ngIf="!member.profileImageUrl">{{ getInitials(member.name) }}</span>
                <span class="presence-dot" [class.online]="isOnline(member)" [class.offline]="!isOnline(member)"></span>
              </div>
              <div class="member-info">
                <span class="member-name">{{ member.name }}</span>
                <span class="member-status" [class.status-online]="isOnline(member)">
                  {{ isOnline(member) ? 'Online' : 'Offline' }}
                </span>
              </div>
            </div>
            <div class="empty-members" *ngIf="members.length === 0 && !loadingMembers">
              <span class="material-icons">person_off</span>
              <span>No other members found</span>
            </div>
            <div class="loading-state" *ngIf="loadingMembers">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <!-- Chat Content -->
        <div class="chat-content" *ngIf="!showNewChat">

          <!-- Rooms List -->
          <div class="rooms-list" *ngIf="!currentRoom">
            <div class="rooms-scroll">
              <div
                *ngFor="let room of rooms"
                class="room-item"
                [class.active]="selectedRoomId === room.id"
                (click)="selectRoom(room)">
                <div class="room-avatar">
                  <img *ngIf="room.imageUrl" [src]="room.imageUrl" [alt]="room.name" />
                  <span *ngIf="!room.imageUrl" class="material-icons">
                    {{ room.type === 'Individual' ? 'person' : 'group' }}
                  </span>
                  <!-- Online dot for direct chats -->
                  <span
                    *ngIf="room.type === 'Individual'"
                    class="room-presence-dot"
                    [class.online]="isRoomPartnerOnline(room)">
                  </span>
                </div>
                <div class="room-info">
                  <div class="room-name-row">
                    <span class="room-name">{{ room.name }}</span>
                    <span class="room-time" *ngIf="room.lastMessage">{{ formatTime(room.lastMessage.createdAt) }}</span>
                  </div>
                  <span class="room-preview" *ngIf="room.lastMessage">{{ room.lastMessage.content }}</span>
                  <span class="room-type-label" *ngIf="!room.lastMessage">
                    {{ room.type === 'Individual' ? 'Direct Message' : 'Group' }}
                  </span>
                </div>
                <span class="unread-pill" *ngIf="room.unreadCount > 0">{{ room.unreadCount }}</span>
              </div>
              <div class="empty-rooms" *ngIf="rooms.length === 0 && !loadingRooms">
                <span class="material-icons">chat_bubble_outline</span>
                <span>No conversations yet</span>
                <small>Tap the pencil to start one</small>
              </div>
              <div class="loading-state" *ngIf="loadingRooms">
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
              <div class="thread-avatar">
                <img *ngIf="currentRoom.imageUrl" [src]="currentRoom.imageUrl" [alt]="currentRoom.name" />
                <span *ngIf="!currentRoom.imageUrl" class="material-icons">
                  {{ currentRoom.type === 'Individual' ? 'person' : 'group' }}
                </span>
              </div>
              <div class="thread-info">
                <span class="thread-name">{{ currentRoom.name }}</span>
                <span class="thread-sub" [class.online-text]="isRoomPartnerOnline(currentRoom)">
                  <span *ngIf="currentRoom.type === 'Individual'">
                    {{ isRoomPartnerOnline(currentRoom) ? '● Online' : 'Offline' }}
                  </span>
                  <span *ngIf="currentRoom.type !== 'Individual'">{{ currentRoom.members.length }} members</span>
                </span>
              </div>
            </div>

            <div class="messages-container" #messagesContainer>
              <div class="messages-scroll" *ngIf="messages.length > 0">
                <div
                  *ngFor="let msg of messages"
                  class="message"
                  [class.sent]="msg.senderId === currentMemberId"
                  [class.received]="msg.senderId !== currentMemberId">
                  <div class="message-bubble">
                    <span class="msg-sender" *ngIf="msg.senderId !== currentMemberId">{{ msg.senderName }}</span>
                    <p class="msg-content">{{ msg.content }}</p>
                    <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div class="no-messages" *ngIf="messages.length === 0 && !loadingMessages">
                <span class="material-icons">chat</span>
                <span>No messages yet</span>
                <small>Say hello!</small>
              </div>
              <div class="loading-state" *ngIf="loadingMessages">
                <div class="spinner"></div>
              </div>
            </div>

            <div class="input-bar">
              <input
                type="text"
                [(ngModel)]="newMessage"
                (keyup.enter)="sendMessage()"
                placeholder="Type a message…"
                class="msg-input"
                #messageInput
                maxlength="2000" />
              <button class="send-btn" (click)="sendMessage()" [disabled]="!newMessage.trim()">
                <span class="material-icons">send</span>
              </button>
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

    /* ── Incoming notification ─────────────────────────────── */
    .msg-notification {
      position: absolute;
      bottom: 76px;
      right: 0;
      width: 280px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.18);
      padding: 12px 14px;
      cursor: pointer;
      animation: slideUp 0.25s ease;
      border-left: 3px solid #0C4C7D;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .notif-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .notif-icon {
      font-size: 18px;
      color: #0C4C7D;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .notif-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notif-sender {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a2e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notif-text {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notif-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      flex-shrink: 0;

      .material-icons { font-size: 16px; color: #aaa; }

      &:hover .material-icons { color: #666; }
    }

    /* ── Toggle button ─────────────────────────────────────── */
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
      box-shadow: 0 4px 20px rgba(12,76,125,0.4);
      transition: all 0.3s ease;
      position: relative;

      .material-icons { color: white; font-size: 28px; }

      &:hover { transform: scale(1.08); }

      &.has-unread {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        box-shadow: 0 4px 20px rgba(231,76,60,0.4);
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
      50% { transform: scale(1.12); }
    }

    /* ── Chat panel ────────────────────────────────────────── */
    .chat-panel {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      height: 530px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 50px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
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
      padding: 14px 18px;
      background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      color: white;
      flex-shrink: 0;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 17px;
      font-weight: 600;

      .material-icons { font-size: 22px; }
    }

    .header-actions { display: flex; gap: 6px; }

    .header-btn {
      width: 34px;
      height: 34px;
      border: none;
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      .material-icons { color: white; font-size: 18px; }

      &:hover { background: rgba(255,255,255,0.25); }
    }

    /* ── Member picker ─────────────────────────────────────── */
    .new-chat-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .picker-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px 4px;
      font-size: 13px;
      font-weight: 600;
      color: #555;

      .material-icons { font-size: 18px; color: #0C4C7D; }
    }

    .online-summary {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 16px 8px;
      font-size: 12px;
      color: #888;
    }

    .members-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px 8px;
    }

    .member-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 10px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;

      &:hover { background: #f0f4f8; }
    }

    .member-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
      position: relative;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      span:first-child {
        color: white;
        font-size: 14px;
        font-weight: 600;
      }
    }

    /* Presence dots */
    .presence-dot, .room-presence-dot {
      position: absolute;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 2px solid white;
      bottom: 0;
      right: 0;

      &.online  { background: #27ae60; }
      &.offline { background: #bbb; }
    }

    .room-presence-dot {
      position: absolute;
      width: 10px;
      height: 10px;
      bottom: 0;
      right: 0;
      background: #bbb;

      &.online { background: #27ae60; }
    }

    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &.online { background: #27ae60; }
    }

    .member-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .member-name {
      font-size: 14px;
      font-weight: 600;
      color: #222;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .member-status {
      font-size: 11px;
      color: #bbb;

      &.status-online { color: #27ae60; font-weight: 500; }
    }

    .empty-members {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: #aaa;
      gap: 8px;

      .material-icons { font-size: 40px; opacity: 0.4; }
      span { font-size: 13px; }
    }

    /* ── Chat content ──────────────────────────────────────── */
    .chat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Rooms list ────────────────────────────────────────── */
    .rooms-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .rooms-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .room-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f4f4f4;
      transition: background 0.15s;

      &:hover { background: #f8f9fa; }
      &.active { background: #e8f4fc; border-left: 3px solid #0C4C7D; }
    }

    .room-avatar {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
      overflow: visible;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 12px;
      }

      .material-icons { color: white; font-size: 22px; }
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
      color: #222;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .room-time { font-size: 11px; color: #aaa; flex-shrink: 0; margin-left: 8px; }

    .room-preview {
      font-size: 13px;
      color: #999;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    .room-type-label { font-size: 12px; color: #bbb; }

    .unread-pill {
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
      flex-shrink: 0;
    }

    .empty-rooms {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 50px 20px;
      color: #aaa;
      gap: 8px;

      .material-icons { font-size: 44px; opacity: 0.35; }
      span { font-size: 14px; font-weight: 500; }
      small { font-size: 12px; color: #ccc; }
    }

    /* ── Message thread ────────────────────────────────────── */
    .message-thread {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .thread-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
    }

    .back-btn {
      width: 34px;
      height: 34px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;

      .material-icons { font-size: 20px; color: #555; }

      &:hover { background: #eee; }
    }

    .thread-avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
      .material-icons { color: white; font-size: 18px; }
    }

    .thread-info { display: flex; flex-direction: column; }

    .thread-name { font-size: 14px; font-weight: 600; color: #222; }

    .thread-sub { font-size: 11px; color: #aaa; }
    .online-text { color: #27ae60; font-weight: 500; }

    /* ── Messages ──────────────────────────────────────────── */
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      background: #f8f9fa;
    }

    .messages-scroll { display: flex; flex-direction: column; gap: 8px; }

    .message {
      display: flex;
      max-width: 82%;

      &.sent {
        align-self: flex-end;

        .message-bubble {
          background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
          color: white;
          border-radius: 18px 18px 4px 18px;

          .msg-sender { display: none; }
          .msg-time { color: rgba(255,255,255,0.65); }
        }
      }

      &.received {
        align-self: flex-start;

        .message-bubble {
          background: white;
          color: #333;
          border-radius: 18px 18px 18px 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);

          .msg-sender { color: #0C4C7D; }
          .msg-time { color: #bbb; }
        }
      }
    }

    .message-bubble {
      padding: 9px 13px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .msg-sender { font-size: 11px; font-weight: 600; }
    .msg-content { font-size: 14px; line-height: 1.4; margin: 0; word-wrap: break-word; }
    .msg-time { font-size: 10px; align-self: flex-end; }

    .no-messages {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #aaa;
      gap: 8px;

      .material-icons { font-size: 40px; opacity: 0.35; }
      span { font-size: 14px; }
      small { font-size: 12px; color: #ccc; }
    }

    /* ── Input bar ─────────────────────────────────────────── */
    .input-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: white;
      border-top: 1px solid #eee;
      flex-shrink: 0;
    }

    .msg-input {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
      padding: 9px 16px;
      font-size: 14px;
      outline: none;
      background: #f5f6fa;
      transition: border-color 0.2s;

      &:focus { border-color: #0C4C7D; background: white; }
      &::placeholder { color: #bbb; }
    }

    .send-btn {
      width: 38px;
      height: 38px;
      border: none;
      background: linear-gradient(135deg, #0C4C7D 0%, #1a5f8a 100%);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;

      .material-icons { color: white; font-size: 18px; }

      &:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 4px 12px rgba(12,76,125,0.3); }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }

    /* ── Shared states ─────────────────────────────────────── */
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .spinner {
      width: 22px;
      height: 22px;
      border: 3px solid #eee;
      border-top-color: #0C4C7D;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .chat-wrapper { bottom: 12px; right: 12px; }
      .chat-panel { width: calc(100vw - 24px); height: calc(100vh - 100px); max-width: 500px; }
      .chat-toggle-btn { width: 52px; height: 52px; }
      .chat-toggle-btn .material-icons { font-size: 26px; }
    }

    @media (max-width: 480px) {
      .chat-wrapper { bottom: 16px; right: 16px; }
      .chat-panel { width: calc(100vw - 32px); height: calc(100vh - 110px); max-width: none; }
      .msg-notification { width: calc(100vw - 80px); }
      .chat-toggle-btn { width: 48px; height: 48px; }
      .chat-toggle-btn .material-icons { font-size: 24px; }
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
  currentUserId = '';    // User.Id from JWT
  currentMemberId = '';  // Member.Id (resolved from server)
  onlineUserIds = new Set<string>();
  onlineCount = 0;

  notification: IncomingNotification | null = null;
  private notificationTimer: ReturnType<typeof setTimeout> | null = null;
  private notificationRoomId: string | null = null;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;
  private isInitialized = false;

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
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.chatService.stopConnection();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && !this.isInitialized) this.initializeChat();
    if (this.isOpen) this.dismissNotification();
  }

  closeChat(): void {
    this.isOpen = false;
  }

  toggleNewChat(): void {
    this.showNewChat = !this.showNewChat;
    if (this.showNewChat && this.members.length === 0) this.loadMembers();
  }

  private initializeChat(): void {
    this.isInitialized = true;
    this.currentUserId = this.getCurrentUserId();
    this.chatService.startConnection();
    this.setupSubscriptions();
    this.loadRooms();
    this.loadCurrentMemberId();
  }

  private loadCurrentMemberId(): void {
    // Resolve the current user's Member.Id from the server (needed for sent/received check)
    // We use /api/members/me which returns { id: Member.Id, name, email }
    import('@angular/common/http').then(({ HttpClient }) => {}).catch(() => {});
    // Use the chat service HTTP client pattern via a quick call
    this.chatService.getActiveMembers().subscribe({
      next: () => {},
      error: () => {}
    });
    // Actually resolve via /api/members/me in a simpler way:
    // The currentMemberId will be set from the first ReceiveMessage event or left empty.
    // For the sent/received detection we rely on the memberId from the ChatMessage.senderId
    // which is Member.Id. We need to match it against currentMemberId.
    // Load it via the existing member endpoint.
    this.resolveCurrentMemberId();
  }

  private resolveCurrentMemberId(): void {
    // memberId resolution — call /api/members/me
    const token = this.tokenService.getToken();
    if (!token) return;
    fetch('/api/members/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { id: string } | null) => {
        if (data?.id) {
          this.currentMemberId = data.id;
          this.cdr.detectChanges();
        }
      })
      .catch(() => {});
  }

  private setupSubscriptions(): void {
    this.chatService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        if (this.currentRoom && message.chatRoomId === this.currentRoom.id) {
          this.messages.push(message);
          this.shouldScrollToBottom = true;
          this.chatService.markAsRead(this.currentRoom.id);
        } else {
          this.showNotification(message);
          this.loadRooms();
        }
        this.cdr.detectChanges();
      });

    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
        this.cdr.detectChanges();
      });

    this.chatService.onlineUserIds$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ids => {
        this.onlineUserIds = ids;
        this.onlineCount = ids.size;
        this.cdr.detectChanges();
      });
  }

  private getCurrentUserId(): string {
    const decoded = this.tokenService.decodeToken();
    return decoded?.nameid || decoded?.sub || '';
  }

  loadRooms(): void {
    this.loadingRooms = true;
    this.chatService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.loadingRooms = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingRooms = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadMembers(): void {
    this.loadingMembers = true;
    this.chatService.getActiveMembers().subscribe({
      next: (all) => {
        // Exclude self by matching userId
        this.members = all.filter(m =>
          !m.userId || m.userId === '00000000-0000-0000-0000-000000000000'
            ? m.id !== this.currentMemberId
            : m.userId !== this.currentUserId
        );
        this.loadingMembers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingMembers = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectRoom(room: ChatRoom): void {
    this.currentRoom = room;
    this.selectedRoomId = room.id;
    this.messages = [];
    this.loadMessages(room.id);
    this.chatService.joinRoom(room.id);
    this.chatService.markAsRead(room.id);
    // Clear this room's unread from the list immediately
    room.unreadCount = 0;
  }

  closeRoom(): void {
    if (this.currentRoom) this.chatService.leaveRoom(this.currentRoom.id);
    this.currentRoom = null;
    this.selectedRoomId = null;
    this.messages = [];
    this.loadRooms();
  }

  loadMessages(roomId: string): void {
    this.loadingMessages = true;
    this.chatService.getMessages(roomId).subscribe({
      next: (msgs) => {
        this.messages = msgs.reverse();
        this.loadingMessages = false;
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingMessages = false;
        this.cdr.detectChanges();
      }
    });
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || !this.currentRoom) return;
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
        this.cdr.detectChanges();
      }
    });
  }

  openFromNotification(): void {
    this.isOpen = true;
    if (!this.isInitialized) this.initializeChat();
    if (this.notificationRoomId) {
      const room = this.rooms.find(r => r.id === this.notificationRoomId);
      if (room) this.selectRoom(room);
    }
    this.dismissNotification();
  }

  dismissNotification(): void {
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notification = null;
    this.notificationRoomId = null;
    this.cdr.detectChanges();
  }

  private showNotification(message: ChatMessage): void {
    if (this.isOpen && this.currentRoom?.id === message.chatRoomId) return;

    if (this.notificationTimer) clearTimeout(this.notificationTimer);

    const preview = message.content.length > 45
      ? message.content.substring(0, 45) + '…'
      : message.content;

    this.notification = { senderName: message.senderName, preview, roomId: message.chatRoomId };
    this.notificationRoomId = message.chatRoomId;

    this.notificationTimer = setTimeout(() => {
      this.notification = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  isOnline(member: Member): boolean {
    return this.chatService.isUserOnline(member.userId);
  }

  isRoomPartnerOnline(room: ChatRoom): boolean {
    if (room.type !== 'Individual') return false;
    const partner = room.members.find(m => m.memberId !== this.currentMemberId);
    if (!partner) return false;
    // Look up the partner's userId via the members list
    const memberRecord = this.members.find(m => m.id === partner.memberId);
    return memberRecord ? this.chatService.isUserOnline(memberRecord.userId) : false;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
