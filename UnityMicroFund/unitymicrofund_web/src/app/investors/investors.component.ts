import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Token } from '../core/services/token';
import { ChangeDetectorRef } from '@angular/core';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  monthlyAmount: number;
  joinDate: string;
  isActive: boolean;
  totalContributions: number;
  totalInstallmentsPaid: number;
  currentShareValue: number;
  sharePercentage: number;
}

@Component({
  selector: 'app-investors',
  templateUrl: './investors.component.html',
  styleUrls: ['./investors.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
})
export class InvestorsComponent implements OnInit {
  members: Member[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.isLoading = true;
    const token = this.tokenService.getToken();
    if (!token) {
      this.errorMessage = 'No token found. Please login.';
      this.isLoading = false;
      return;
    }

    this.http
      .get<Member[]>('/api/members')
      .subscribe({
        next: (data) => {
          this.members = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading members:', err);
          this.errorMessage = 'Failed to load members';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  search() {
    if (!this.searchTerm) {
      this.loadMembers();
      return;
    }
    
    this.isLoading = true;

    this.http
      .get<Member[]>(`/api/members?search=${this.searchTerm}`)
      .subscribe({
        next: (data) => {
          this.members = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to search members';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  logout() {
    localStorage.clear();
    window.location.href = '/auth/login';
  }
}