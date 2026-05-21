import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LogEntry, LogFilter, PagedResult, LogStats,
  ActivityLog, AuditLog
} from '../models/log.model';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly logsUrl = `${environment.apiUrl}/logs`;
  private readonly activityUrl = `${environment.apiUrl}/activity-logs`;
  private readonly auditUrl = `${environment.apiUrl}/audit-logs`;

  constructor(private http: HttpClient) {}

  getLogs(filter: LogFilter): Observable<PagedResult<LogEntry>> {
    const params = this.buildParams(filter as unknown as Record<string, unknown>);
    return this.http.get<PagedResult<LogEntry>>(this.logsUrl, { params });
  }

  getLog(id: string): Observable<LogEntry> {
    return this.http.get<LogEntry>(`${this.logsUrl}/${id}`);
  }

  getStats(days = 7): Observable<LogStats> {
    return this.http.get<LogStats>(`${this.logsUrl}/stats`, { params: { days: days.toString() } });
  }

  getExportUrl(filter: LogFilter): string {
    const params = this.buildParams(filter as unknown as Record<string, unknown>);
    return `${this.logsUrl}/export?${params.toString()}`;
  }

  getActivityLogs(filter: Partial<LogFilter>): Observable<PagedResult<ActivityLog>> {
    const params = this.buildParams(filter as unknown as Record<string, unknown>);
    return this.http.get<PagedResult<ActivityLog>>(this.activityUrl, { params });
  }

  getAuditLogs(filter: Record<string, unknown>): Observable<PagedResult<AuditLog>> {
    const params = this.buildParams(filter);
    return this.http.get<PagedResult<AuditLog>>(this.auditUrl, { params });
  }

  private buildParams(obj: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [key, val] of Object.entries(obj)) {
      if (val !== null && val !== undefined && val !== '') {
        params = params.set(key, String(val));
      }
    }
    return params;
  }
}
