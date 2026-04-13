import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { UserService } from '../core/services/user';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <div class="layout-container">
      <aside class="sidebar">
        <div class="logo-section">
          <div class="logo-wrapper">
            <div class="logo-glow"></div>
            <div class="logo-inner">
              <div class="logo-icon-container">
                <img src="assets/organization/logo.png" alt="UnityMicroFund Logo" class="logo-img" />
                <div class="logo-shine"></div>
              </div>
              <div class="logo-content">
                <span class="logo-text">UnityMicroFund</span>
                <span class="logo-tagline">Investment Platform</span>
              </div>
            </div>
            <div class="logo-particles">
              <span class="particle"></span>
              <span class="particle"></span>
              <span class="particle"></span>
              <span class="particle"></span>
              <span class="particle"></span>
            </div>
          </div>
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
          <div class="nav-divider" *ngIf="isAdmin"></div>
          <a routerLink="/users" routerLinkActive="active" class="nav-item" *ngIf="isAdmin">
            <span class="material-icons">admin_panel_settings</span>
            <span>User Management</span>
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="user-role-badge" *ngIf="userRole">
            <span class="role-icon material-icons">{{ getRoleIcon() }}</span>
            <span class="role-name">{{ userRole }}</span>
          </div>
          <button (click)="logout()" class="logout-btn">
            <span class="material-icons">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet (activate)="onRouteActivate()"></router-outlet>
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
      padding: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .logo-wrapper {
      position: relative;
      padding: 24px 20px;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
      border-radius: 0;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .logo-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at center, rgba(255, 215, 0, 0.08) 0%, transparent 50%);
      animation: glowPulse 4s ease-in-out infinite;
    }

    @keyframes glowPulse {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }

    .logo-inner {
      position: relative;
      display: flex;
      align-items: center;
      gap: 14px;
      z-index: 1;
    }

    .logo-icon-container {
      position: relative;
      width: 58px;
      height: 58px;
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: scale(1.08) rotate(2deg);
        box-shadow: 0 6px 25px rgba(255, 215, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .logo-img {
        width: 40px;
        height: 40px;
        object-fit: contain;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }

      .logo-shine {
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: shine 3s ease-in-out infinite;
        border-radius: 14px;
      }
    }

    @keyframes shine {
      0%, 100% { left: -100%; }
      50% { left: 100%; }
    }

    .logo-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: white;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    .logo-tagline {
      font-size: 10px;
      font-weight: 500;
      color: rgba(255, 215, 0, 0.9);
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    }

    .logo-particles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;

      .particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 215, 0, 0.6);
        border-radius: 50%;
        animation: float 6s ease-in-out infinite;

        &:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; }
        &:nth-child(2) { left: 80%; top: 30%; animation-delay: 1s; animation-duration: 5s; }
        &:nth-child(3) { left: 30%; top: 70%; animation-delay: 2s; animation-duration: 7s; }
        &:nth-child(4) { left: 70%; top: 80%; animation-delay: 3s; animation-duration: 5.5s; }
        &:nth-child(5) { left: 50%; top: 10%; animation-delay: 4s; animation-duration: 6s; }
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
      50% { transform: translateY(-10px) scale(1.5); opacity: 1; }
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

    .nav-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 12px 16px;
    }

    .user-role-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.9);
    }

    .user-role-badge .role-icon {
      font-size: 16px;
      color: rgba(255, 215, 0, 0.9);
    }

    .user-role-badge .role-name {
      font-weight: 500;
      color: rgba(255, 215, 0, 0.9);
    }

    .main-content {
      flex: 1;
      margin-left: 260px;
      padding: 24px;
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  constructor(
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private router: Router
  ) {}

  userRole: string | null = null;
  isAdmin = false;

  ngOnInit() {
    this.checkUserRole();
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkUserRole();
      this.cdr.detectChanges();
    });
  }

  checkUserRole() {
    this.userRole = this.userService.getRole();
    this.isAdmin = this.userService.isAdmin();
    console.log('[AdminLayout] Current role:', this.userRole, 'IsAdmin:', this.isAdmin);
  }

  getRoleIcon(): string {
    const icons: { [key: string]: string } = {
      Admin: 'shield',
      Manager: 'manage_accounts',
      Member: 'person',
      Viewer: 'visibility',
    };
    return icons[this.userRole || ''] || 'person';
  }

  onRouteActivate() {
    this.cdr.detectChanges();
  }

  logout() {
    localStorage.clear();
    window.location.href = '/auth/login';
  }
}