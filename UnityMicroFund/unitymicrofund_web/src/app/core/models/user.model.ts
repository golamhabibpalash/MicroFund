export type UserRole = 'Admin' | 'Manager' | 'Member' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  claims: string[];
}

export interface UserDetail extends User {
  directClaims: UserClaim[];
  inheritedClaims: string[];
}

export interface UserClaim {
  id: string;
  userId: string;
  userName?: string;
  claimType: string;
  claimValue: string;
  description?: string;
  createdAt: string;
}

export interface CreateUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUser {
  name?: string;
  email?: string;
  isActive?: boolean;
}

export interface AssignRole {
  role: UserRole;
}

export interface BulkAssignRole {
  userIds: string[];
  role: UserRole;
}

export interface CreateUserClaim {
  userId: string;
  claimType: string;
  claimValue: string;
  description?: string;
}
