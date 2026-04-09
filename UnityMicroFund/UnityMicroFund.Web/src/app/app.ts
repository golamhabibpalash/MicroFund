import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <mat-sidenav-container class="container">
      @if (authService.isAuthenticated()) {
        <ng-container>
          <mat-sidenav mode="side" opened>
            <div class="logo">
              <h2>Unity MicroFund</h2>
            </div>
            <mat-nav-list>
              <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
                <mat-icon matListItemIcon>dashboard</mat-icon>
                <span matListItemTitle>Dashboard</span>
              </a>
              <a mat-list-item routerLink="/members" routerLinkActive="active">
                <mat-icon matListItemIcon>people</mat-icon>
                <span matListItemTitle>Members</span>
              </a>
              <a mat-list-item routerLink="/investments" routerLinkActive="active">
                <mat-icon matListItemIcon>trending_up</mat-icon>
                <span matListItemTitle>Investments</span>
              </a>
              <a mat-list-item routerLink="/contributions" routerLinkActive="active">
                <mat-icon matListItemIcon>payments</mat-icon>
                <span matListItemTitle>Contributions</span>
              </a>
              <mat-divider></mat-divider>
              <div class="nav-section-title">Administration</div>
              <a mat-list-item routerLink="/user-management" routerLinkActive="active">
                <mat-icon matListItemIcon>manage_accounts</mat-icon>
                <span matListItemTitle>User Management</span>
              </a>
              <a mat-list-item routerLink="/claims-management" routerLinkActive="active">
                <mat-icon matListItemIcon>policy</mat-icon>
                <span matListItemTitle>Claims & Roles</span>
              </a>
            </mat-nav-list>
          </mat-sidenav>
          <mat-sidenav-content>
            <mat-toolbar color="primary">
              <span>Unity MicroFund</span>
              <span class="spacer"></span>
              <button mat-icon-button [matMenuTriggerFor]="userMenu">
                <mat-icon>account_circle</mat-icon>
              </button>
              <mat-menu #userMenu="matMenu">
                <div class="user-info">
                  <strong>{{ authService.currentUser()?.name }}</strong>
                  <span class="role">{{ authService.currentUser()?.role }}</span>
                </div>
                <mat-divider></mat-divider>
                <button mat-menu-item routerLink="/profile">
                  <mat-icon>person</mat-icon>
                  <span>My Profile</span>
                </button>
                <button mat-menu-item (click)="logout()">
                  <mat-icon>logout</mat-icon>
                  <span>Logout</span>
                </button>
              </mat-menu>
            </mat-toolbar>
            <div class="content">
              <router-outlet />
            </div>
          </mat-sidenav-content>
        </ng-container>
      } @else {
        <mat-sidenav-content>
          <div class="content full-width">
            <router-outlet />
          </div>
        </mat-sidenav-content>
      }
    </mat-sidenav-container>
  `,
  styles: [`
    .container {
      height: 100vh;
    }
    
    mat-sidenav {
      width: 250px;
      background: #1B5E20;
    }
    
    .logo {
      padding: 20px;
      color: white;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .logo h2 {
      margin: 0;
      font-size: 1.3rem;
    }
    
    .nav-section-title {
      padding: 16px 16px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.5px;
    }
    
    mat-nav-list a {
      color: white !important;
    }
    
    mat-nav-list a.active {
      background: rgba(255,255,255,0.1) !important;
    }
    
    mat-icon {
      color: white;
    }
    
    mat-toolbar {
      background: #2E7D32;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .content {
      padding: 20px;
      background: #F5F5F5;
      min-height: calc(100vh - 64px);
    }
    
    .content.full-width {
      padding: 0;
      background: transparent;
    }
    
    .user-info {
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
    }
    
    .user-info .role {
      font-size: 0.8rem;
      color: #666;
      margin-top: 2px;
    }
    
    mat-divider {
      margin: 8px 0;
    }
  `]
})
export class App {
  authService = inject(AuthService);

  logout() {
    console.log('Logging out...');
    this.authService.logout();
  }
}
