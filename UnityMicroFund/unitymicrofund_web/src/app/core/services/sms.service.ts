import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

export interface SmsResponse {
  uid: string;
  status: string;
  cost?: number;
}

export interface SmsConfig {
  apiUrl: string;
  senderId: string;
  apiKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class SmsService {
  private readonly defaultConfig: SmsConfig = {
    apiUrl: 'https://app.seasms.com/api/v3',
    senderId: 'UnityMF',
    apiKey: '',
  };

  private config: SmsConfig = this.defaultConfig;

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  private loadConfig(): void {
    const savedConfig = localStorage.getItem('sms_config');
    if (savedConfig) {
      try {
        this.config = { ...this.defaultConfig, ...JSON.parse(savedConfig) };
      } catch {
        this.config = this.defaultConfig;
      }
    }
  }

  configure(config: Partial<SmsConfig>): void {
    this.config = { ...this.defaultConfig, ...config };
    localStorage.setItem('sms_config', JSON.stringify(this.config));
  }

  sendSms(to: string, message: string): Observable<SmsResponse> {
    const formattedNumber = this.formatBangladeshNumber(to);
    
    return this.http.post<SmsResponse>(`${this.config.apiUrl}/sms/send`, {
      recipient: formattedNumber,
      sender_id: this.config.senderId,
      type: 'plain',
      message: message,
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }).pipe(
      tap((response) => {
        console.log('SMS sent successfully:', response);
      }),
      catchError((error) => {
        console.error('SMS send error:', error);
        return throwError(() => error);
      })
    );
  }

  sendOtp(phoneNumber: string): Observable<{ sessionId: string; code: string }> {
    const code = this.generateCode();
    const formattedNumber = this.formatBangladeshNumber(phoneNumber);
    const message = `Your UnityMicroFund verification code is: ${code}. This code will expire in 10 minutes.`;

    return this.sendSms(formattedNumber, message).pipe(
      tap(() => {
        console.log('OTP sent to:', formattedNumber, 'Code:', code);
      }),
      catchError((error) => {
        console.error('OTP send error:', error);
        return throwError(() => error);
      }),
      () => new Observable<{ sessionId: string; code: string }>((subscriber) => {
        subscriber.next({
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          code: code,
        });
        subscriber.complete();
      })
    );
  }

  private formatBangladeshNumber(phone: string): string {
    let number = phone.replace(/[\s\-\(\)]/g, '');
    
    if (number.startsWith('+880')) {
      number = number.substring(4);
    } else if (number.startsWith('880')) {
      number = number.substring(3);
    } else if (number.startsWith('0')) {
      number = number.substring(1);
    }
    
    if (!number.startsWith('880')) {
      number = '880' + number;
    }
    
    return number;
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }
}