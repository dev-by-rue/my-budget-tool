export type PotCategory = 'standard' | 'short-term' | 'long-term';
export type StorageAdapaterName = 'browser' | 'memoery' | 'postgres';

export interface LongShortRatio {
  long: number;
  short: number;
}

export interface Pot { 
  id: string;
  name: string;
  sortOrder: number;
  system: boolean;
  category: PotCategory;
}

export interface OutgoingTransaction {
  id: string;
  potId: string;
  amount: number;
  name: string;
}

export interface Goal {
  category: 'long-term' | 'short-term';
  name: string;
  target: number;
  current: number;
  deadline: string;
}

export interface ComputedMonth {
  potTotals: Record<string, number>;
  allocatedLongTerm: number;
  allocatedShortTerm: number;
  requiredShortTerm: number;
  requiredLongTerm: number;
  discretionaryFund: number;
  underfundedLongTerm: number;
  underfundedShortTerm: number;
  deadlinePassedLongTerm: number;
  deadlinePassedShortTerm: number;
}

export interface MonthlySnapshot {
  id: string;
  salary: number;
  pots: Pot[];
  outgoingTransactions: OutgoingTransaction[];
  goals: { longTerm: Goal; shortTerm: Goal };
  computedMonth: ComputedMonth;
  longShortRatio: LongShortRatio;
}

export interface Settings {
  longShortRatio: LongShortRatio;
  activeAdapter: StorageAdapaterName;
  persistToStorage: boolean;
}
