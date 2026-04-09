export interface DashboardStats {
  totalPoolAmount: number;
  totalMembersCount: number;
  monthlyContributionTotal: number;
  activeInvestmentsCount: number;
  totalReturns: number;
  returnPercentage: number;
  pendingContributions: number;
  averageContribution: number;
  totalInvested: number;
  contributionsThisMonth: number;
  recentActivities: RecentActivity[];
  topInvestors: TopInvestor[];
  monthlyTrend: MonthlyTrend;
}

export interface RecentActivity {
  type: string;
  description: string;
  memberName: string;
  amount: number;
  date: Date;
}

export interface TopInvestor {
  memberName: string;
  totalContributions: number;
  sharePercentage: number;
}

export interface MonthlyTrend {
  labels: string[];
  contributions: number[];
  investments: number[];
  returns: number[];
}
