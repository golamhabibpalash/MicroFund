import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Token } from '../core/services/token';

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
    private tokenService: Token
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

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http
      .get<Member[]>('http://localhost:5000/api/members', { headers })
      .subscribe({
        next: (data) => {
          this.members = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading members:', err);
          this.errorMessage = 'Failed to load members';
          this.isLoading = false;
        },
      });
  }

  search() {
    if (!this.searchTerm) {
      this.loadMembers();
      return;
    }
    
    this.isLoading = true;
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http
      .get<Member[]>(`http://localhost:5000/api/members?search=${this.searchTerm}`, { headers })
      .subscribe({
        next: (data) => {
          this.members = data;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to search members';
          this.isLoading = false;
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