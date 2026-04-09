import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../core/services/user.service';
import { RoleClaim, ClaimPermissions } from '../../core/models/user.model';

@Component({
  selector: 'app-claims-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="container">
      <div class="header">
        <h1><mat-icon>policy</mat-icon> Claims Management</h1>
        <p>Manage role-based permissions</p>
      </div>

      @if (isLoading) {
        <div class="loading">
          <mat-spinner diameter="50"></mat-spinner>
        </div>
      } @else {
        <div class="role-selector">
          <mat-form-field appearance="outline">
            <mat-label>Select Role</mat-label>
            <mat-select [(value)]="selectedRole" (selectionChange)="onRoleChange()">
              <mat-option value="Admin">Admin</mat-option>
              <mat-option value="Manager">Manager</mat-option>
              <mat-option value="Member">Member</mat-option>
              <mat-option value="Viewer">Viewer</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="content-grid">
          <mat-card class="claims-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>check_circle</mat-icon>
              <mat-card-title>Active Claims</mat-card-title>
              <mat-card-subtitle>Claims assigned to {{ selectedRole }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (currentClaims.length === 0) {
                <div class="empty-state">
                  <mat-icon>block</mat-icon>
                  <p>No claims assigned to this role</p>
                </div>
              } @else {
                <div class="claims-grid">
                  @for (claim of currentClaims; track claim.id) {
                    <div class="claim-chip active">
                      <mat-icon>verified</mat-icon>
                      <span>{{ claim.claimType }}</span>
                      <button mat-icon-button color="warn" (click)="removeRoleClaim(claim.id)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card class="add-claim-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>add_circle</mat-icon>
              <mat-card-title>Add Claim</mat-card-title>
              <mat-card-subtitle>Add permissions to {{ selectedRole }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="available-claims">
                <h4>Available Permissions</h4>
                <div class="claims-grid">
                  @for (claimType of availableClaims; track claimType) {
                    <div class="claim-chip" [class.disabled]="isClaimAssigned(claimType)">
                      <mat-icon>{{ isClaimAssigned(claimType) ? 'check' : 'add' }}</mat-icon>
                      <span>{{ claimType }}</span>
                      @if (!isClaimAssigned(claimType)) {
                        <button mat-icon-button color="primary" (click)="addRoleClaim(claimType)">
                          <mat-icon>add</mat-icon>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="info-card">
          <mat-card-content>
            <h3><mat-icon>info</mat-icon> About Role Claims</h3>
            <ul>
              <li><strong>Admin:</strong> Full system access, can manage all settings and users</li>
              <li><strong>Manager:</strong> Can manage members, contributions, and investments</li>
              <li><strong>Member:</strong> Can view dashboard and their own data</li>
              <li><strong>Viewer:</strong> Read-only access to dashboard and reports</li>
            </ul>
            <p class="note">
              <mat-icon>note</mat-icon>
              User-specific claims override role claims. Use the User Management page to assign individual claims.
            </p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 30px;
    }

    .header h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #1B5E20;
      margin: 0 0 5px 0;
    }

    .header p {
      color: #666;
      margin: 0;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 50px;
    }

    .role-selector {
      margin-bottom: 20px;
    }

    .role-selector mat-form-field {
      width: 300px;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 900px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .claims-card, .add-claim-card, .info-card {
      border-radius: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 10px;
    }

    .claims-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .claim-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 20px;
      font-size: 0.85rem;
      border: 1px solid #e0e0e0;
    }

    .claim-chip.active {
      background: #E8F5E9;
      border-color: #4CAF50;
      color: #2E7D32;
    }

    .claim-chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .claim-chip span {
      font-family: monospace;
    }

    .claim-chip.disabled {
      opacity: 0.5;
    }

    .available-claims h4 {
      margin: 0 0 15px 0;
      color: #333;
    }

    .info-card {
      background: #E3F2FD;
    }

    .info-card h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 15px 0;
      color: #1565C0;
    }

    .info-card ul {
      margin: 0;
      padding-left: 20px;
    }

    .info-card li {
      margin-bottom: 8px;
      color: #333;
    }

    .note {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 15px;
      color: #666;
      font-size: 0.9rem;
    }
  `]
})
export class ClaimsManagementComponent implements OnInit {
  selectedRole = 'Member';
  currentClaims: RoleClaim[] = [];
  availableClaims = [
    'members.view', 'members.create', 'members.edit', 'members.delete',
    'contributions.view', 'contributions.create', 'contributions.edit', 'contributions.delete',
    'investments.view', 'investments.create', 'investments.edit', 'investments.delete',
    'dashboard.view', 'reports.view', 'settings.manage', 'users.manage'
  ];
  isLoading = true;

  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadRoleClaims();
  }

  loadRoleClaims() {
    this.isLoading = true;
    this.userService.getRoleClaims(this.selectedRole).subscribe({
      next: (claims) => {
        this.currentClaims = claims;
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load claims', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onRoleChange() {
    this.loadRoleClaims();
  }

  isClaimAssigned(claimType: string): boolean {
    return this.currentClaims.some(c => c.claimType === claimType);
  }

  addRoleClaim(claimType: string) {
    this.userService.addRoleClaim({
      role: this.selectedRole,
      claimType: claimType,
      claimValue: 'true'
    }).subscribe({
      next: (claim) => {
        this.currentClaims.push(claim);
        this.snackBar.open(`Claim "${claimType}" added`, 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to add claim', 'Close', { duration: 3000 });
      }
    });
  }

  removeRoleClaim(claimId: string) {
    this.userService.removeRoleClaim(claimId).subscribe({
      next: () => {
        this.currentClaims = this.currentClaims.filter(c => c.id !== claimId);
        this.snackBar.open('Claim removed', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to remove claim', 'Close', { duration: 3000 });
      }
    });
  }
}
