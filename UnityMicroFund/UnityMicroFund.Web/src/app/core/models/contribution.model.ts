export enum ContributionStatus {
  Paid = 'Paid',
  Pending = 'Pending',
  Overdue = 'Overdue'
}

export interface Contribution {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  month: string;
  year: number;
  status: string;
  paidDate?: string;
  createdAt: string;
}

export interface ContributionSummary {
  totalContributions: number;
  totalAmount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  recentContributions: Contribution[];
}

export interface CreateContributionDto {
  memberId: string;
  amount: number;
  month: string;
  year: number;
  status: ContributionStatus;
}
