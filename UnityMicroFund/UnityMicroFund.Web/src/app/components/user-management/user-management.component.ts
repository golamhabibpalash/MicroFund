import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="container">
      <div class="header">
        <h1><mat-icon>admin_panel_settings</mat-icon> User Management</h1>
        <p>Manage user roles and permissions</p>
      </div>

      @if (isLoading) {
        <div class="loading">
          <mat-spinner diameter="50"></mat-spinner>
        </div>
      } @else {
        <mat-card class="users-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>people</mat-icon>
            <mat-card-title>All Users</mat-card-title>
            <mat-card-subtitle>Click on role to change</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="users" class="users-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let user">{{ user.name }}</td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let user">{{ user.email }}</td>
              </ng-container>

              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let user">
                  <mat-form-field appearance="outline" class="role-select">
                    <mat-select [(value)]="user.role" (selectionChange)="onRoleChange(user, $event.value)">
                      <mat-option value="Admin">Admin</mat-option>
                      <mat-option value="Manager">Manager</mat-option>
                      <mat-option value="Member">Member</mat-option>
                      <mat-option value="Viewer">Viewer</mat-option>
                    </mat-select>
                  </mat-form-field>
                </td>
              </ng-container>

              <ng-container matColumnDef="claims">
                <th mat-header-cell *matHeaderCellDef>Claims</th>
                <td mat-cell *matCellDef="let user">
                  <button mat-stroked-button color="primary" (click)="openClaimsDialog(user)">
                    <mat-icon>key</mat-icon>
                    Manage Claims ({{ user.claims?.length || 0 }})
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>

    @if (selectedUser) {
      <div class="dialog-overlay" (click)="closeClaimsDialog()">
        <mat-card class="claims-dialog" (click)="$event.stopPropagation()">
          <mat-card-header>
            <mat-icon mat-card-avatar>vpn_key</mat-icon>
            <mat-card-title>Claims for {{ selectedUser.name }}</mat-card-title>
            <button mat-icon-button class="close-btn" (click)="closeClaimsDialog()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <h3>Current Claims</h3>
            @if (userClaims.length === 0) {
              <p class="no-claims">No custom claims assigned</p>
            } @else {
              <div class="claims-list">
                @for (claim of userClaims; track claim.id) {
                  <div class="claim-item">
                    <div class="claim-info">
                      <span class="claim-type">{{ claim.claimType }}</span>
                      <span class="claim-value">{{ claim.claimValue }}</span>
                    </div>
                    <button mat-icon-button color="warn" (click)="removeUserClaim(claim.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }

            <h3>Add New Claim</h3>
            <div class="add-claim-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Claim Type</mat-label>
                <mat-select [(value)]="newClaimType">
                  <mat-option value="members.view">members.view</mat-option>
                  <mat-option value="members.create">members.create</mat-option>
                  <mat-option value="members.edit">members.edit</mat-option>
                  <mat-option value="members.delete">members.delete</mat-option>
                  <mat-option value="contributions.view">contributions.view</mat-option>
                  <mat-option value="contributions.create">contributions.create</mat-option>
                  <mat-option value="contributions.edit">contributions.edit</mat-option>
                  <mat-option value="contributions.delete">contributions.delete</mat-option>
                  <mat-option value="investments.view">investments.view</mat-option>
                  <mat-option value="investments.create">investments.create</mat-option>
                  <mat-option value="investments.edit">investments.edit</mat-option>
                  <mat-option value="investments.delete">investments.delete</mat-option>
                  <mat-option value="dashboard.view">dashboard.view</mat-option>
                  <mat-option value="reports.view">reports.view</mat-option>
                  <mat-option value="settings.manage">settings.manage</mat-option>
                  <mat-option value="users.manage">users.manage</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Claim Value</mat-label>
                <input matInput [(ngModel)]="newClaimValue" placeholder="true / false / specific value">
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="addUserClaim()" [disabled]="!newClaimType || !newClaimValue">
                <mat-icon>add</mat-icon> Add Claim
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
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

    .users-card {
      border-radius: 16px;
    }

    .users-table {
      width: 100%;
    }

    .role-select {
      width: 150px;
    }

    .role-select ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .claims-dialog {
      width: 500px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      border-radius: 16px;
    }

    .claims-dialog mat-card-header {
      position: relative;
    }

    .close-btn {
      position: absolute;
      right: 0;
      top: 0;
    }

    .claims-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .claim-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 15px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .claim-info {
      display: flex;
      flex-direction: column;
    }

    .claim-type {
      font-weight: 500;
      color: #333;
    }

    .claim-value {
      font-size: 0.85rem;
      color: #666;
    }

    .no-claims {
      color: #999;
      font-style: italic;
      padding: 20px;
      text-align: center;
    }

    .add-claim-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .full-width {
      width: 100%;
    }

    h3 {
      margin: 20px 0 10px 0;
      color: #333;
      font-size: 1rem;
    }

    h3:first-of-type {
      margin-top: 0;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  displayedColumns = ['name', 'email', 'role', 'claims'];
  isLoading = true;
  selectedUser: User | null = null;
  userClaims: any[] = [];
  newClaimType = '';
  newClaimValue = '';

  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onRoleChange(user: User, newRole: string) {
    this.userService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        this.snackBar.open(`Role updated to ${newRole}`, 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to update role', 'Close', { duration: 3000 });
        this.loadUsers();
      }
    });
  }

  openClaimsDialog(user: User) {
    this.selectedUser = user;
    this.newClaimType = '';
    this.newClaimValue = '';
    this.userService.getUserClaims(user.id).subscribe({
      next: (claims) => {
        this.userClaims = claims;
      },
      error: () => {
        this.snackBar.open('Failed to load claims', 'Close', { duration: 3000 });
      }
    });
  }

  closeClaimsDialog() {
    this.selectedUser = null;
    this.userClaims = [];
  }

  addUserClaim() {
    if (!this.selectedUser || !this.newClaimType || !this.newClaimValue) return;

    this.userService.addUserClaim(this.selectedUser.id, {
      claimType: this.newClaimType,
      claimValue: this.newClaimValue
    }).subscribe({
      next: (claim) => {
        this.userClaims.push(claim);
        this.newClaimType = '';
        this.newClaimValue = '';
        this.snackBar.open('Claim added', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to add claim', 'Close', { duration: 3000 });
      }
    });
  }

  removeUserClaim(claimId: string) {
    if (!this.selectedUser) return;

    this.userService.removeUserClaim(this.selectedUser.id, claimId).subscribe({
      next: () => {
        this.userClaims = this.userClaims.filter(c => c.id !== claimId);
        this.snackBar.open('Claim removed', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to remove claim', 'Close', { duration: 3000 });
      }
    });
  }
}
