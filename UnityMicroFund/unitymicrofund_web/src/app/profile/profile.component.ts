import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Token } from '../core/services/token';

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  occupation: string | null;
  employerName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  monthlyAmount: number;
  joinDate: string | null;
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relation: string | null;
  } | null;
  nominee: {
    name: string | null;
    relation: string | null;
    phone: string | null;
  } | null;
  bankInfo: {
    bankName: string | null;
    accountHolderName: string | null;
    accountNumber: string | null;
    routingNumber: string | null;
    swiftCode: string | null;
  } | null;
  totalContributions: number;
  totalInstallmentsPaid: number;
  currentShareValue: number;
  sharePercentage: number;
  isActive: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  isEditing = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  editForm = {
    name: '',
    phone: '',
    alternatePhone: '',
    address: '',
    occupation: '',
    employerName: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    monthlyAmount: 0,
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
    nominee: {
      name: '',
      relation: '',
      phone: '',
    },
    bankInfo: {
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      routingNumber: '',
      swiftCode: '',
    },
  };

  constructor(
    private http: HttpClient,
    private tokenService: Token,
    private router: Router
  ) {}

  logout() {
    localStorage.clear();
    this.router.navigate(['/auth/login']);
  }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
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
      .get<UserProfile>('http://localhost:5000/api/profile', { headers })
      .subscribe({
        next: (data) => {
          this.profile = data;
          this.populateForm(data);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Profile load error:', err);
          this.errorMessage = 'Failed to load profile';
          this.isLoading = false;
        },
      });
  }

  populateForm(profile: UserProfile) {
    this.editForm = {
      name: profile.name || '',
      phone: profile.phone || '',
      alternatePhone: profile.alternatePhone || '',
      address: profile.address || '',
      occupation: profile.occupation || '',
      employerName: profile.employerName || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '',
      nationality: profile.nationality || '',
      monthlyAmount: profile.monthlyAmount,
      emergencyContact: {
        name: profile.emergencyContact?.name || '',
        phone: profile.emergencyContact?.phone || '',
        relation: profile.emergencyContact?.relation || '',
      },
      nominee: {
        name: profile.nominee?.name || '',
        relation: profile.nominee?.relation || '',
        phone: profile.nominee?.phone || '',
      },
      bankInfo: {
        bankName: profile.bankInfo?.bankName || '',
        accountHolderName: profile.bankInfo?.accountHolderName || '',
        accountNumber: profile.bankInfo?.accountNumber || '',
        routingNumber: profile.bankInfo?.routingNumber || '',
        swiftCode: profile.bankInfo?.swiftCode || '',
      },
    };
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.successMessage = '';
    this.errorMessage = '';
  }

  saveProfile() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

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
      .put<UserProfile>('http://localhost:5000/api/profile', this.editForm, { headers })
      .subscribe({
        next: (data) => {
          this.profile = data;
          this.isEditing = false;
          this.isLoading = false;
          this.successMessage = 'Profile updated successfully';
        },
        error: () => {
          this.errorMessage = 'Failed to update profile';
          this.isLoading = false;
        },
      });
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result as string;
        this.updateProfileImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  updateProfileImage(imageUrl: string) {
    const token = this.tokenService.getToken();
    if (!token) {
      this.errorMessage = 'No token found. Please login.';
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http
      .put(
        'http://localhost:5000/api/profile/image',
        { imageUrl },
        { headers }
      )
      .subscribe({
        next: () => {
          if (this.profile) {
            this.profile.profileImageUrl = imageUrl;
          }
          this.successMessage = 'Profile image updated';
        },
        error: () => {
          this.errorMessage = 'Failed to update profile image';
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
}