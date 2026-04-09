export enum InvestmentType {
  Stocks = 'Stocks',
  RealEstate = 'RealEstate',
  Business = 'Business',
  Savings = 'Savings',
  Other = 'Other'
}

export interface MemberInvestment {
  memberId: string;
  memberName: string;
  sharePercentage: number;
  shareValue: number;
}

export interface Investment {
  id: string;
  name: string;
  description?: string;
  type: string;
  principalAmount: number;
  currentValue: number;
  returnAmount: number;
  returnPercentage: number;
  dateInvested: string;
  createdAt: string;
  members: MemberInvestment[];
}

export interface CreateInvestmentDto {
  name: string;
  description?: string;
  type: InvestmentType;
  principalAmount: number;
  currentValue: number;
  dateInvested: Date;
  memberIds?: string[];
}
