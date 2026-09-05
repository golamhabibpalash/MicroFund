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
  iban?: string;
}

export type AccountEntryDirection = 'Expense' | 'Income';

export interface AccountLedgerEntry {
  id: string;
  accountId: string;
  accountName: string;
  direction: AccountEntryDirection;
  category: string;
  amount: number;
  entryDate: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AccountLedgerRequest {
  accountId: string;
  direction: AccountEntryDirection;
  category: string;
  amount: number;
  entryDate?: string | null;
  notes?: string | null;
}

export interface AccountsSummary {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  totalPoolAmount: number;
  totalInvestmentNetProfit: number;
  totalExpenses: number;
  totalOtherIncome: number;
  availableBalance: number;
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
    return this.http.post<Account>(this.apiUrl, account);
  }

  updateAccount(id: string, account: UpdateAccountRequest): Observable<Account> {
    return this.http.put<Account>(`${this.apiUrl}/${id}`, account);
  }

  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getSummary(): Observable<AccountsSummary> {
    return this.http.get<AccountsSummary>(`${this.apiUrl}/summary`);
  }

  getLedger(filters?: { direction?: AccountEntryDirection; accountId?: string }): Observable<AccountLedgerEntry[]> {
    let params = '';
    if (filters?.direction) params += `${params ? '&' : '?'}direction=${filters.direction}`;
    if (filters?.accountId) params += `${params ? '&' : '?'}accountId=${filters.accountId}`;
    return this.http.get<AccountLedgerEntry[]>(`${this.apiUrl}/ledger${params}`);
  }

  createLedgerEntry(req: AccountLedgerRequest): Observable<AccountLedgerEntry> {
    return this.http.post<AccountLedgerEntry>(`${this.apiUrl}/ledger`, req);
  }

  updateLedgerEntry(id: string, req: AccountLedgerRequest): Observable<AccountLedgerEntry> {
    return this.http.put<AccountLedgerEntry>(`${this.apiUrl}/ledger/${id}`, req);
  }

  deleteLedgerEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ledger/${id}`);
  }
}
