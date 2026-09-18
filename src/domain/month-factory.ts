import { computeMonth } from "./calculations/compute-month";
import { createStartingPots } from "./starting-pots";
import type { Goal, MonthlySnapshot, OutgoingTransaction } from "./types";

/**
 * @description Returns blank long-term and short-term goals (empty name, zero target/current, no deadline).
 *
 * @returns A pair of unset goals used when creating a new month
 */
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

/**
 * @description Creates a new month snapshot with starter pots, no outgoings, empty goals, and zero salary.
 *
 * @param id - Budget month as YYYY-MM
 * @returns A computed snapshot for that month
 */
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

/**
 * @description Copies a previous month into a new YYYY-MM id and recomputes totals for that month.
 *
 * @param previousMonth - Snapshot to carry forward
 * @param newId - New budget month as YYYY-MM
 * @returns A new snapshot with cloned pots, outgoings, goals, salary, and ratio
 */
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