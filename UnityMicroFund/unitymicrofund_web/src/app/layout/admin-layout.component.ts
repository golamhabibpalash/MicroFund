import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <div class="layout-container">
      <aside class="sidebar">
        <div class="logo-section">
          <img src="assets/organization/logo.png" alt="UnityMicroFund Logo" class="logo-img" />
          <span class="logo-text">UnityMicroFund</span>
        </div>
        <nav class="nav-menu">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="material-icons">dashboard</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/investments" routerLinkActive="active" class="nav-item">
            <span class="material-icons">trending_up</span>
            <span>Investments</span>
          </a>
          <a routerLink="/investors" routerLinkActive="active" class="nav-item">
            <span class="material-icons">people</span>
            <span>Investors</span>
          </a>
          <a routerLink="/payments" routerLinkActive="active" class="nav-item">
            <span class="material-icons">payments</span>
            <span>Payments</span>
          </a>
          <a routerLink="/accounts" routerLinkActive="active" class="nav-item">
            <span class="material-icons">account_balance</span>
            <span>Accounts</span>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <span class="material-icons">assessment</span>
            <span>Reports</span>
          </a>
          <a routerLink="/profile" routerLinkActive="active" class="nav-item">
            <span class="material-icons">person</span>
            <span>Profile</span>
          </a>
        </nav>
        <div class="sidebar-footer">
          <button (click)="logout()" class="logout-btn">
            <span class="material-icons">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      min-height: 100vh;
      background: #f5f6fa;
    }

    .sidebar {
      width: 260px;
      background: linear-gradient(135deg, #0C4C7D 0%, #0a3d5e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
    }

    .logo-section {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;

      .logo-img {
        width: 40px;
        height: 40px;
        object-fit: contain;
      }

      .logo-text {
        font-size: 18px;
        font-weight: 600;
        color: white;
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
      padding: 14px 24px;
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: all 0.3s ease;

      .material-icons {
        font-size: 22px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      &.active {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-left: 4px solid white;
      }
    }

    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;

      .material-icons {
        font-size: 20px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }

    .main-content {
      flex: 1;
      margin-left: 260px;
      padding: 24px;
    }
  `]
})
export class AdminLayoutComponent {
  logout() {
    localStorage.clear();
    window.location.href = '/auth/login';
  }
}