import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contribution, ContributionSummary, CreateContributionDto, ContributionStatus } from '../models/contribution.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ContributionService {
  private apiUrl = '/api/contributions';
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getContributions(params?: {
    memberId?: string;
    year?: number;
    month?: string;
    status?: ContributionStatus;
  }): Observable<ContributionSummary> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.memberId) httpParams = httpParams.set('memberId', params.memberId);
      if (params.year) httpParams = httpParams.set('year', params.year.toString());
      if (params.month) httpParams = httpParams.set('month', params.month);
      if (params.status) httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<ContributionSummary>(this.apiUrl, { params: httpParams, headers: this.getHeaders() });
  }

  getContribution(id: string): Observable<Contribution> {
    return this.http.get<Contribution>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createContribution(contribution: CreateContributionDto): Observable<Contribution> {
    return this.http.post<Contribution>(this.apiUrl, contribution, { headers: this.getHeaders() });
  }

  updateContributionStatus(id: string, status: ContributionStatus): Observable<Contribution> {
    return this.http.put<Contribution>(`${this.apiUrl}/${id}/status`, { status }, { headers: this.getHeaders() });
  }

  deleteContribution(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  generateMonthlyContributions(year?: number, month?: string): Observable<ContributionSummary> {
    let params: any = {};
    if (year) params['year'] = year;
    if (month) params['month'] = month;
    return this.http.post<ContributionSummary>(`${this.apiUrl}/generate-monthly`, null, { params, headers: this.getHeaders() });
  }
}
