import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Account {
  id: string;
  name: string;
  description?: string;
  accountType: string;
  balance: number;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  branchName?: string;
  branchAddress?: string;
  bankPhone?: string;
  bankEmail?: string;
  iban?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  totalFunded: number;
  totalRefunded: number;
  transactionCount: number;
}

export interface CreateAccountRequest {
  name: string;
  description?: string;
  accountType: string;
  initialBalance?: number;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  branchName?: string;
  branchAddress?: string;
  bankPhone?: string;
  bankEmail?: string;
  iban?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  description?: string;
  accountType?: string;
  isActive?: boolean;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  branchName?: string;
  branchAddress?: string;
  bankPhone?: string;
  bankEmail?: string;
  iban?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly apiUrl = '/api/accounts';

  constructor(private http: HttpClient) {}

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.apiUrl);
  }

  getAccount(id: string): Observable<Account> {
    return this.http.get<Account>(`${this.apiUrl}/${id}`);
  }

  createAccount(account: CreateAccountRequest): Observable<Account> {
    console.log('Creating account with data:', JSON.stringify(account, null, 2));
    return this.http.post<Account>(this.apiUrl, account);
  }

  updateAccount(id: string, account: UpdateAccountRequest): Observable<Account> {
    return this.http.put<Account>(`${this.apiUrl}/${id}`, account);
  }

  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
