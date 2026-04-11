import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { UserLayoutComponent } from './layout/user-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth-module').then((m) => m.AuthModule),
  },
  {
    path: 'dashboard',
    component: UserLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./dashboard/dashboard-module').then((m) => m.DashboardModule),
      },
    ],
  },
  {
    path: 'investments',
    component: UserLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./investments/investments-module').then((m) => m.InvestmentsModule),
      },
    ],
  },
  {
    path: 'investors',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./investors/investors-module').then((m) => m.InvestorsModule),
      },
    ],
  },
  {
    path: 'payments',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./payments/payments-module').then((m) => m.PaymentsModule),
      },
    ],
  },
  {
    path: 'reports',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./reports/reports-module').then((m) => m.ReportsModule),
      },
    ],
  },
  {
    path: 'profile',
    component: UserLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./profile/profile-module').then((m) => m.ProfileModule),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
