import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Monthly: one calendar month. ProjectBased: everything recorded up to a chosen date. */
export type ProfitDistributionType = 'Monthly' | 'ProjectBased';
/** Draft exists only on distributions created before profit was processed from project books. */
export type ProfitDistributionStatus = 'Draft' | 'Distributed' | 'Paid';
export type ProfitPaymentStatus = 'NotDistributed' | 'Pending' | 'PartiallyPaid' | 'Paid';
export type ProfitLineStatus = 'Pending' | 'Paid';

export interface ProfitLine {
  id: string;
  memberId: string;
  memberName: string;
  investmentId: string;
  investmentName: string;
  investmentAmount: number;
  sharesOwned: number;
  ownershipPercentage?: number | null;
  profitAmount: number;
  status: ProfitLineStatus;
  walletEntryId?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
}

/** An income or expense entry recorded on the project. */
export interface ProfitLedgerEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface ProfitPreview {
  type: ProfitDistributionType;
  investmentId: string;
  investmentName: string;
  year: number;
  month: number;
  periodEnd: string;
  incomeAmount: number;
  expenseAmount: number;
  netProfitAmount: number;
  maintenancePercentage: number;
  maintenanceAmount: number;
  investorProfitPool: number;
  undistributedRemainder: number;
  totalShares: number;
  soldShares: number;
  maintenanceAccountConfigured: boolean;
  totalInvestmentAmount: number;
  totalProfitAmount: number;
  eligibleMemberCount: number;
  lineCount: number;
  /** False when there is nothing to distribute; `message` says why. */
  canProcess: boolean;
  message?: string | null;
  incomeEntries: ProfitLedgerEntry[];
  expenseEntries: ProfitLedgerEntry[];
  lines: ProfitLine[];
  warnings: string[];
}

export interface ProfitTransaction {
  lineId: string;
  walletEntryId: string;
  memberId: string;
  memberName: string;
  investmentName: string;
  amount: number;
  description?: string | null;
  paidAt: string;
  paidBy?: string | null;
}

export interface ProfitDistributionSummary {
  id: string;
  type: ProfitDistributionType;
  investmentId?: string | null;
  investmentName: string;
  projectNames: string[];
  projectCount: number;
  year: number;
  month: number;
  periodEnd?: string | null;
  incomeAmount: number;
  expenseAmount: number;
  netProfitAmount?: number | null;
  maintenancePercentage?: number | null;
  maintenanceAmount?: number | null;
  undistributedRemainder?: number | null;
  notes?: string | null;
  status: ProfitDistributionStatus;
  paymentStatus: ProfitPaymentStatus;
  totalInvestmentAmount: number;
  totalProfitAmount: number;
  totalPaidAmount: number;
  pendingAmount: number;
  eligibleMemberCount: number;
  lineCount: number;
  paidLineCount: number;
  pendingLineCount: number;
  calculatedBy?: string | null;
  calculatedAt: string;
  distributedBy?: string | null;
  distributedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitDistribution extends ProfitDistributionSummary {
  lines: ProfitLine[];
  transactions: ProfitTransaction[];
  incomeEntries: ProfitLedgerEntry[];
  expenseEntries: ProfitLedgerEntry[];
}

/** A project on a periodic payout. */
export interface ProfitEligibleProject {
  id: string;
  name: string;
  status: string;
  profitPayoutMode: ProfitDistributionType;
  totalShares?: number | null;
  soldShares: number;
  totalInvested: number;
  maintenancePercentage: number;
  maintenanceAccountConfigured: boolean;
  dateInvested: string;
  canDistribute: boolean;
  /** Income and expenses recorded but not yet distributed. */
  pendingIncome: number;
  pendingExpense: number;
  /** Monthly: the month a new distribution should default to. */
  nextYear?: number | null;
  nextMonth?: number | null;
  lastDistributionLabel?: string | null;
  totalDistributed: number;
}

/** Monthly projects use year + month; project-based projects use periodEnd ("up to"). */
export interface ProcessProfitRequest {
  investmentId: string;
  year?: number;
  month?: number;
  periodEnd?: string;
  notes?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MonthlyProfitService {
  private readonly apiUrl = '/api/monthly-profit-distributions';

  constructor(private http: HttpClient) {}

  preview(request: ProcessProfitRequest): Observable<ProfitPreview> {
    return this.http.post<ProfitPreview>(`${this.apiUrl}/preview`, request);
  }

  getEligibleProjects(): Observable<ProfitEligibleProject[]> {
    return this.http.get<ProfitEligibleProject[]>(`${this.apiUrl}/eligible-projects`);
  }

  getAll(
    year?: number | null,
    status?: string | null,
    type?: string | null,
  ): Observable<ProfitDistributionSummary[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (status) params = params.set('status', status);
    if (type) params = params.set('type', type);
    return this.http.get<ProfitDistributionSummary[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<ProfitDistribution> {
    return this.http.get<ProfitDistribution>(`${this.apiUrl}/${id}`);
  }

  /** Locks the period's income/expenses, posts maintenance and creates the investor lines. */
  process(request: ProcessProfitRequest): Observable<ProfitDistribution> {
    return this.http.post<ProfitDistribution>(this.apiUrl, request);
  }

  /** Undoes a processed distribution that has no disbursements yet. */
  cancel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Credits one investor (lineId) or every pending investor. */
  disburse(id: string, lineId?: string | null): Observable<ProfitDistribution> {
    return this.http.post<ProfitDistribution>(`${this.apiUrl}/${id}/pay`, { lineId: lineId ?? null });
  }
}
