import type { ComputedMonth, LongShortRatio, OutgoingTransaction, Pot, Goal } from "../types";
import { allocateSavings } from "./allocate-savings";
import { requiredMonthly } from "./required-monthly";

export interface SavingsGoals {
  longTerm: Goal;
  shortTerm: Goal;
}

/**
 * Builds a month's computed totals from salary, pots, outgoings, and savings goals.
 *
 * Only standard-pot outgoings are summed; long-term and short-term pot outgoings
 * are ignored, and non-finite amounts count as 0. Leftover is salary minus that
 * standard sum, then allocated by ratio. Long-term and short-term pot totals are
 * overwritten with those allocated amounts.
 *
 * @param input.budgetMonth - Budget month as YYYY-MM
 * @param input.salary - Income for the month
 * @param input.pots - Pots to total, including standard, long-term, and short-term
 * @param input.outgoingTransactions - Outgoings to sum into matching standard pots
 * @param input.savingsGoals - Long-term and short-term goals used for required monthly amounts
 * @param input.longShortRatio - Long/short split percentages (out of 100)
 * @returns Pot totals, required and allocated savings, discretionary remainder, and underfunded and deadline-passed flags
 */
export const computeMonth = (input: {
  budgetMonth: string;
  salary: number;
  pots: Pot[];
  outgoingTransactions: OutgoingTransaction[];
  savingsGoals: SavingsGoals;
  longShortRatio: LongShortRatio;
}): ComputedMonth => {
  const potTotals: Record<string, number> = {};
  for (const pot of input.pots) potTotals[pot.id] = 0;

  let standardSum = 0;
  for (const outgoing of input.outgoingTransactions) {
    const pot = input.pots.find((pot) => pot.id === outgoing.potId);
    if (!pot || pot.category !== 'standard') continue;

    const amount = Number.isFinite(outgoing.amount) ? outgoing.amount : 0;
    potTotals[pot.id] = (potTotals[pot.id] || 0) + amount;
    standardSum += amount;
  }

  const longTermRequired = requiredMonthly(input.savingsGoals.longTerm, input.budgetMonth);
  const shortTermRequired = requiredMonthly(input.savingsGoals.shortTerm, input.budgetMonth);
  const leftover = input.salary - standardSum;
  const { allocatedLong, allocatedShort, discretionary, underfundedLong, underfundedShort } = allocateSavings(leftover, input.longShortRatio, longTermRequired.amount, shortTermRequired.amount);

  const longTermPot = input.pots.find((pot) => pot.category === 'long-term');
  const shortTermPot = input.pots.find((pot) => pot.category === 'short-term');
  if (longTermPot) potTotals[longTermPot.id] = allocatedLong;
  if (shortTermPot) potTotals[shortTermPot.id] = allocatedShort;

  return {
    potTotals,
    underfundedLongTerm: underfundedLong,
    underfundedShortTerm: underfundedShort,
    requiredLongTerm: longTermRequired.amount,
    requiredShortTerm: shortTermRequired.amount,
    discretionaryFund: discretionary,
    allocatedLongTerm: allocatedLong,
    allocatedShortTerm: allocatedShort,
    deadlinePassedLongTerm: longTermRequired.deadlinePassed,
    deadlinePassedShortTerm: shortTermRequired.deadlinePassed,
  }
}