import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  googleClientId: string;
  facebookAppId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config: AppConfig | null = null;

  constructor(private http: HttpClient) {}

  load(): Promise<AppConfig> {
    return firstValueFrom(
      this.http.get<AppConfig>('assets/config/app-config.json')
    ).then(c => {
      this.config = c;
      return c;
    }).catch(() => {
      this.config = { googleClientId: '', facebookAppId: '' };
      return this.config;
    });
  }

  get googleClientId(): string {
    return this.config?.googleClientId ?? '';
  }

  get facebookAppId(): string {
    return this.config?.facebookAppId ?? '';
  }
}
