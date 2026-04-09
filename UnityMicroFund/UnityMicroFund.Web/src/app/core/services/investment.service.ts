import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Investment, CreateInvestmentDto, InvestmentType } from '../models/investment.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private apiUrl = '/api/investments';
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getInvestments(type?: InvestmentType): Observable<Investment[]> {
    let params: any = {};
    if (type) params['type'] = type;
    return this.http.get<Investment[]>(this.apiUrl, { params, headers: this.getHeaders() });
  }

  getInvestment(id: string): Observable<Investment> {
    return this.http.get<Investment>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createInvestment(investment: CreateInvestmentDto): Observable<Investment> {
    return this.http.post<Investment>(this.apiUrl, investment, { headers: this.getHeaders() });
  }

  updateInvestment(id: string, investment: any): Observable<Investment> {
    return this.http.put<Investment>(`${this.apiUrl}/${id}`, investment, { headers: this.getHeaders() });
  }

  deleteInvestment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
