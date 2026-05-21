import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { UserService } from '../core/services/user';
import { Token } from '../core/services/token';
import { ChatInterfaceComponent } from '../chat/chat-interface.component';
import { NotificationBellComponent } from '../shared/notification-bell/notification-bell.component';
import {
  SideNavComponent,
  NavModule,
  NavPolicy,
  DEFAULT_NAV_POLICY,
} from '../shared/components/side-nav/side-nav.component';

// ─── Navigation structure ────────────────────────────────────────────────────

const NAV_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard',
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'account_balance_wallet',
    children: [
      { label: 'Investments',  route: '/investments', icon: 'trending_up' },
      { label: 'Transactions', route: '/payments',    icon: 'payments' },
      { label: 'Accounts',     route: '/accounts',    icon: 'account_balance', roles: ['Admin'] },
    ],
  },
  {
    id: 'members',
    label: 'Members',
    icon: 'groups',
    children: [
      { label: 'Investors', route: '/investors', icon: 'people' },
      { label: 'Reports',   route: '/reports',   icon: 'assessment' },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: 'admin_panel_settings',
    roles: ['Admin'],
    dividerBefore: true,
    children: [
      { label: 'User Management', route: '/users',           icon: 'manage_accounts' },
      { label: 'Business Config', route: '/settings',        icon: 'settings' },
      { label: 'Activity Logs',   route: '/logs/activity',   icon: 'monitor_heart' },
      { label: 'Audit Logs',      route: '/logs/audit',      icon: 'history' },
    ],
  },
  {
    id: 'account',
    label: 'My Account',
    icon: 'person',
    dividerBefore: true,
    children: [
      { label: 'Profile', route: '/profile', icon: 'person' },
    ],
  },
];

const NAV_POLICY: NavPolicy = {
  ...DEFAULT_NAV_POLICY,
  singleExpand: true,
  expandOnChildActive: true,
  persistState: true,
  defaultExpanded: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    ChatInterfaceComponent,
    NotificationBellComponent,
    SideNavComponent,
  ],
  template: `
    <div class="layout-container">

      <!-- Mobile overlay -->
      <div
        class="sidebar-overlay"
        [class.show]="sidebarOpen"
        (click)="closeSidebar()"
        aria-hidden="true">
      </div>

      <!-- Mobile header -->
      <header class="mobile-header" role="banner">
        <button class="hamburger" (click)="toggleSidebar()" aria-label="Toggle navigation" [attr.aria-expanded]="sidebarOpen">
          <span class="material-icons">{{ sidebarOpen ? 'close' : 'menu' }}</span>
        </button>
        <span class="mobile-title">UnityMicroFund</span>
      </header>

      <!-- Sidebar -->
      <aside class="sidebar" [class.open]="sidebarOpen" [class.collapsed]="sidebarCollapsed" role="complementary" aria-label="Sidebar">

        <!-- Logo / Toggle -->
        <div class="logo-section">
          <button class="logo-toggle" (click)="toggleSidebarCollapse()" [attr.aria-label]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
            <span class="material-icons">{{ sidebarCollapsed ? 'menu' : 'chevron_left' }}</span>
          </button>
          <div class="logo-wrapper" [class.hidden]="sidebarCollapsed">
            <div class="logo-glow"></div>
            <div class="logo-inner">
              <div class="logo-icon-container">
                <img src="assets/organization/logo.png" alt="UnityMicroFund" class="logo-img" />
                <div class="logo-shine"></div>
              </div>
              <div class="logo-content">
                <span class="logo-text">UnityMicroFund</span>
                <span class="logo-tagline">Investment Platform</span>
              </div>
            </div>
            <div class="logo-particles" aria-hidden="true">
              <span class="particle"></span>
              <span class="particle"></span>
              <span class="particle"></span>
              <span class="particle"></span>
              <span class="particle"></span>
            </div>
          </div>
        </div>

        <!-- Collapsed user badge -->
        <div class="collapsed-user-badge" *ngIf="sidebarCollapsed" [title]="userName || ''">
          <span class="material-icons">person</span>
          <span class="user-initial">{{ userName ? userName.charAt(0).toUpperCase() : '?' }}</span>
        </div>

        <!-- Navigation -->
        <app-side-nav
          [modules]="navModules"
          [userRole]="userRole || ''"
          [policy]="navPolicy"
          [collapsed]="sidebarCollapsed"
          (navigated)="closeSidebarOnMobile()">
        </app-side-nav>

        <!-- Footer -->
        <div class="sidebar-footer">
          <div class="user-role-badge" *ngIf="userRole && !sidebarCollapsed">
            <span class="role-icon material-icons" aria-hidden="true">{{ getRoleIcon() }}</span>
            <span class="role-name">{{ userRole }}</span>
          </div>
          <button (click)="logout()" class="logout-btn" aria-label="Log out">
            <span class="material-icons" aria-hidden="true">logout</span>
            <span *ngIf="!sidebarCollapsed">Logout</span>
          </button>
        </div>

      </aside>

      <!-- Main content -->
      <main class="main-content" role="main">
        <div class="top-bar">
          <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <span class="user-role-badge-small" [attr.aria-label]="'Role: ' + userRole">{{ userRole }}</span>
          </div>
          <app-notification-bell></app-notification-bell>
        </div>
        <router-outlet (activate)="onRouteActivate()"></router-outlet>
      </main>

      <app-chat-interface></app-chat-interface>
    </div>
  `,
  styles: [`
    /* ── Layout shell ───────────────────────────────────── */
    .layout-container {
      display: flex;
      min-height: 100vh;
      background: #f5f6fa;
    }

    /* ── Sidebar ────────────────────────────────────────── */
    .sidebar {
      width: 260px;
      background: linear-gradient(160deg, #0C4C7D 0%, #0a3d5e 60%, #082d46 100%);
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 100;
      overflow: hidden;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar.collapsed {
      width: 68px;
    }

    /* ── Logo section ───────────────────────────────────── */
    .logo-section {
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      padding: 8px;
    }

    .logo-toggle {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      transition: background 0.18s, color 0.18s;
    }

    .logo-toggle:hover {
      background: rgba(255,255,255,0.15);
      color: #fff;
    }

    .logo-toggle .material-icons {
      font-size: 22px;
      transition: transform 0.25s;
    }

    .sidebar.collapsed .logo-toggle .material-icons {
      transform: rotate(180deg);
    }

    .logo-wrapper {
      position: relative;
      padding: 14px 12px;
      background: linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%);
      overflow: hidden;
      border-radius: 10px;
      margin-left: 4px;
      flex: 1;
      transition: opacity 0.2s, max-width 0.25s;
    }

    .logo-wrapper.hidden {
      opacity: 0;
      max-width: 0;
      padding: 0;
      margin: 0;
      pointer-events: none;
    }

    .logo-glow {
      position: absolute;
      top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: radial-gradient(circle at center, rgba(255,215,0,0.08) 0%, transparent 50%);
      animation: glowPulse 4s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes glowPulse {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50%       { opacity: 1;   transform: scale(1.05); }
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
      width: 52px; height: 52px;
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(255,215,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      flex-shrink: 0;

      &:hover {
        transform: scale(1.07) rotate(2deg);
        box-shadow: 0 6px 22px rgba(255,215,0,0.45);
      }
    }

    .logo-img {
      width: 36px; height: 36px;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }

    .logo-shine {
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shine 3s ease-in-out infinite;
      border-radius: 12px;
      pointer-events: none;
    }

    @keyframes shine {
      0%, 100% { left: -100%; }
      50%       { left: 100%; }
    }

    .logo-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .logo-text {
      font-size: 17px;
      font-weight: 700;
      color: white;
      letter-spacing: 0.4px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.25);
      white-space: nowrap;
    }

    .logo-tagline {
      font-size: 9.5px;
      font-weight: 500;
      color: rgba(255,215,0,0.9);
      text-transform: uppercase;
      letter-spacing: 1.8px;
    }

    .logo-particles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;

      .particle {
        position: absolute;
        width: 4px; height: 4px;
        background: rgba(255,215,0,0.5);
        border-radius: 50%;
        animation: float 6s ease-in-out infinite;

        &:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; }
        &:nth-child(2) { left: 80%; top: 30%; animation-delay: 1s;  animation-duration: 5s; }
        &:nth-child(3) { left: 30%; top: 70%; animation-delay: 2s;  animation-duration: 7s; }
        &:nth-child(4) { left: 70%; top: 80%; animation-delay: 3s;  animation-duration: 5.5s; }
        &:nth-child(5) { left: 50%; top: 10%; animation-delay: 4s;  animation-duration: 6s; }
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) scale(1);   opacity: 0.5; }
      50%       { transform: translateY(-8px) scale(1.4); opacity: 1; }
    }

    /* ── Collapsed user badge ───────────────────────────── */
    .collapsed-user-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 12px 0;
      flex-shrink: 0;
    }

    .collapsed-user-badge .material-icons {
      font-size: 24px;
      color: rgba(255,255,255,0.5);
    }

    .collapsed-user-badge .user-initial {
      position: absolute;
      bottom: 8px;
      right: 18px;
      width: 18px;
      height: 18px;
      background: #FFD700;
      color: #0C4C7D;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Sidebar footer ─────────────────────────────────── */
    .sidebar-footer {
      flex-shrink: 0;
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .sidebar.collapsed .sidebar-footer {
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .user-role-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255,255,255,0.08);
      border-radius: 8px;
      margin-bottom: 10px;
      font-size: 12px;
    }

    .role-icon { font-size: 16px; color: rgba(255,215,0,0.9); }
    .role-name { font-weight: 500; color: rgba(255,215,0,0.9); }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 11px 14px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.85);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      transition: background 0.18s ease, color 0.18s ease;

      .material-icons { font-size: 18px; }

      &:hover {
        background: rgba(231,76,60,0.25);
        color: #fff;
        border-color: rgba(231,76,60,0.4);
      }

      &:focus-visible {
        outline: 2px solid rgba(255,215,0,0.6);
        outline-offset: 2px;
      }
    }

    /* ── Main content ───────────────────────────────────── */
    .main-content {
      flex: 1;
      margin-left: 260px;
      min-width: 0;
      transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar.collapsed ~ .main-content {
      margin-left: 68px;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px;
      background: white;
      border-bottom: 1px solid #eee;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-name {
      font-weight: 600;
      color: #1a1a2e;
      font-size: 14px;
    }

    .user-role-badge-small {
      padding: 2px 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }

    /* ── Mobile header ──────────────────────────────────── */
    .mobile-header {
      display: none;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #0C4C7D 0%, #0a3d5e 100%);
      color: white;
      padding: 10px 16px;
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 200;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .hamburger {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: background 0.15s;

      &:hover { background: rgba(255,255,255,0.15); }
      &:focus-visible { outline: 2px solid rgba(255,215,0,0.6); }
      .material-icons { font-size: 26px; }
    }

    .mobile-title {
      font-size: 17px;
      font-weight: 600;
    }

    /* ── Sidebar overlay (mobile) ───────────────────────── */
    .sidebar-overlay {
      display: none;
    }

    /* ── Responsive ─────────────────────────────────────── */
    @media (max-width: 992px) {
      .mobile-header { display: flex; }

      .sidebar {
        top: 50px;
        height: calc(100vh - 50px);
        transform: translateX(-100%);
        transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 150;
        width: 260px !important;
      }

      .sidebar.open { transform: translateX(0); }

      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: 50px 0 0 0;
        background: rgba(0,0,0,0);
        z-index: 140;
        pointer-events: none;
        transition: background 0.28s ease;
      }

      .sidebar-overlay.show {
        background: rgba(0,0,0,0.45);
        pointer-events: all;
      }

      .main-content {
        margin-left: 0 !important;
        margin-top: 50px;
      }

      .top-bar { top: 50px; }
    }

    @media (max-width: 576px) {
      .sidebar { width: 280px; }

      .main-content { padding: 0; }

      .top-bar {
        padding: 10px 14px;
      }
    }
  `],
})
export class AdminLayoutComponent implements OnInit {
  navModules = NAV_MODULES;
  navPolicy  = NAV_POLICY;

  userRole: string | null = null;
  userName: string | null = null;
  sidebarOpen = false;
  sidebarCollapsed = localStorage.getItem('umf_sidebar_collapsed') === 'true';

  constructor(
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private tokenService: Token,
    private router: Router,
  ) {}

  ngOnInit() {
    this.refreshUser();

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
    ).subscribe(() => {
      this.refreshUser();
      this.cdr.detectChanges();
    });
  }

  private refreshUser() {
    this.userRole = this.userService.getRole();
    this.userName = this.tokenService.getUserName();
  }

  getRoleIcon(): string {
    const map: Record<string, string> = {
      Admin:   'shield',
      Manager: 'manage_accounts',
      Member:  'person',
      Viewer:  'visibility',
    };
    return map[this.userRole ?? ''] ?? 'person';
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar()  { this.sidebarOpen = false; }
  toggleSidebarCollapse() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('umf_sidebar_collapsed', String(this.sidebarCollapsed));
  }

  closeSidebarOnMobile() {
    if (window.innerWidth <= 992) this.sidebarOpen = false;
  }

  onRouteActivate() { this.cdr.detectChanges(); }

  logout() {
    localStorage.clear();
    this.router.navigate(['/auth/login']);
  }
}
