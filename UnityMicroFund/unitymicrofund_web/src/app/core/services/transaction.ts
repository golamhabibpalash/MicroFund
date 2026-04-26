import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OcrScanResult {
  rawText: string;
  amount: number;
  transactionId: string;
  transactionDate: string;
  transferTo: string;
  transferFrom: string;
  remarks: string;
  extractedLines: string[];
  success: boolean;
  errorMessage: string;
}

export interface Account {
  id: string;
  name: string;
  description?: string;
  accountType: string;
  balance: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  totalFunded: number;
  totalRefunded: number;
  transactionCount: number;
}

export interface Transaction {
  id: string;
  transactionId: string;
  transferFrom: string;
  transferTo: string;
  amount: number;
  status: 'Fund' | 'Refund';
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  transferById: string;
  transferByName: string;
  createdById: string;
  createdByName: string;
  accountId: string;
  accountName: string;
  createdAt: string;
  updatedAt: string;
  receiptUrl?: string;
  receiptType?: string;
  transactionDate?: string;
}

export interface CreateTransactionRequest {
  transferTo: string;
  amount: number;
  status: 'Fund' | 'Refund';
  remarks?: string;
  accountId: string;
  receiptType?: string;
  transactionId?: string;
  transferFrom?: string;
  transactionDate?: string;
}

export interface ReceiptType {
  id: string;
  name: string;
  icon: string;
}

export interface TransactionFilter {
  search?: string;
  accountId?: string;
  status?: string;
  approvalStatus?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly apiUrl = '/api/transactions';
  private readonly accountsUrl = '/api/accounts';

  constructor(private http: HttpClient) {}

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.accountsUrl);
  }

  getTransactions(filter?: TransactionFilter): Observable<Transaction[]> {
    const params = this.buildQueryParams(filter);
    return this.http.get<Transaction[]>(this.apiUrl, { params });
  }

  getTransaction(id: string): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/${id}`);
  }

  createTransaction(transaction: CreateTransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(this.apiUrl, transaction);
  }

  approveTransaction(id: string, isApproved: boolean, remarks?: string): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/${id}/approve`, {
      isApproved,
      remarks,
    });
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getReceiptTypes(): Observable<ReceiptType[]> {
    return this.http.get<ReceiptType[]>(`${this.apiUrl}/receipt-types`);
  }

  uploadReceipt(transactionId: string, file: File): Observable<{ receiptUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ receiptUrl: string }>(`${this.apiUrl}/${transactionId}/receipt`, formData);
  }

  scanReceipt(file: File, receiptType: string): Observable<OcrScanResult> {
    console.log('TransactionService.scanReceipt called:', file.name, receiptType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiptType', receiptType);
    return this.http.post<OcrScanResult>('/api/ocr/scan', formData);
  }

  private buildQueryParams(filter?: TransactionFilter): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    if (!filter) return params;
    
    if (filter.search) params['search'] = filter.search;
    if (filter.accountId) params['accountId'] = filter.accountId;
    if (filter.status) params['status'] = filter.status;
    if (filter.approvalStatus) params['approvalStatus'] = filter.approvalStatus;
    if (filter.fromDate) params['fromDate'] = filter.fromDate;
    if (filter.toDate) params['toDate'] = filter.toDate;
    
    return params;
  }
}
