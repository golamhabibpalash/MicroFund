export type UserRole = 'Admin' | 'Manager' | 'Member' | 'Viewer';

export interface Role {
  name: string;
  description: string;
  userCount: number;
  claims: RoleClaim[];
  createdAt: string;
}

export interface RoleClaim {
  id: string;
  role: string;
  claimType: string;
  claimValue: string;
  description?: string;
}

export interface CreateRole {
  name: string;
  description: string;
  permissions?: string[];
}

export interface UpdateRole {
  description?: string;
  permissions?: string[];
}

export interface CreateRoleClaim {
  role: string;
  claimType: string;
  claimValue: string;
  description?: string;
}

export interface ClaimPermissions {
  role: string;
  claims: RoleClaim[];
  availableClaims: string[];
}

export interface PermissionCategory {
  category: string;
  icon: string;
  permissions: Permission[];
}

export interface Permission {
  key: string;
  name: string;
  description: string;
  isAssigned: boolean;
}

export interface RolePermissionsMatrix {
  roles: string[];
  permissions: string[];
  rolePermissions: { [role: string]: string[] };
}

export const ALL_PERMISSIONS = [
  'dashboard.view',
  'dashboard.export',
  'members.view',
  'members.create',
  'members.edit',
  'members.delete',
  'contributions.view',
  'contributions.create',
  'contributions.edit',
  'contributions.delete',
  'contributions.approve',
  'investments.view',
  'investments.create',
  'investments.edit',
  'investments.delete',
  'accounts.view',
  'accounts.create',
  'accounts.edit',
  'accounts.delete',
  'accounts.transfer',
  'reports.view',
  'reports.export',
  'reports.create',
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'users.manage_roles',
  'settings.view',
  'settings.manage',
];

export const PERMISSION_CATEGORIES = [
  {
    category: 'Dashboard',
    icon: 'dashboard',
    permissions: ['dashboard.view', 'dashboard.export'],
  },
  {
    category: 'Members',
    icon: 'people',
    permissions: ['members.view', 'members.create', 'members.edit', 'members.delete'],
  },
  {
    category: 'Contributions',
    icon: 'payments',
    permissions: ['contributions.view', 'contributions.create', 'contributions.edit', 'contributions.delete', 'contributions.approve'],
  },
  {
    category: 'Investments',
    icon: 'trending_up',
    permissions: ['investments.view', 'investments.create', 'investments.edit', 'investments.delete'],
  },
  {
    category: 'Accounts',
    icon: 'account_balance',
    permissions: ['accounts.view', 'accounts.create', 'accounts.edit', 'accounts.delete', 'accounts.transfer'],
  },
  {
    category: 'Reports',
    icon: 'assessment',
    permissions: ['reports.view', 'reports.export', 'reports.create'],
  },
  {
    category: 'Users & Roles',
    icon: 'admin_panel_settings',
    permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles'],
  },
  {
    category: 'Settings',
    icon: 'settings',
    permissions: ['settings.view', 'settings.manage'],
  },
];

export const ROLE_DESCRIPTIONS: { [key: string]: string } = {
  Admin: 'Full system access with all permissions',
  Manager: 'Can manage members, contributions, and investments',
  Member: 'Can view and manage own data',
  Viewer: 'Read-only access to the system',
};

export const PERMISSION_DESCRIPTIONS: { [key: string]: string } = {
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
