import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, AuthGuard } from './core/guards/auth-guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { InvestorsComponent } from './investors/investors.component';
import { ProfileComponent } from './profile/profile.component';
import { PaymentsComponent } from './payments/payments.component';
import { AccountsComponent } from './accounts/accounts.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { LogsActivityComponent } from './logs/activity/logs-activity.component';
import { LogsAuditComponent } from './logs/audit/logs-audit.component';

const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  {
    path: 'dashboard',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [{ path: '', component: DashboardComponent }],
  },
  {
    path: 'investments',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [{ path: '', component: DashboardComponent }],
  },
  {
    path: 'investors',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [{ path: '', component: InvestorsComponent }],
  },
  {
    path: 'payments',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [{ path: '', component: PaymentsComponent }],
  },
  {
    path: 'accounts',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [{ path: '', component: AccountsComponent }],
  },
  {
    path: 'reports',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [{ path: '', component: DashboardComponent }],
  },
  {
    path: 'profile',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [{ path: '', component: ProfileComponent }],
  },
  {
    path: 'logs',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'activity', component: LogsActivityComponent },
      { path: 'audit', component: LogsAuditComponent },
    ],
  },
  { path: '**', redirectTo: '/auth/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
