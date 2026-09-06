import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export type VersionChangeType = 'Feature' | 'Improvement' | 'Fix' | 'Docs' | 'Chore';

export interface AppVersionChange {
  type: VersionChangeType;
  description: string;
}

export interface AppVersion {
  id: string;
  version: string;
  releaseDate: string;
  title: string;
  summary?: string;
  isCurrent: boolean;
  changes: AppVersionChange[];
}

/**
 * Serves the platform's release history from the backend (the single source of
 * truth, table `app_versions`). The history is fetched once and shared; the
 * current version is derived from it so the footer needs only one request.
 */
@Injectable({ providedIn: 'root' })
export class VersioningService {
  private readonly url = '/api/versioning';
  private history$?: Observable<AppVersion[]>;

  constructor(private http: HttpClient) {}

  getHistory(): Observable<AppVersion[]> {
    if (!this.history$) {
      this.history$ = this.http.get<AppVersion[]>(this.url).pipe(
        map((versions) => versions ?? []),
        catchError(() => of<AppVersion[]>([])),
        shareReplay(1),
      );
    }
    return this.history$;
  }

  getCurrent(): Observable<AppVersion | null> {
    return this.getHistory().pipe(
      map((versions) => versions.find((v) => v.isCurrent) ?? versions[0] ?? null),
    );
  }

  /** Drop the cache so the next call re-fetches (e.g. after a deploy). */
  refresh(): void {
    this.history$ = undefined;
  }
}
