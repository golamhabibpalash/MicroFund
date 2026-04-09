import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  { 
    path: 'register', 
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [publicGuard]
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'profile', 
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'members', 
    loadComponent: () => import('./components/members/members.component').then(m => m.MembersComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'members/new', 
    loadComponent: () => import('./components/member-form/member-form.component').then(m => m.MemberFormComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'members/:id', 
    loadComponent: () => import('./components/member-detail/member-detail.component').then(m => m.MemberDetailComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'investments', 
    loadComponent: () => import('./components/investments/investments.component').then(m => m.InvestmentsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'investments/new', 
    loadComponent: () => import('./components/investment-form/investment-form.component').then(m => m.InvestmentFormComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'investments/:id', 
    loadComponent: () => import('./components/investment-detail/investment-detail.component').then(m => m.InvestmentDetailComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'contributions', 
    loadComponent: () => import('./components/contributions/contributions.component').then(m => m.ContributionsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'user-management', 
    loadComponent: () => import('./components/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'claims-management', 
    loadComponent: () => import('./components/claims-management/claims-management.component').then(m => m.ClaimsManagementComponent),
    canActivate: [authGuard]
  }
];
