import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, AdminGuard, PublicGuard, CompleteProfileGuard } from './core/guards';
import { AdminLayoutComponent } from './layout/admin-layout.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { InvestorsComponent } from './investors/investors.component';
import { ProfileComponent } from './profile/profile.component';
import { WalletComponent } from './wallet/wallet.component';
import { CashOutComponent } from './cashout/cashout.component';
import { PaymentsComponent } from './payments/payments.component';
import { AccountsComponent } from './accounts/accounts.component';
import { ReportsComponent } from './reports/reports.component';
import { InvestmentsComponent } from './investments/investments.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { CompleteProfileComponent } from './auth/complete-profile/complete-profile.component';
import { LogsActivityComponent } from './logs/activity/logs-activity.component';
import { LogsAuditComponent } from './logs/audit/logs-audit.component';
import { BusinessConfigComponent } from './settings/business-config/business-config.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [PublicGuard] },
  { path: 'auth/login', component: LoginComponent, canActivate: [PublicGuard] },
  { path: 'auth/register', component: RegisterComponent, canActivate: [PublicGuard] },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent, canActivate: [PublicGuard] },
  { path: 'complete-profile', component: CompleteProfileComponent, canActivate: [AuthGuard] },
  {
    path: 'dashboard',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, CompleteProfileGuard],
    children: [{ path: '', component: DashboardComponent }],
  },
  {
    path: 'investments',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, CompleteProfileGuard],
    children: [{ path: '', component: InvestmentsComponent }],
  },
  {
    path: 'investors',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, CompleteProfileGuard],
    children: [{ path: '', component: InvestorsComponent }],
  },
  {
    path: 'payments',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, CompleteProfileGuard],
    children: [{ path: '', component: PaymentsComponent }],
  },
  {
    path: 'accounts',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, AdminGuard],
    children: [{ path: '', component: AccountsComponent }],
  },
  {
    path: 'reports',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, CompleteProfileGuard],
    children: [{ path: '', component: ReportsComponent }],
  },
  {
    path: 'wallet',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, CompleteProfileGuard],
    children: [{ path: '', component: WalletComponent }],
  },
  {
    path: 'withdraw',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, CompleteProfileGuard],
    children: [{ path: '', component: CashOutComponent }],
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
  {
    path: 'settings',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, AdminGuard],
    children: [{ path: '', component: BusinessConfigComponent }],
  },
  { path: '**', redirectTo: '/dashboard' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}