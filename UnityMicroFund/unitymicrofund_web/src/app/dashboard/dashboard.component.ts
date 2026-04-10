import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Token } from '../core/services/token';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class DashboardComponent implements OnInit {
  userEmail: string = '';

  stats = [
    { label: 'Total Investments', value: '$125,000', icon: 'trending_up', color: '#667eea' },
    { label: 'Active Investors', value: '45', icon: 'people', color: '#27ae60' },
    { label: 'Total Payments', value: '$89,500', icon: 'payments', color: '#f39c12' },
    { label: 'Monthly Revenue', value: '$12,500', icon: 'account_balance', color: '#e74c3c' },
  ];

  recentTransactions = [
    { id: 1, type: 'Investment', amount: '$5,000', date: '2026-04-09', status: 'Completed' },
    { id: 2, type: 'Payment', amount: '$1,200', date: '2026-04-08', status: 'Completed' },
    { id: 3, type: 'Investment', amount: '$3,500', date: '2026-04-07', status: 'Pending' },
    { id: 4, type: 'Withdrawal', amount: '$800', date: '2026-04-06', status: 'Completed' },
  ];

  constructor(
    private tokenService: Token,
    private router: Router,
  ) {}

  ngOnInit() {
    const user = this.tokenService.getUserEmail();
    this.userEmail = user || 'User';
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/auth/login']);
  }
}
