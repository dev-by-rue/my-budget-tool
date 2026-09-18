import { computeMonth } from "./calculations/compute-month";
import { createStartingPots } from "./starting-pots";
import type { Goal, MonthlySnapshot, OutgoingTransaction } from "./types";

export const emptyGoals = (): { longTerm: Goal; shortTerm: Goal } => ({
  longTerm: {
    category: 'long-term',
    name: '',
    target: 0,
    current: 0,
    deadline: '',
  },
  shortTerm: {
    category: 'short-term',
    name: '',
    target: 0,
    current: 0,
    deadline: '',
  },
});

export const createEmptyMonth = (id: string): MonthlySnapshot => {
  const pots = createStartingPots();
  const outgoingTransactions: OutgoingTransaction[] = [];
  const goals = emptyGoals();

  const computedMonth = computeMonth({
    budgetMonth: '2026-09',
    salary: 0,
    pots,
    outgoingTransactions,
    savingsGoals: goals,
    longShortRatio: { long: 50, short: 50 },
  });
  
  const longShortRatio = { long: 60, short: 40 };
  const salary = 0;

  return {
    id,
    salary,
    pots,
    outgoingTransactions,
    goals,
    longShortRatio,
    computedMonth,
  };
}

export const cloneMonth = (previousMonth: MonthlySnapshot, newId: string): MonthlySnapshot => {
  const pots = previousMonth.pots.map(pot => ({ ...pot }));
  const outgoingTransactions = previousMonth.outgoingTransactions.map(outgoing => ({ ...outgoing }));
  const goals = {
    longTerm: { ...previousMonth.goals.longTerm },
    shortTerm: { ...previousMonth.goals.shortTerm },
  };

  const computedMonth = computeMonth({
    budgetMonth: newId,
    salary: previousMonth.salary,
    pots,
    outgoingTransactions,
    savingsGoals: goals,
    longShortRatio: previousMonth.longShortRatio,
  });

  return {
    id: newId,
    salary: previousMonth.salary,
    pots,
    outgoingTransactions,
    goals,
    longShortRatio: previousMonth.longShortRatio,
    computedMonth,
  };
}