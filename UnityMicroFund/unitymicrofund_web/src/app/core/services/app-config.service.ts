import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  googleClientId: string;
  facebookAppId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config: AppConfig | null = null;
  private loadPromise: Promise<AppConfig> | null = null;

  constructor(private http: HttpClient) {}

  load(): Promise<AppConfig> {
    if (!this.loadPromise) {
      this.loadPromise = firstValueFrom(
        this.http.get<AppConfig>('assets/config/app-config.json')
      ).then(c => {
        this.config = c;
        return c;
      }).catch(() => {
        this.config = {
          googleClientId: environment.googleClientId,
          facebookAppId: environment.facebookAppId
        };
        return this.config;
      });
    }
    return this.loadPromise;
  }

  get googleClientId(): string {
    return this.config?.googleClientId ?? environment.googleClientId;
  }

  get facebookAppId(): string {
    return this.config?.facebookAppId ?? environment.facebookAppId;
  }
}
