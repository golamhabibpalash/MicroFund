import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

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
    canActivate: [authGuard],
    loadChildren: () => import('./dashboard/dashboard-module').then((m) => m.DashboardModule),
  },
  {
    path: 'investments',
    canActivate: [authGuard],
    loadChildren: () => import('./investments/investments-module').then((m) => m.InvestmentsModule),
  },
  {
    path: 'investors',
    canActivate: [authGuard],
    loadChildren: () => import('./investors/investors-module').then((m) => m.InvestorsModule),
  },
  {
    path: 'payments',
    canActivate: [authGuard],
    loadChildren: () => import('./payments/payments-module').then((m) => m.PaymentsModule),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadChildren: () => import('./reports/reports-module').then((m) => m.ReportsModule),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () => import('./profile/profile-module').then((m) => m.ProfileModule),
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
