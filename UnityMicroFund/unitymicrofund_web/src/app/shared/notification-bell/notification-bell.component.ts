import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, Notification } from '../../core/services/notification';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notification-container">
      <button class="bell-button" (click)="toggleDropdown()">
        <span class="material-icons">notifications</span>
        <span class="badge" *ngIf="unreadCount > 0">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </button>
      
      <div class="dropdown" *ngIf="isOpen">
        <div class="dropdown-header">
          <span>Notifications</span>
          <button class="mark-all-read" (click)="markAllRead(); $event.stopPropagation()" *ngIf="unreadCount > 0">
            Mark all read
          </button>
        </div>
        
        <div class="dropdown-content">
          <div class="notification-list" *ngIf="notifications.length > 0">
            <div 
              *ngFor="let notification of notifications" 
              class="notification-item"
              [class.unread]="!notification.isRead"
              (click)="markAsRead(notification)">
              <div class="notification-icon">
                <span class="material-icons">{{ getIcon(notification.type) }}</span>
              </div>
              <div class="notification-details">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.message }}</div>
                <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
              </div>
            </div>
          </div>
          
          <div class="no-notifications" *ngIf="notifications.length === 0">
            <span class="material-icons">notifications_none</span>
            <p>No notifications yet</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: relative;
    }
    
    .bell-button {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s;
      
      .material-icons {
        font-size: 24px;
        color: #333;
      }
      
      &:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    }
    
    .badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #e53935;
      color: white;
      font-size: 10px;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      padding: 0 4px;
    }
    
    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 320px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      
      span {
        font-weight: 600;
        color: #333;
      }
      
      .mark-all-read {
        background: none;
        border: none;
        color: #0C4C7D;
        cursor: pointer;
        font-size: 12px;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
    
    .dropdown-content {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .notification-list {
      display: flex;
      flex-direction: column;
    }
    
    .notification-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      border-bottom: 1px solid #f5f5f5;
      
      &:hover {
        background: #f9f9f9;
      }
      
      &.unread {
        background: #e3f2fd;
        
        &:hover {
          background: #bbdefb;
        }
      }
      
      .notification-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #e3f2fd;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        .material-icons {
          font-size: 18px;
          color: #0C4C7D;
        }
      }
      
      .notification-details {
        flex: 1;
        min-width: 0;
        
        .notification-title {
          font-weight: 600;
          font-size: 14px;
          color: #333;
          margin-bottom: 2px;
        }
        
        .notification-message {
          font-size: 13px;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .notification-time {
          font-size: 11px;
          color: #999;
          margin-top: 4px;
        }
      }
    }
    
    .no-notifications {
      padding: 32px;
      text-align: center;
      color: #999;
      
      .material-icons {
        font-size: 48px;
        margin-bottom: 8px;
      }
      
      p {
        margin: 0;
      }
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  isOpen = false;
  private refreshInterval: any;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationService.loadUnreadCount();
    this.unreadCount = this.notificationService.getUnreadCountSubject().value;
    
    this.notificationService.getUnreadCountSubject().subscribe(count => {
      this.unreadCount = count;
    });
    
    this.refreshInterval = setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadNotifications(): void {
    const token = this.notificationService.getToken();
    console.log('NotificationBell - Token exists:', !!token);
    
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    
    this.notificationService.getNotifications(10).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
      },
      error: (err) => {
        console.error('Notifications load error:', err);
        if (err.status === 401) {
          window.location.href = '/auth/login';
        }
      }
    });
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  markAsRead(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.isRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.notificationService.loadUnreadCount();
        }
      });
    }
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.unreadCount = 0;
        this.notificationService.loadUnreadCount();
      }
    });
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      'RegistrationApproval': 'person_add',
      'PaymentApproved': 'payments',
      'InvestmentUpdate': 'trending_up',
      'SystemAlert': 'warning'
    };
    return icons[type] || 'notifications';
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
}