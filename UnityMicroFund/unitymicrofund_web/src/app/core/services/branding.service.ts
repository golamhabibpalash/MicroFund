import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Branding {
  companyName: string;
  logoUrl: string;
}

/**
 * Provides the configurable company branding (name + logo) sourced from the
 * ParamBusConfig table. The result is cached and shared across all subscribers
 * (sidebar, login, auth pages) so it is fetched once. Call refresh() after a
 * logo/name change to force a re-fetch.
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly url = `${environment.apiUrl}/paramBusConfig`;

  readonly defaultName = 'Unity MicroFund';
  readonly defaultLogo = 'assets/organization/logo.png';

  private branding$?: Observable<Branding>;

  constructor(private http: HttpClient) {}

  getBranding(): Observable<Branding> {
    if (!this.branding$) {
      this.branding$ = this.http.get<Branding>(`${this.url}/branding`).pipe(
        map((b) => ({
          companyName: b?.companyName || this.defaultName,
          logoUrl: b?.logoUrl || this.defaultLogo,
        })),
        catchError(() => of({ companyName: this.defaultName, logoUrl: this.defaultLogo })),
        shareReplay(1)
      );
    }
    return this.branding$;
  }

  uploadLogo(file: File): Observable<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ logoUrl: string }>(`${this.url}/logo`, formData);
  }

  /** Clears the cache so the next getBranding() re-fetches from the server. */
  refresh(): void {
    this.branding$ = undefined;
  }
}
