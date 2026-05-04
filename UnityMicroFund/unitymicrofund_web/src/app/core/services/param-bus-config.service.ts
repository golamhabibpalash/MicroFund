import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ParamBusConfig {
  id: string;
  name: string;
  value: string;
  description?: string;
  status: boolean;
  lastModifiedDate: string;
  lastModifiedBy?: string;
  lastModifiedColumn?: string;
}

export interface CreateParamBusConfig {
  name: string;
  value: string;
  description?: string;
  status: boolean;
}

export interface UpdateParamBusConfig {
  value: string;
  description?: string;
  status: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ParamBusConfigService {
  private readonly apiUrl = `${environment.apiUrl}/paramBusConfig`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParamBusConfig[]> {
    console.log('Calling API:', this.apiUrl);
    return this.http.get<ParamBusConfig[]>(this.apiUrl);
  }

  getActive(): Observable<ParamBusConfig[]> {
    return this.http.get<ParamBusConfig[]>(`${this.apiUrl}/active`);
  }

  getById(id: string): Observable<ParamBusConfig> {
    return this.http.get<ParamBusConfig>(`${this.apiUrl}/${id}`);
  }

  getByName(name: string): Observable<ParamBusConfig> {
    return this.http.get<ParamBusConfig>(`${this.apiUrl}/name/${name}`);
  }

  create(config: CreateParamBusConfig): Observable<ParamBusConfig> {
    return this.http.post<ParamBusConfig>(this.apiUrl, config);
  }

  update(id: string, config: UpdateParamBusConfig): Observable<ParamBusConfig> {
    return this.http.put<ParamBusConfig>(`${this.apiUrl}/${id}`, config);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleStatus(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/toggle`, {});
  }
}