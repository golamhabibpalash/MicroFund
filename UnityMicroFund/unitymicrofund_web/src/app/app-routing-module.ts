import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, AdminGuard } from './core/guards';
import { AdminLayoutComponent } from './layout/admin-layout.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { InvestorsComponent } from './investors/investors.component';
import { ProfileComponent } from './profile/profile.component';
import { PaymentsComponent } from './payments/payments.component';
import { AccountsComponent } from './accounts/accounts.component';
import { ReportsComponent } from './reports/reports.component';
import { InvestmentsComponent } from './investments/investments.component';
import { UserManagementComponent } from './user-management/user-management.component';
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
    children: [{ path: '', component: InvestmentsComponent }],
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
    canActivate: [AuthGuard],
    children: [{ path: '', component: AccountsComponent }],
  },
  {
    path: 'reports',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [{ path: '', component: ReportsComponent }],
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
  {
    path: 'users',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, AdminGuard],
    children: [{ path: '', component: UserManagementComponent }],
  },
  { path: '**', redirectTo: '/auth/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
