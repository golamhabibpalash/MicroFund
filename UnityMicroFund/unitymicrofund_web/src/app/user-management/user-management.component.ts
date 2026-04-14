import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserManagementService } from '../core/services/user-management.service';
import { RoleManagementService } from '../core/services/role-management.service';
import { User, UserDetail, CreateUser, AssignRole, UserClaim } from '../core/models/user.model';
import { Role, RoleClaim, PERMISSION_CATEGORIES, PERMISSION_DESCRIPTIONS, ALL_PERMISSIONS, ROLE_DESCRIPTIONS } from '../core/models/role.model';

type TabType = 'users' | 'roles' | 'permissions';

@Component({
  selector: 'app-user-management',
  template: `
    <div class="user-management-wrapper">
      <header class="page-header">
        <div class="header-left">
          <h1>User Management</h1>
          <p class="subtitle">Manage users, roles, and permissions</p>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          [class.active]="activeTab === 'users'" 
          (click)="activeTab = 'users'"
          class="tab-btn">
          <span class="material-icons">people</span>
          Users
          <span class="badge">{{ users.length }}</span>
        </button>
        <button 
          [class.active]="activeTab === 'roles'" 
          (click)="activeTab = 'roles'"
          class="tab-btn">
          <span class="material-icons">admin_panel_settings</span>
          Roles
          <span class="badge">{{ roles.length }}</span>
        </button>
        <button 
          [class.active]="activeTab === 'permissions'" 
          (click)="activeTab = 'permissions'"
          class="tab-btn">
          <span class="material-icons">lock</span>
          Permissions
        </button>
      </div>

      <!-- Users Tab -->
      <div class="tab-content" *ngIf="activeTab === 'users'">
        <div class="content-header">
          <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" [(ngModel)]="userSearchTerm" (input)="filterUsers()" placeholder="Search users..." />
          </div>
          <button class="btn btn-primary" (click)="showCreateUserModal = true">
            <span class="material-icons">person_add</span>
            Add User
          </button>
        </div>

        <div class="table-container" *ngIf="!isLoadingUsers">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Claims</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ getInitials(user.name) }}</div>
                    <div class="user-info">
                      <span class="name">{{ user.name }}</span>
                      <span class="id">ID: {{ user.id | slice:0:8 }}...</span>
                    </div>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="role-badge" [class]="'role-' + user.role.toLowerCase()">
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="claims-cell">
                    <span class="claim-count">{{ user.claims?.length || 0 }} claims</span>
                    <button class="btn-icon" (click)="viewUserClaims(user)" title="View Claims">
                      <span class="material-icons">visibility</span>
                    </button>
                  </div>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" (click)="editUserRole(user)" title="Change Role">
                      <span class="material-icons">manage_accounts</span>
                    </button>
                    <button class="btn-icon" (click)="editUser(user)" title="Edit User">
                      <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-icon danger" (click)="deleteUser(user)" title="Delete User">
                      <span class="material-icons">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredUsers.length === 0">
                <td colspan="6" class="empty-row">
                  <span class="material-icons">person_off</span>
                  <span>No users found</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="loading" *ngIf="isLoadingUsers">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Roles Tab -->
      <div class="tab-content" *ngIf="activeTab === 'roles'">
        <div class="roles-grid">
          <div class="role-card" *ngFor="let role of roles">
            <div class="role-header">
              <div class="role-icon" [class]="'role-' + role.name.toLowerCase()">
                <span class="material-icons">{{ getRoleIcon(role.name) }}</span>
              </div>
              <div class="role-title">
                <h3>{{ role.name }}</h3>
                <p>{{ role.description || getRoleDescription(role.name) }}</p>
              </div>
              <span class="user-count">{{ role.userCount }} users</span>
            </div>
            <div class="role-permissions">
              <h4>Permissions ({{ role.claims.length }})</h4>
              <div class="permission-tags">
                <span class="permission-tag" *ngFor="let claim of role.claims | slice:0:6">
                  {{ claim.claimValue }}
                </span>
                <span class="more-tag" *ngIf="role.claims.length > 6">
                  +{{ role.claims.length - 6 }} more
                </span>
              </div>
            </div>
            <div class="role-actions">
              <button class="btn btn-sm" (click)="editRolePermissions(role)">
                <span class="material-icons">tune</span>
                Manage Permissions
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Permissions Tab -->
      <div class="tab-content" *ngIf="activeTab === 'permissions'">
        <div class="permissions-header">
          <p class="info-text">Manage permissions for each role. Click on a role tab to view and edit its permissions.</p>
        </div>

        <div class="role-permission-tabs">
          <button 
            *ngFor="let role of roles" 
            [class.active]="selectedRoleForPermissions === role.name"
            (click)="selectRoleForPermissions(role.name)"
            class="role-tab-btn">
            {{ role.name }}
            <span class="count">{{ role.claims.length }}</span>
          </button>
        </div>

        <div class="permissions-grid" *ngIf="selectedRoleForPermissions">
          <div class="permission-category" *ngFor="let category of permissionCategories">
            <div class="category-header">
              <span class="material-icons">{{ category.icon }}</span>
              <h3>{{ category.category }}</h3>
            </div>
            <div class="category-permissions">
              <div class="permission-item" *ngFor="let perm of category.permissions">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [checked]="hasPermission(perm)"
                    (change)="togglePermission(perm, $event)" />
                  <span class="checkmark"></span>
                  <div class="permission-info">
                    <span class="permission-name">{{ getPermissionName(perm) }}</span>
                    <span class="permission-desc">{{ getPermissionDescription(perm) }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="permissions-actions" *ngIf="selectedRoleForPermissions && hasChanges">
          <button class="btn btn-primary" (click)="savePermissions()">
            <span class="material-icons">save</span>
            Save Changes
          </button>
          <button class="btn btn-secondary" (click)="resetPermissions()">
            <span class="material-icons">undo</span>
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Create User Modal -->
    <div class="modal-overlay" *ngIf="showCreateUserModal" (click)="showCreateUserModal = false">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Create New User</h2>
          <button class="btn-close" (click)="showCreateUserModal = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" [(ngModel)]="newUser.name" placeholder="Enter full name" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="newUser.email" placeholder="Enter email address" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="newUser.password" placeholder="Enter password" />
          </div>
          <div class="form-group">
            <label>Role</label>
            <select [(ngModel)]="newUser.role">
              <option value="Member">Member</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showCreateUserModal = false">Cancel</button>
          <button class="btn btn-primary" (click)="createUser()" [disabled]="!isValidUser()">
            <span class="material-icons">person_add</span>
            Create User
          </button>
        </div>
      </div>
    </div>

    <!-- Edit User Role Modal -->
    <div class="modal-overlay" *ngIf="showEditRoleModal" (click)="showEditRoleModal = false">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Change User Role</h2>
          <button class="btn-close" (click)="showEditRoleModal = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p class="user-info-text">
            <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})
          </p>
          <div class="form-group">
            <label>Select Role</label>
            <select [(ngModel)]="selectedRole">
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Member">Member</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showEditRoleModal = false">Cancel</button>
          <button class="btn btn-primary" (click)="updateUserRole()">
            <span class="material-icons">save</span>
            Update Role
          </button>
        </div>
      </div>
    </div>

    <!-- User Claims Modal -->
    <div class="modal-overlay" *ngIf="showClaimsModal" (click)="showClaimsModal = false">
      <div class="modal modal-xl" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>User Claims & Permissions</h2>
          <button class="btn-close" (click)="showClaimsModal = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="claims-section" *ngIf="selectedUserDetail">
            <div class="user-summary">
              <div class="user-avatar-lg">{{ getInitials(selectedUserDetail.name) }}</div>
              <div class="user-details">
                <h3>{{ selectedUserDetail.name }}</h3>
                <p>{{ selectedUserDetail.email }}</p>
                <span class="role-badge" [class]="'role-' + selectedUserDetail.role.toLowerCase()">
                  {{ selectedUserDetail.role }}
                </span>
              </div>
            </div>

            <!-- Add Claim Form -->
            <div class="add-claim-form" *ngIf="!isAddingClaim">
              <button class="btn btn-primary btn-sm" (click)="isAddingClaim = true">
                <span class="material-icons">add</span>
                Add Custom Claim
              </button>
            </div>

            <div class="add-claim-panel" *ngIf="isAddingClaim">
              <h4>Add Custom Claim</h4>
              <div class="add-claim-row">
                <div class="form-group">
                  <label>Permission</label>
                  <select [(ngModel)]="newClaim.claimValue">
                    <option value="">Select permission...</option>
                    <option *ngFor="let perm of availableClaimsForUser" [value]="perm">{{ perm }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Description (optional)</label>
                  <input type="text" [(ngModel)]="newClaim.description" placeholder="Add description..." />
                </div>
                <div class="form-actions">
                  <button class="btn btn-secondary btn-sm" (click)="cancelAddClaim()">Cancel</button>
                  <button class="btn btn-primary btn-sm" (click)="addUserClaim()" [disabled]="!newClaim.claimValue">
                    <span class="material-icons">add</span>
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div class="claims-tabs">
              <button [class.active]="claimsTab === 'direct'" (click)="claimsTab = 'direct'">
                Direct Claims ({{ selectedUserDetail.directClaims.length }})
              </button>
              <button [class.active]="claimsTab === 'inherited'" (click)="claimsTab = 'inherited'">
                Inherited from Role ({{ selectedUserDetail.inheritedClaims.length }})
              </button>
            </div>

            <div class="claims-list" *ngIf="claimsTab === 'direct'">
              <div class="claim-item" *ngFor="let claim of selectedUserDetail.directClaims">
                <div class="claim-info">
                  <span class="claim-key">{{ claim.claimValue }}</span>
                  <span class="claim-desc">{{ claim.description || 'No description' }}</span>
                </div>
                <button class="btn-icon danger" (click)="removeClaim(claim)" title="Remove Claim">
                  <span class="material-icons">delete</span>
                </button>
              </div>
              <div class="empty-claims" *ngIf="selectedUserDetail.directClaims.length === 0">
                <span class="material-icons">info</span>
                <span>No direct claims assigned. Add custom permissions above.</span>
              </div>
            </div>

            <div class="claims-list" *ngIf="claimsTab === 'inherited'">
              <div class="claim-item inherited" *ngFor="let claim of selectedUserDetail.inheritedClaims">
                <div class="claim-info">
                  <span class="claim-key">{{ claim }}</span>
                  <span class="claim-desc inherited-label">From role: {{ selectedUserDetail.role }}</span>
                </div>
              </div>
            </div>

            <!-- All Available Permissions -->
            <div class="quick-add-section">
              <h4>Quick Add Permissions</h4>
              <p class="hint-text">Click to add commonly used permissions:</p>
              <div class="quick-permissions">
                <button 
                  *ngFor="let perm of quickAddPermissions" 
                  class="quick-perm-btn"
                  [class.added]="hasDirectClaim(perm)"
                  (click)="toggleQuickClaim(perm)"
                  [disabled]="hasDirectClaim(perm) || hasInheritedClaim(perm)">
                  <span class="material-icons">{{ hasDirectClaim(perm) ? 'check' : 'add' }}</span>
                  {{ perm }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-management-wrapper { max-width: 1400px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 0 0; font-size: 14px; }

    .tabs { display: flex; gap: 4px; background: white; padding: 8px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 24px; }
    .tab-btn { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: transparent; border: none; border-radius: 8px; cursor: pointer; color: #666; font-weight: 500; transition: all 0.2s; }
    .tab-btn:hover { background: #f5f6fa; color: #1a1a2e; }
    .tab-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .tab-btn .badge { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .tab-btn:not(.active) .badge { background: #f0f0f0; color: #666; }

    .content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid #ddd; border-radius: 8px; background: white; }
    .search-box .material-icons { color: #999; }
    .search-box input { border: none; background: transparent; outline: none; font-size: 14px; width: 240px; }

    .btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #f5f6fa; color: #666; }
    .btn-secondary:hover { background: #eee; }
    .btn-sm { padding: 8px 16px; font-size: 13px; }
    .btn-icon { padding: 8px; background: transparent; border: none; border-radius: 6px; cursor: pointer; color: #666; transition: all 0.2s; }
    .btn-icon:hover { background: #f5f6fa; color: #667eea; }
    .btn-icon.danger:hover { background: #ffebee; color: #e74c3c; }

    .table-container { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 14px 16px; background: #f8f9fa; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #e9ecef; }
    .data-table td { padding: 16px; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
    .data-table tbody tr:hover { background: #f8f9fa; }
    .empty-row { text-align: center; padding: 40px; color: #999; }
    .empty-row .material-icons { font-size: 48px; display: block; margin: 0 auto 8px; }

    .user-cell { display: flex; align-items: center; gap: 12px; }
    .user-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; }
    .user-info { display: flex; flex-direction: column; }
    .user-info .name { font-weight: 600; color: #1a1a2e; }
    .user-info .id { font-size: 11px; color: #999; }

    .role-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .role-admin { background: #ffebee; color: #e74c3c; }
    .role-manager { background: #fff3e0; color: #f39c12; }
    .role-member { background: #e3f2fd; color: #2196f3; }
    .role-viewer { background: #f5f5f5; color: #666; }

    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-badge.active { background: #e8f5e9; color: #27ae60; }
    .status-badge.inactive { background: #ffebee; color: #e74c3c; }

    .claims-cell { display: flex; align-items: center; gap: 8px; }
    .claim-count { font-size: 13px; color: #666; }

    .actions { display: flex; gap: 4px; }

    .loading { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Roles Grid */
    .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .role-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s; }
    .role-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    .role-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .role-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
    .role-icon.role-admin { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .role-icon.role-manager { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .role-icon.role-member { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .role-icon.role-viewer { background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); }
    .role-title { flex: 1; }
    .role-title h3 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px 0; }
    .role-title p { font-size: 13px; color: #666; margin: 0; }
    .user-count { background: #f5f6fa; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; color: #666; }
    .role-permissions { margin-bottom: 16px; }
    .role-permissions h4 { font-size: 13px; color: #666; margin: 0 0 12px 0; }
    .permission-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .permission-tag { background: #f0f0f0; padding: 4px 10px; border-radius: 12px; font-size: 11px; color: #666; }
    .more-tag { background: #e8e8e8; padding: 4px 10px; border-radius: 12px; font-size: 11px; color: #999; font-style: italic; }
    .role-actions { border-top: 1px solid #eee; padding-top: 16px; }

    /* Permissions */
    .permissions-header { margin-bottom: 20px; }
    .info-text { color: #666; font-size: 14px; margin: 0; }
    .role-permission-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
    .role-tab-btn { padding: 10px 20px; background: white; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; font-weight: 500; color: #666; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
    .role-tab-btn:hover { border-color: #667eea; color: #667eea; }
    .role-tab-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-color: transparent; color: white; }
    .role-tab-btn .count { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; font-size: 11px; }
    .role-tab-btn:not(.active) .count { background: #f0f0f0; }

    .permissions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
    .permission-category { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .category-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; }
    .category-header .material-icons { color: #667eea; }
    .category-header h3 { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .category-permissions { padding: 16px 20px; }
    .permission-item { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
    .permission-item:last-child { border-bottom: none; }
    .checkbox-label { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
    .checkbox-label input[type="checkbox"] { width: 18px; height: 18px; margin-top: 2px; accent-color: #667eea; cursor: pointer; }
    .permission-info { display: flex; flex-direction: column; }
    .permission-name { font-weight: 500; color: #1a1a2e; font-size: 14px; }
    .permission-desc { font-size: 12px; color: #999; margin-top: 2px; }

    .permissions-actions { display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end; }

    /* Modals */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 16px; width: 480px; max-width: 90vw; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
    .modal-lg { width: 640px; }
    .modal-xl { width: 800px; max-width: 95vw; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; }
    .modal-header h2 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .btn-close { padding: 8px; background: transparent; border: none; border-radius: 6px; cursor: pointer; color: #666; }
    .btn-close:hover { background: #f5f6fa; }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; max-height: 80vh; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 12px; }

    .form-group { margin-bottom: 20px; }
    .form-group:last-child { margin-bottom: 0; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 6px; }
    .form-group input, .form-group select { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus { border-color: #667eea; }

    .user-info-text { background: #f5f6fa; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }

    /* Claims Modal */
    .claims-section { }
    .user-summary { display: flex; align-items: center; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
    .user-avatar-lg { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 20px; flex-shrink: 0; }
    .user-details h3 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px 0; }
    .user-details p { font-size: 13px; color: #666; margin: 0 0 8px 0; }
    .claims-tabs { display: flex; gap: 4px; margin-bottom: 16px; }
    .claims-tabs button { flex: 1; padding: 10px 16px; background: #f5f6fa; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: #666; transition: all 0.2s; }
    .claims-tabs button.active { background: #667eea; color: white; }
    .claims-list { max-height: 250px; overflow-y: auto; margin-bottom: 20px; }
    .claim-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9f9f9; border-radius: 8px; margin-bottom: 8px; }
    .claim-item.inherited { background: #f0f4ff; }
    .claim-info { display: flex; flex-direction: column; gap: 2px; }
    .claim-key { font-family: monospace; font-size: 13px; color: #667eea; font-weight: 500; }
    .claim-desc { font-size: 12px; color: #999; }
    .claim-desc.inherited-label { color: #888; font-style: italic; }
    .empty-claims { text-align: center; padding: 24px; color: #999; }
    .empty-claims .material-icons { font-size: 32px; display: block; margin: 0 auto 8px; }

    /* Add Claim Form */
    .add-claim-form { margin-bottom: 16px; }
    .add-claim-panel { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
    .add-claim-panel h4 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px 0; }
    .add-claim-row { display: flex; gap: 12px; align-items: flex-end; }
    .add-claim-row .form-group { flex: 1; margin-bottom: 0; }
    .form-actions { display: flex; gap: 8px; padding-bottom: 0; }

    /* Quick Add Permissions */
    .quick-add-section { border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
    .quick-add-section h4 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px 0; }
    .hint-text { font-size: 12px; color: #999; margin: 0 0 12px 0; }
    .quick-permissions { display: flex; flex-wrap: wrap; gap: 8px; }
    .quick-perm-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: white; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; font-size: 12px; color: #666; transition: all 0.2s; }
    .quick-perm-btn:hover:not(:disabled) { background: #667eea; color: white; border-color: #667eea; }
    .quick-perm-btn.added { background: #e8f5e9; color: #27ae60; border-color: #27ae60; cursor: default; }
    .quick-perm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .quick-perm-btn .material-icons { font-size: 16px; }

    .material-icons { font-size: 20px; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class UserManagementComponent implements OnInit {
  activeTab: TabType = 'users';
  users: User[] = [];
  filteredUsers: User[] = [];
  roles: Role[] = [];
  userSearchTerm = '';
  isLoadingUsers = false;

  showCreateUserModal = false;
  showEditRoleModal = false;
  showClaimsModal = false;
  selectedUser: User | null = null;
  selectedUserDetail: UserDetail | null = null;
  selectedRole = 'Member';
  claimsTab: 'direct' | 'inherited' = 'direct';

  newUser: CreateUser = { name: '', email: '', password: '', role: 'Member' };

  // User Claims Management
  isAddingClaim = false;
  newClaim: { claimValue: string; description: string } = { claimValue: '', description: '' };
  availableClaimsForUser: string[] = ALL_PERMISSIONS;
  quickAddPermissions: string[] = [
    'dashboard.view', 'dashboard.export',
    'members.view', 'members.create', 'members.edit', 'members.delete',
    'contributions.view', 'contributions.create', 'contributions.approve',
    'investments.view', 'investments.create',
    'accounts.view', 'accounts.transfer',
    'reports.view', 'reports.export',
    'settings.view', 'settings.manage'
  ];

  selectedRoleForPermissions = '';
  permissionCategories = PERMISSION_CATEGORIES;
  pendingPermissionChanges: { [key: string]: boolean } = {};
  hasChanges = false;

  constructor(
    private userService: UserManagementService,
    private roleService: RoleManagementService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers() {
    this.isLoadingUsers = true;
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filterUsers();
        this.isLoadingUsers = false;
      },
      error: () => {
        this.isLoadingUsers = false;
      },
    });
  }

  loadRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data;
        if (data.length > 0 && !this.selectedRoleForPermissions) {
          this.selectedRoleForPermissions = data[0].name;
        }
      },
      error: () => {},
    });
  }

  filterUsers() {
    if (!this.userSearchTerm) {
      this.filteredUsers = [...this.users];
    } else {
      const term = this.userSearchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getRoleIcon(role: string): string {
    const icons: { [key: string]: string } = {
      Admin: 'shield',
      Manager: 'manage_accounts',
      Member: 'person',
      Viewer: 'visibility',
    };
    return icons[role] || 'person';
  }

  getRoleDescription(role: string): string {
    return ROLE_DESCRIPTIONS[role] || '';
  }

  getPermissionName(perm: string): string {
    const names: { [key: string]: string } = {
      'dashboard.view': 'View Dashboard',
      'dashboard.export': 'Export Dashboard',
      'members.view': 'View Members',
      'members.create': 'Create Members',
      'members.edit': 'Edit Members',
      'members.delete': 'Delete Members',
      'contributions.view': 'View Contributions',
      'contributions.create': 'Create Contributions',
      'contributions.edit': 'Edit Contributions',
      'contributions.delete': 'Delete Contributions',
      'contributions.approve': 'Approve Contributions',
      'investments.view': 'View Investments',
      'investments.create': 'Create Investments',
      'investments.edit': 'Edit Investments',
      'investments.delete': 'Delete Investments',
      'accounts.view': 'View Accounts',
      'accounts.create': 'Create Accounts',
      'accounts.edit': 'Edit Accounts',
      'accounts.delete': 'Delete Accounts',
      'accounts.transfer': 'Transfer Funds',
      'reports.view': 'View Reports',
      'reports.export': 'Export Reports',
      'reports.create': 'Create Reports',
      'users.view': 'View Users',
      'users.create': 'Create Users',
      'users.edit': 'Edit Users',
      'users.delete': 'Delete Users',
      'users.manage_roles': 'Manage Roles',
      'settings.view': 'View Settings',
      'settings.manage': 'Manage Settings',
    };
    return names[perm] || perm;
  }

  getPermissionDescription(perm: string): string {
    const descriptions: { [key: string]: string } = {
      'dashboard.view': 'Access dashboard statistics and charts',
      'dashboard.export': 'Export dashboard data to CSV/PDF',
      'members.view': 'View member list and details',
      'members.create': 'Add new members to the system',
      'members.edit': 'Modify existing member information',
      'members.delete': 'Remove members from the system',
      'contributions.view': 'View all contributions',
      'contributions.create': 'Record new contributions',
      'contributions.edit': 'Edit contribution records',
      'contributions.delete': 'Delete contribution records',
      'contributions.approve': 'Approve or reject contributions',
      'investments.view': 'View investment portfolio',
      'investments.create': 'Create new investments',
      'investments.edit': 'Edit investment details',
      'investments.delete': 'Delete investments',
      'accounts.view': 'View account balances',
      'accounts.create': 'Create new accounts',
      'accounts.edit': 'Edit account details',
      'accounts.delete': 'Delete accounts',
      'accounts.transfer': 'Transfer funds between accounts',
      'reports.view': 'Access reports and analytics',
      'reports.export': 'Export reports to CSV/PDF',
      'reports.create': 'Create custom reports',
      'users.view': 'View user list',
      'users.create': 'Create new users',
      'users.edit': 'Edit user information',
      'users.delete': 'Delete users',
      'users.manage_roles': 'Assign roles to users',
      'settings.view': 'View system settings',
      'settings.manage': 'Modify system settings',
    };
    return descriptions[perm] || '';
  }

  isValidUser(): boolean {
    return !!(this.newUser.name && this.newUser.email && this.newUser.password);
  }

  createUser() {}

  editUser(user: User) {}

  editUserRole(user: User) {
    this.selectedUser = user;
    this.selectedRole = user.role;
    this.showEditRoleModal = true;
  }

  editRolePermissions(role: Role) {
    this.activeTab = 'permissions';
    this.selectedRoleForPermissions = role.name;
    this.hasChanges = false;
    this.pendingPermissionChanges = {};
  }

  updateUserRole() {
    if (!this.selectedUser) return;

    this.userService.updateUserRole(this.selectedUser.id, this.selectedRole).subscribe({
      next: () => {
        this.showEditRoleModal = false;
        this.loadUsers();
      },
      error: (err) => alert(err.error?.message || 'Error updating role'),
    });
  }

  deleteUser(user: User) {
    if (!confirm(`Are you sure you want to deactivate user "${user.name}"?`)) return;

    this.userService.updateUserStatus(user.id, false).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err.error?.message || 'Error updating user status'),
    });
  }

viewUserClaims(user: User) {
    this.selectedUser = user;
    this.showClaimsModal = true;
  }

  hasDirectClaim(perm: string): boolean {
    return false;
  }

  toggleQuickClaim(perm: string) {}

  addUserClaim() {}

  cancelAddClaim() {}

  removeClaim(claim: UserClaim) {}

  hasInheritedClaim(perm: string): boolean {
    return false;
  }

  refreshUserClaims() {}

  selectRoleForPermissions(roleName: string) {
    this.selectedRoleForPermissions = roleName;
    this.hasChanges = false;
    this.pendingPermissionChanges = {};
  }

  hasPermission(perm: string): boolean {
    const role = this.roles.find((r) => r.name === this.selectedRoleForPermissions);
    if (!role) return false;
    return role.claims.some((c) => c.claimValue === perm);
  }

  togglePermission(perm: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.pendingPermissionChanges[perm] = checked;
    this.hasChanges = true;
  }

  savePermissions() {
    const toAdd = Object.entries(this.pendingPermissionChanges)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    const toRemove = Object.entries(this.pendingPermissionChanges)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    const currentPerms = this.roles.find((r) => r.name === this.selectedRoleForPermissions)?.claims.map(c => c.claimValue) || [];
    const finalPerms = [...new Set([...currentPerms.filter(p => !toRemove.includes(p)), ...toAdd])];

    this.roleService.updateRole(this.selectedRoleForPermissions, { permissions: finalPerms }).subscribe({
      next: () => {
        this.hasChanges = false;
        this.pendingPermissionChanges = {};
        this.loadRoles();
      },
      error: () => {},
    });
  }

  resetPermissions() {
    this.pendingPermissionChanges = {};
    this.hasChanges = false;
    this.loadRoles();
  }
}
