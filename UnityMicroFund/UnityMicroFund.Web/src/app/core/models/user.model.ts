export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  claims: string[];
}

export interface RoleClaim {
  id: string;
  role: string;
  claimType: string;
  claimValue: string;
  description?: string;
}

export interface UserClaim {
  id: string;
  userId: string;
  userName: string;
  claimType: string;
  claimValue: string;
  description?: string;
}

export interface ClaimPermissions {
  role: string;
  claims: RoleClaim[];
  availableClaims: string[];
}
