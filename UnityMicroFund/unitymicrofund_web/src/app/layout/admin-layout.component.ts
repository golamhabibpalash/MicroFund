import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { UserService } from '../core/services/user';
import { Token } from '../core/services/token';
import { BrandingService } from '../core/services/branding.service';
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
      { label: 'Withdraw',     route: '/withdraw',    icon: 'output' },
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
                <img [src]="logoUrl" alt="Company logo" class="logo-img" />
                <div class="logo-shine"></div>
              </div>
              <div class="logo-content">
                <span class="logo-text">{{ companyName }}</span>
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
          <img *ngIf="userImageUrl" [src]="userImageUrl" alt="Profile" class="collapsed-avatar-img" />
          <span *ngIf="!userImageUrl" class="material-icons">person</span>
          <span *ngIf="!userImageUrl" class="user-initial">{{ userName ? userName.charAt(0).toUpperCase() : '?' }}</span>
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
          <div class="top-bar-left">
            <div class="breadcrumb">
              <span class="material-icons">home</span>
              <span class="breadcrumb-current">{{ getCurrentPageTitle() }}</span>
            </div>
          </div>
          <div class="top-bar-right">
            <div class="user-info">
              <div class="user-avatar">
                <img *ngIf="userImageUrl" [src]="userImageUrl" alt="Profile" class="avatar-img" />
                <span *ngIf="!userImageUrl" class="avatar-initials">{{ userName ? userName.charAt(0).toUpperCase() : '?' }}</span>
              </div>
              <div class="user-details">
                <span class="user-name">{{ userName }}</span>
                <span class="user-role-label">{{ userRole }}</span>
              </div>
            </div>
            <app-notification-bell></app-notification-bell>
          </div>
        </div>
        <div class="content-area">
          <router-outlet (activate)="onRouteActivate()"></router-outlet>
        </div>
      </main>

      <app-chat-interface></app-chat-interface>
    </div>
  `,
  styles: [`
    /* ── Layout shell ───────────────────────────────────── */
    .layout-container { display: flex; min-height: 100vh; background: var(--color-background); }
    /* ── Sidebar ────────────────────────────────────────── */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--sidebar-bg);
      color: var(--sidebar-text);
      display: flex; flex-direction: column; position: fixed;
      top: 0; left: 0; height: 100vh; z-index: var(--z-sticky);
      overflow: hidden;
      transition: width var(--transition-base);
    }
    .sidebar.collapsed { width: var(--sidebar-collapsed-width); }
    /* ── Logo section ───────────────────────────────────── */
    .logo-section {
      flex-shrink: 0;
      border-bottom: 1px solid var(--sidebar-divider);
      display: flex;
      align-items: center;
      padding: 14px 12px;
      gap: 10px;
    }
    .logo-toggle {
      flex-shrink: 0;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--sidebar-divider);
      border-radius: var(--radius-md);
      color: var(--sidebar-text);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .logo-toggle:hover { background: rgba(255,255,255,0.12); color: var(--sidebar-text-active); }
    .logo-toggle .material-icons { font-size: 20px; transition: transform var(--transition-base); }
    .sidebar.collapsed .logo-toggle .material-icons { transform: rotate(180deg); }
    .logo-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1; min-width: 0;
      overflow: hidden;
      transition: opacity 0.2s, max-width var(--transition-base);
    }
    .logo-wrapper.hidden { opacity: 0; max-width: 0; margin: 0; pointer-events: none; }
    .logo-icon-container {
      width: 38px; height: 38px;
      background: var(--brand-gradient);
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
    }
    .logo-img { width: 24px; height: 24px; object-fit: contain; filter: brightness(0) invert(1); }
    .logo-content { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
    .logo-text { font-size: 15px; font-weight: 700; color: var(--sidebar-text-active); letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .logo-tagline { font-size: 9px; font-weight: 500; color: var(--color-accent-lighter); text-transform: uppercase; letter-spacing: 1.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* ── Collapsed user badge ───────────────────────────── */
    .collapsed-user-badge { display: flex; align-items: center; justify-content: center; position: relative; padding: 12px 0; flex-shrink: 0; }
    .collapsed-user-badge .material-icons { font-size: 24px; color: var(--sidebar-text); }
    .collapsed-user-badge .user-initial { position: absolute; bottom: 6px; right: 16px; width: 18px; height: 18px; background: var(--color-accent); color: white; border-radius: 50%; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--sidebar-bg); }
    .collapsed-avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    /* ── Sidebar footer ─────────────────────────────────── */
    .sidebar-footer { flex-shrink: 0; padding: 12px 16px; border-top: 1px solid var(--sidebar-divider); }
    .sidebar.collapsed .sidebar-footer { padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .user-role-badge {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px;
      background: rgba(255,255,255,0.06);
      border-radius: var(--radius-md);
      margin-bottom: 8px;
      font-size: var(--text-xs);
    }
    .role-icon { font-size: 16px; color: var(--color-accent-lighter); }
    .role-name { font-weight: 500; color: var(--color-accent-lighter); }
    .logout-btn {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--sidebar-divider);
      color: var(--sidebar-text);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--text-base);
      font-family: inherit;
      transition: all var(--transition-fast);
      .material-icons { font-size: 18px; }
      &:hover { background: rgba(220,38,38,0.15); color: #fca5a5; border-color: rgba(220,38,38,0.3); }
      &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    }
    /* ── Main content ───────────────────────────────────── */
    .main-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      min-width: 0;
      transition: margin-left var(--transition-base);
      display: flex;
      flex-direction: column;
    }
    .sidebar.collapsed ~ .main-content { margin-left: var(--sidebar-collapsed-width); }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 var(--space-6);
      height: var(--topbar-height);
      background: var(--topbar-bg);
      border-bottom: 1px solid var(--topbar-border);
      position: sticky;
      top: 0;
      z-index: 50;
      flex-shrink: 0;
    }
    .top-bar-left {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .top-bar-right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--text-muted);
    }
    .breadcrumb .material-icons {
      font-size: 16px;
    }
    .breadcrumb-current {
      color: var(--text-primary);
      font-weight: 500;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 6px 12px 6px 6px;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
      cursor: pointer;
    }
    .user-info:hover {
      background: var(--color-background-alt);
    }
    .user-avatar {
      width: 32px; height: 32px;
      background: var(--brand-gradient);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white;
      font-size: var(--text-sm);
      font-weight: 600;
      overflow: hidden;
    }
    .user-avatar .avatar-img {
      width: 100%; height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .user-avatar .avatar-initials {
      display: flex; align-items: center; justify-content: center;
      width: 100%; height: 100%;
    }
    .user-details {
      display: flex;
      flex-direction: column;
    }
    .user-name { font-weight: 600; color: var(--text-primary); font-size: var(--text-sm); line-height: 1.3; }
    .user-role-label { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.3; }
    /* ── Main content area ───────────────────────────────── */
    .content-area {
      flex: 1;
      padding: var(--space-6);
      overflow-y: auto;
    }
    /* ── Mobile header ──────────────────────────────────── */
    .mobile-header {
      display: none;
      align-items: center;
      gap: 12px;
      background: var(--sidebar-bg);
      color: var(--sidebar-text-active);
      padding: 10px 16px;
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 200;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .hamburger {
      background: none; border: none; color: var(--sidebar-text-active);
      cursor: pointer; padding: 4px; border-radius: var(--radius-sm);
      display: flex; align-items: center;
      transition: background var(--transition-fast);
      &:hover { background: rgba(255,255,255,0.12); }
      &:focus-visible { outline: 2px solid var(--color-accent); }
      .material-icons { font-size: 26px; }
    }
    .mobile-title { font-size: 17px; font-weight: 600; }
    /* ── Sidebar overlay (mobile) ───────────────────────── */
    .sidebar-overlay { display: none; }
    /* ── Responsive ─────────────────────────────────────── */
    @media (max-width: 1200px) {
      .sidebar { width: 240px; }
      .main-content { margin-left: 240px; }
      .sidebar.collapsed ~ .main-content { margin-left: 64px; }
      .sidebar.collapsed { width: 64px; }
    }
    @media (max-width: 992px) {
      .mobile-header { display: flex; }
      .sidebar {
        top: 50px;
        height: calc(100vh - 50px);
        transform: translateX(-100%);
        transition: transform var(--transition-base);
        z-index: 150;
        width: var(--sidebar-width) !important;
      }
      .sidebar.open { transform: translateX(0); }
      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: 50px 0 0 0;
        background: rgba(0,0,0,0);
        z-index: 140;
        pointer-events: none;
        transition: background var(--transition-base);
      }
      .sidebar-overlay.show { background: rgba(0,0,0,0.45); pointer-events: all; }
      .main-content { margin-left: 0 !important; margin-top: 50px; }
      .top-bar { top: 50px; }
      .content-area { padding: var(--space-4); }
    }
    @media (max-width: 768px) {
      .top-bar { padding: 0 var(--space-4); }
      .user-name { font-size: var(--text-sm); }
      .user-role-label { display: none; }
      .mobile-title { font-size: 15px; }
    }
    @media (max-width: 576px) {
      .sidebar { width: 280px !important; }
      .top-bar { padding: 0 var(--space-3); gap: 8px; }
      .user-details { display: none; }
      .mobile-header { padding: 8px 12px; }
      .hamburger .material-icons { font-size: 24px; }
      .mobile-title { font-size: 14px; }
    }
    @media (max-width: 480px) {
      .top-bar { padding: 0 var(--space-2); }
    }
  `],
})
export class AdminLayoutComponent implements OnInit {
  navModules = NAV_MODULES;
  navPolicy  = NAV_POLICY;

  userRole: string | null = null;
  userName: string | null = null;
  userImageUrl: string | null = null;
  companyName = 'Unity MicroFund';
  logoUrl = 'assets/organization/logo.png';
  sidebarOpen = false;
  sidebarCollapsed = localStorage.getItem('umf_sidebar_collapsed') === 'true';

  constructor(
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private tokenService: Token,
    private router: Router,
    private brandingService: BrandingService,
  ) {}

  ngOnInit() {
    this.refreshUser();
    this.loadBranding();

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
    ).subscribe(() => {
      this.refreshUser();
      this.cdr.detectChanges();
    });
  }

  private loadBranding() {
    this.brandingService.getBranding().subscribe({
      next: (branding) => {
        this.companyName = branding.companyName;
        this.logoUrl = branding.logoUrl;
        this.cdr.detectChanges();
      },
      error: () => { /* keep defaults on failure */ },
    });
  }

  private refreshUser() {
    this.userRole = this.userService.getRole();
    this.userName = this.tokenService.getUserName();
    this.userImageUrl = this.tokenService.getUserImageUrl();
  }

  getRoleIcon(): string {
    const map: Record<string, string> = { Admin: 'shield', Manager: 'manage_accounts', Member: 'person', Viewer: 'visibility' };
    return map[this.userRole ?? ''] ?? 'person';
  }

  getCurrentPageTitle(): string {
    const path = this.router.url.split('?')[0].replace(/\/$/, '');
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/investments': 'Investments',
      '/payments': 'Transactions',
      '/withdraw': 'Withdraw',
      '/accounts': 'Accounts',
      '/investors': 'Investors',
      '/reports': 'Reports',
      '/users': 'User Management',
      '/settings': 'Business Config',
      '/logs/activity': 'Activity Logs',
      '/logs/audit': 'Audit Logs',
      '/profile': 'Profile',
    };
    return map[path] || 'Dashboard';
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
