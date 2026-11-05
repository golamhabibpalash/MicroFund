import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export interface Account {
  id: string;
  name: string;
  description?: string;
  accountType: string;
  code?: string | null;
  category: AccountCategory;
  normalBalance: 'Debit' | 'Credit';
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
  category?: AccountCategory;
  code?: string;
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
  category?: AccountCategory;
  code?: string;
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
  totalAssetBalance: number;
  totalLiabilityBalance: number;
  totalEquityBalance: number;
  totalIncomeBalance: number;
  totalExpenseBalance: number;
}

export interface StatementLine {
  label: string;
  code?: string | null;
  amount: number;
  detail?: string | null;
}

export interface BalanceSheet {
  asOf: string;
  assets: StatementLine[];
  totalAssets: number;
  liabilities: StatementLine[];
  totalLiabilities: number;
  equity: StatementLine[];
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  investmentsUnderManagement: number;
  note: string;
}

export interface IncomeStatement {
  from: string;
  to: string;
  income: StatementLine[];
  totalIncome: number;
  expenses: StatementLine[];
  totalExpenses: number;
  netIncome: number;
  note: string;
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

  getBalanceSheet(): Observable<BalanceSheet> {
    return this.http.get<BalanceSheet>(`${this.apiUrl}/balance-sheet`);
  }

  getIncomeStatement(from?: string, to?: string): Observable<IncomeStatement> {
    let params = '';
    if (from) params += `${params ? '&' : '?'}from=${from}`;
    if (to) params += `${params ? '&' : '?'}to=${to}`;
    return this.http.get<IncomeStatement>(`${this.apiUrl}/income-statement${params}`);
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
