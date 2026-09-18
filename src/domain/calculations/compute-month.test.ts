import { describe, it, expect } from "vitest";
import type { OutgoingTransaction, Pot } from "../types";
import { allocateSavings } from "./allocate-savings";
import { computeMonth } from "./compute-month";

const pots: Pot[] = [
  { id: 'essentials', name: 'Essentials', sortOrder: 0, system: false, category: 'standard' },
  { id: 'debts', name: 'Debts', sortOrder: 1, system: false, category: 'standard' },
  { id: 'subscriptions', name: 'Subscriptions', sortOrder: 2, system: false, category: 'standard' },
  { id: 'long-term-savings', name: 'Long Term Savings', sortOrder: 3, system: true, category: 'long-term' },
  { id: 'short-term-savings', name: 'Short Term Savings', sortOrder: 4, system: true, category: 'short-term' },
  { id: 'travel', name: 'Travel', sortOrder: 5, system: false, category: 'standard' },
];

const savingsGoals = {
  longTerm: {
    category: 'long-term' as const,
    name: 'House',
    target: 12000,
    current: 0,
    deadline: '2027-08',
  },
  shortTerm: {
    category: 'short-term' as const,
    name: 'Car',
    target: 10000,
    current: 0,
    deadline: '2026-12',
  },
};

describe('allocateSavings', () => {
  it('funds both in full when leftover covers required', () => {
    const r = allocateSavings(1000, { long: 60, short: 40 }, 600, 300);
    expect(r).toEqual({
      allocatedLong: 600,
      allocatedShort: 300,
      discretionary: 100,
      underfundedLong: false,
      underfundedShort: false,
    });
  });

  it('splits by ratio when underfunded', () => {
    const r = allocateSavings(500, { long: 60, short: 40 }, 600, 300);
    expect(r.allocatedLong).toBe(300);
    expect(r.allocatedShort).toBe(200);
    expect(r.discretionary).toBe(0);
    expect(r.underfundedLong).toBe(true);
    expect(r.underfundedShort).toBe(true);
  });
});

describe('computeMonth', () => {
  it('sums only standard pot outgoings before savings', () => {
    const outgoingTransactions: OutgoingTransaction[] = [
      { id: '1', potId: 'essentials', name: 'Rent', amount: 1000 },
      { id: '2', potId: 'long-term-savings', name: 'ignored', amount: 999 }, // must be ignored
    ];

    const computed = computeMonth({
      budgetMonth: '2026-09',
      salary: 2500,
      pots,
      outgoingTransactions,
      savingsGoals,
      longShortRatio: { long: 50, short: 50 },
    });

    expect(computed.requiredLongTerm).toBe(1000);
    expect(computed.requiredShortTerm).toBe(2500);
    expect(computed.allocatedLongTerm).toBe(750);
    expect(computed.allocatedShortTerm).toBe(750);
    expect(computed.discretionaryFund).toBe(0);
    expect(computed.potTotals['essentials']).toBe(1000);
    expect(computed.potTotals['long-term-savings']).toBe(750);
  });
});