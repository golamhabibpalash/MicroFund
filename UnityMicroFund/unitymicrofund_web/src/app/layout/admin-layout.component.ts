import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <div class="admin-layout">
      <aside class="sidebar">
        <div class="logo">
          <img src="assets/organization/logo.png" alt="Logo" />
          <span>UnityMicroFund</span>
        </div>
        <nav class="nav-menu">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/investments" routerLinkActive="active" class="nav-item">
            <span class="icon">💰</span>
            <span>Investments</span>
          </a>
          <a routerLink="/investors" routerLinkActive="active" class="nav-item">
            <span class="icon">👥</span>
            <span>Investors</span>
          </a>
          <a routerLink="/payments" routerLinkActive="active" class="nav-item">
            <span class="icon">💳</span>
            <span>Payments</span>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <span class="icon">📈</span>
            <span>Reports</span>
          </a>
        </nav>
        <div class="logout-section">
          <button (click)="logout()" class="logout-btn">Logout</button>
        </div>
      </aside>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .admin-layout {
        display: flex;
        min-height: 100vh;
      }

      .sidebar {
        width: 250px;
        background: #1a1a2e;
        color: white;
        display: flex;
        flex-direction: column;
        padding: 20px 0;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 20px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        img {
          width: 40px;
          height: 40px;
        }

        span {
          font-size: 16px;
          font-weight: 600;
        }
      }

      .nav-menu {
        flex: 1;
        padding: 20px 0;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        transition: all 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        &.active {
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
          border-left: 3px solid #667eea;
        }

        .icon {
          font-size: 18px;
        }
      }

      .logout-section {
        padding: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .logout-btn {
        width: 100%;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
          background: rgba(231, 76, 60, 0.8);
        }
      }

      .main-content {
        flex: 1;
        background: #f5f6fa;
        overflow-y: auto;
      }
    `,
  ],
})
export class AdminLayoutComponent {
  logout() {
    // Will implement logout functionality
  }
}
