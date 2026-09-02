import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type InvestmentTypeName = 'Stocks' | 'RealEstate' | 'Business' | 'Savings' | 'Other';

export type InvestmentStatusName =
  | 'Draft'
  | 'OpenForSubscription'
  | 'FullySubscribed'
  | 'Active'
  | 'Completed'
  | 'ProfitDistributed'
  | 'Closed'
  | 'Cancelled';

export const INVESTMENT_TYPES: InvestmentTypeName[] = [
  'Stocks',
  'RealEstate',
  'Business',
  'Savings',
  'Other',
];

export const INVESTMENT_STATUSES: InvestmentStatusName[] = [
  'Draft',
  'OpenForSubscription',
  'FullySubscribed',
  'Active',
  'Completed',
  'ProfitDistributed',
  'Closed',
  'Cancelled',
];

/** Human-readable labels; the API speaks the enum names. */
export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatusName, string> = {
  Draft: 'Draft',
  OpenForSubscription: 'Open for Subscription',
  FullySubscribed: 'Fully Subscribed',
  Active: 'Active',
  Completed: 'Completed',
  ProfitDistributed: 'Profit Distributed',
  Closed: 'Closed',
  Cancelled: 'Cancelled',
};

/** Current holding rollup per member on a project. */
export interface MemberInvestment {
  memberId: string;
  memberName: string;
  sharePercentage: number;
  shareValue: number;
}

export type WalletEntryTypeName =
  | 'Deposit'
  | 'SharePurchase'
  | 'PurchaseRefund'
  | 'PrincipalReturn'
  | 'ProfitCredit'
  | 'Disbursement'
  | 'Withdrawal';

export interface WalletEntry {
  id: string;
  entryType: WalletEntryTypeName;
  /** Signed: credits positive, debits negative. */
  amount: number;
  balanceAfter: number;
  investmentId?: string;
  investmentName?: string;
  description?: string;
  createdAt: string;
}

export interface WalletSummary {
  memberId: string;
  memberName: string;
  memberImageUrl?: string | null;
  memberCode?: string | null;
  email?: string | null;
  phone?: string | null;
  occupation?: string | null;
  joinDate?: string | null;
  isActive?: boolean;
  balance: number;
  totalDeposited: number;
  totalInvested: number;
  totalProfitEarned: number;
  totalDisbursed: number;
  entries: WalletEntry[];
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number;
  entryCount: number;
}

export interface ShareSubscription {
  id: string;
  investmentId: string;
  investmentName: string;
  memberId: string;
  memberName: string;
  sharesPurchased: number;
  sharePriceAtPurchase: number;
  amountPaid: number;
  ownershipPercentage: number;
  status: string;
  purchasedAt: string;
}

export type CashOutStatusName = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface CashOutRequest {
  id: string;
  memberId: string;
  memberName?: string | null;
  memberCode?: string | null;
  memberEmail?: string | null;
  amount: number;
  status: CashOutStatusName;
  remarks?: string | null;
  adminRemarks?: string | null;
  requestedAt: string;
  requestedBy?: string | null;
  actionedAt?: string | null;
  actionedBy?: string | null;
  walletBalanceAtRequest?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashOutBalance {
  balance: number;
  pending: number;
  available: number;
}

export interface ProfitDistributionLine {
  id: string;
  memberId: string;
  memberName: string;
  sharesOwned: number;
  ownershipPercentage: number;
  principalAmount: number;
  profitAmount: number;
  totalPayable: number;
  distributedAt: string;
  disbursedAt?: string | null;
}

export interface ProfitSettlement {
  investmentId: string;
  investmentName: string;
  status: InvestmentStatusName;
  actualGrossProfit: number;
  operationalExpensePercentage: number;
  operationalExpenseAmount: number;
  netProfit: number;
  /** Rounding remainder retained by the organisation. */
  undistributedRemainder: number;
  totalPrincipalReturned: number;
  totalProfitDistributed: number;
  totalPayable: number;
  distributions: ProfitDistributionLine[];
}

export interface InvestmentPartner {
  id?: string;
  /** Set when the partner is an existing fund member; null for external partners. */
  memberId?: string | null;
  partnerName: string;
  nid?: string | null;
  phone1: string;
  phone2?: string | null;
  email?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
  nomineeName?: string | null;
  nomineeRelationship?: string | null;
  nomineeContact?: string | null;
}

export interface InvestmentDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  contentType?: string;
  fileSizeBytes: number;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface Investment {
  id: string;
  name: string;
  description?: string;
  type: string;
  category?: string;
  principalAmount: number;
  currentValue: number;
  returnAmount: number;
  returnPercentage: number;
  totalShares?: number | null;
  sharePrice?: number | null;
  soldShares: number;
  remainingShares: number;
  subscriptionPercentage: number;
  targetGrossProfit?: number | null;
  actualGrossProfit?: number | null;
  operationalExpensePercentage: number;
  operationalExpenseAmount?: number | null;
  netProfit?: number | null;
  undistributedRemainder?: number | null;
  completionDate?: string | null;
  closingNotes?: string | null;
  dateInvested: string;
  maturityDate?: string | null;
  durationMonths?: number | null;
  status: InvestmentStatusName;
  certificateNumber?: string | null;
  referenceNumber?: string | null;
  createdBy?: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt: string;
  members: MemberInvestment[];
  partners: InvestmentPartner[];
  documents: InvestmentDocument[];
}

export interface CreateInvestmentRequest {
  name: string;
  description?: string | null;
  type: InvestmentTypeName;
  category?: string | null;
  principalAmount: number;
  currentValue?: number | null;
  totalShares?: number | null;
  /** Server-derived from value / shares; sent for compatibility but ignored. */
  sharePrice?: number | null;
  targetGrossProfit?: number | null;
  dateInvested: string;
  maturityDate?: string | null;
  durationMonths?: number | null;
  status: InvestmentStatusName;
  certificateNumber?: string | null;
  referenceNumber?: string | null;
  partners?: InvestmentPartner[];
  memberIds?: string[];
}

/** Every field optional — omitted fields are left untouched by the API. */
export type UpdateInvestmentRequest = Partial<Omit<CreateInvestmentRequest, 'memberIds'>>;

@Injectable({
  providedIn: 'root',
})
export class InvestmentService {
  private readonly apiUrl = '/api/investments';

  constructor(private http: HttpClient) {}

  getInvestments(type?: string): Observable<Investment[]> {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.http.get<Investment[]>(`${this.apiUrl}${query}`);
  }

  getInvestment(id: string): Observable<Investment> {
    return this.http.get<Investment>(`${this.apiUrl}/${id}`);
  }

  createInvestment(request: CreateInvestmentRequest): Observable<Investment> {
    return this.http.post<Investment>(this.apiUrl, request);
  }

  updateInvestment(id: string, request: UpdateInvestmentRequest): Observable<Investment> {
    return this.http.put<Investment>(`${this.apiUrl}/${id}`, request);
  }

  deleteInvestment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadDocument(id: string, file: File): Observable<InvestmentDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<InvestmentDocument>(`${this.apiUrl}/${id}/documents`, formData);
  }

  deleteDocument(id: string, documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/documents/${documentId}`);
  }

  // ---- wallet ------------------------------------------------------------

  getMyWallet(): Observable<WalletSummary> {
    return this.http.get<WalletSummary>('/api/wallet/me');
  }

  getMemberWallet(memberId: string): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(`/api/wallet/${memberId}`);
  }

  getAllBalances(): Observable<MemberBalance[]> {
    return this.http.get<MemberBalance[]>('/api/wallet/balances');
  }

  getMySubscriptions(): Observable<ShareSubscription[]> {
    return this.http.get<ShareSubscription[]>('/api/wallet/me/subscriptions');
  }

  // ---- cash-out (withdraw) -------------------------------------------------

  getMyCashOutRequests(): Observable<CashOutRequest[]> {
    return this.http.get<CashOutRequest[]>('/api/cashout/me');
  }

  getCashOutAvailableBalance(): Observable<CashOutBalance> {
    return this.http.get<CashOutBalance>('/api/cashout/me/available');
  }

  createCashOutRequest(amount: number, remarks?: string | null): Observable<CashOutRequest> {
    return this.http.post<CashOutRequest>('/api/cashout', { amount, remarks: remarks ?? null });
  }

  cancelCashOutRequest(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/cashout/${id}/cancel`, {});
  }

  adminGetCashOutRequests(status?: string, search?: string): Observable<CashOutRequest[]> {
    const params: string[] = [];
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.http.get<CashOutRequest[]>(`/api/cashout${query}`);
  }

  adminApproveCashOut(id: string): Observable<CashOutRequest> {
    return this.http.post<CashOutRequest>(`/api/cashout/${id}/approve`, {});
  }

  adminRejectCashOut(id: string, adminRemarks?: string | null): Observable<CashOutRequest> {
    return this.http.post<CashOutRequest>(`/api/cashout/${id}/reject`, { adminRemarks: adminRemarks ?? null });
  }

  // ---- subscription ------------------------------------------------------

  /** memberId is admin-only; omit it to buy for yourself. */
  subscribe(investmentId: string, shares: number, memberId?: string): Observable<ShareSubscription> {
    return this.http.post<ShareSubscription>(`${this.apiUrl}/${investmentId}/subscribe`, {
      shares,
      memberId: memberId ?? null,
    });
  }

  getSubscriptions(investmentId: string): Observable<ShareSubscription[]> {
    return this.http.get<ShareSubscription[]>(`${this.apiUrl}/${investmentId}/subscriptions`);
  }

  // ---- lifecycle ---------------------------------------------------------

  changeStatus(id: string, status: InvestmentStatusName, reason?: string): Observable<Investment> {
    return this.http.post<Investment>(`${this.apiUrl}/${id}/status`, { status, reason: reason ?? null });
  }

  complete(
    id: string,
    payload: { actualGrossProfit: number; completionDate?: string | null; closingNotes?: string | null },
  ): Observable<Investment> {
    return this.http.post<Investment>(`${this.apiUrl}/${id}/complete`, payload);
  }

  distributeProfit(id: string): Observable<ProfitSettlement> {
    return this.http.post<ProfitSettlement>(`${this.apiUrl}/${id}/distribute-profit`, {});
  }

  getSettlement(id: string): Observable<ProfitSettlement> {
    return this.http.get<ProfitSettlement>(`${this.apiUrl}/${id}/settlement`);
  }

  /** Omit memberId to disburse to every investor not yet paid. */
  disburse(id: string, memberId?: string): Observable<ProfitSettlement> {
    return this.http.post<ProfitSettlement>(`${this.apiUrl}/${id}/disburse`, { memberId: memberId ?? null });
  }
}
