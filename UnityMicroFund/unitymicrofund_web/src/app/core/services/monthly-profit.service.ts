import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ProfitDistributionType = 'Monthly' | 'ProjectBased';
export type MonthlyDistributionStatus = 'Draft' | 'Distributed' | 'Paid';
export type MonthlyPaymentStatus = 'NotDistributed' | 'Pending' | 'PartiallyPaid' | 'Paid';
export type MonthlyLineStatus = 'Pending' | 'Paid';

export interface MonthlyProfitLine {
  id: string;
  memberId: string;
  memberName: string;
  investmentId: string;
  investmentName: string;
  investmentAmount: number;
  sharesOwned: number;
  ownershipPercentage?: number | null;
  rate: number;
  /** Monthly: days held in the month (amount-weighted); equals daysInPeriod for a full month. */
  heldDays?: number | null;
  daysInPeriod?: number | null;
  profitAmount: number;
  status: MonthlyLineStatus;
  walletEntryId?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
}

export interface MonthlyProfitPreview {
  type: ProfitDistributionType;
  year: number;
  month: number;
  rate?: number | null;
  periodStart: string;
  periodEnd: string;
  daysInPeriod?: number | null;
  investmentId?: string | null;
  investmentName?: string | null;
  profitDate?: string | null;
  grossProfitAmount?: number | null;
  maintenancePercentage?: number | null;
  maintenanceAmount?: number | null;
  investorProfitPool?: number | null;
  undistributedRemainder?: number | null;
  totalShares?: number | null;
  soldShares?: number | null;
  maintenanceAccountConfigured: boolean;
  totalInvestmentAmount: number;
  totalProfitAmount: number;
  eligibleMemberCount: number;
  lineCount: number;
  lines: MonthlyProfitLine[];
  warnings: string[];
}

export interface MonthlyProfitTransaction {
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

export interface MonthlyProfitDistributionSummary {
  id: string;
  type: ProfitDistributionType;
  year: number;
  month: number;
  rate?: number | null;
  investmentId?: string | null;
  investmentName: string;
  profitDate?: string | null;
  grossProfitAmount?: number | null;
  maintenancePercentage?: number | null;
  maintenanceAmount?: number | null;
  undistributedRemainder?: number | null;
  projectNames: string[];
  projectCount: number;
  notes?: string | null;
  status: MonthlyDistributionStatus;
  paymentStatus: MonthlyPaymentStatus;
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

export interface MonthlyProfitDistribution extends MonthlyProfitDistributionSummary {
  lines: MonthlyProfitLine[];
  transactions: MonthlyProfitTransaction[];
}

/** A project set up for periodic profit (monthly % or project-based amount). */
export interface ProfitEligibleProject {
  id: string;
  name: string;
  status: string;
  profitPayoutMode: 'Monthly' | 'ProjectBased';
  monthlyProfitRate?: number | null;
  totalShares?: number | null;
  soldShares: number;
  totalInvested: number;
  maintenancePercentage: number;
  maintenanceAccountConfigured: boolean;
  dateInvested: string;
  maturityDate?: string | null;
  canDistribute: boolean;
  /** Monthly: the period a new batch should default to (next unpaid month, never in the future). */
  nextYear?: number | null;
  nextMonth?: number | null;
  lastDistributionLabel?: string | null;
  totalDistributed: number;
}

/** Every batch belongs to one project. */
export interface CalculateProfitRequest {
  type: ProfitDistributionType;
  investmentId: string;
  /** Monthly */
  year?: number;
  month?: number;
  /** Monthly: omit to use the project's default monthly rate. */
  rate?: number | null;
  /** ProjectBased */
  profitAmount?: number;
  profitDate?: string;
}

export interface CreateProfitDistributionRequest extends CalculateProfitRequest {
  notes?: string | null;
}

export interface UpdateProfitDistributionRequest {
  rate?: number | null;
  profitAmount?: number | null;
  profitDate?: string | null;
  notes?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MonthlyProfitService {
  private readonly apiUrl = '/api/monthly-profit-distributions';

  constructor(private http: HttpClient) {}

  preview(request: CalculateProfitRequest): Observable<MonthlyProfitPreview> {
    return this.http.post<MonthlyProfitPreview>(`${this.apiUrl}/preview`, request);
  }

  getEligibleProjects(): Observable<ProfitEligibleProject[]> {
    return this.http.get<ProfitEligibleProject[]>(`${this.apiUrl}/eligible-projects`);
  }

  getAll(
    year?: number | null,
    status?: string | null,
    type?: string | null,
  ): Observable<MonthlyProfitDistributionSummary[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (status) params = params.set('status', status);
    if (type) params = params.set('type', type);
    return this.http.get<MonthlyProfitDistributionSummary[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<MonthlyProfitDistribution> {
    return this.http.get<MonthlyProfitDistribution>(`${this.apiUrl}/${id}`);
  }

  create(request: CreateProfitDistributionRequest): Observable<MonthlyProfitDistribution> {
    return this.http.post<MonthlyProfitDistribution>(this.apiUrl, request);
  }

  update(id: string, request: UpdateProfitDistributionRequest): Observable<MonthlyProfitDistribution> {
    return this.http.put<MonthlyProfitDistribution>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  distribute(id: string): Observable<MonthlyProfitDistribution> {
    return this.http.post<MonthlyProfitDistribution>(`${this.apiUrl}/${id}/distribute`, {});
  }

  pay(id: string, lineId?: string | null): Observable<MonthlyProfitDistribution> {
    return this.http.post<MonthlyProfitDistribution>(`${this.apiUrl}/${id}/pay`, {
      lineId: lineId ?? null,
    });
  }
}
