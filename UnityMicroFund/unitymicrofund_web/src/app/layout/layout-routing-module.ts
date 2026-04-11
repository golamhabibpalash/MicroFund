import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserLayoutComponent } from './user-layout.component';
import { AdminLayoutComponent } from './admin-layout.component';
import { UserService } from '../core/services/user';
import { inject } from '@angular/core';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: UserLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('../dashboard/dashboard-module').then((m) => m.DashboardModule),
      },
    ],
  },
  {
    path: 'investments',
    component: UserLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('../investments/investments-module').then((m) => m.InvestmentsModule),
      },
    ],
  },
  {
    path: 'investors',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('../investors/investors-module').then((m) => m.InvestorsModule),
      },
    ],
  },
  {
    path: 'payments',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('../payments/payments-module').then((m) => m.PaymentsModule),
      },
    ],
  },
  {
    path: 'reports',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('../reports/reports-module').then((m) => m.ReportsModule),
      },
    ],
  },
  {
    path: 'profile',
    component: UserLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('../profile/profile-module').then((m) => m.ProfileModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
