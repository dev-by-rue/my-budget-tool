import { monthsUntil } from "./months-until";
import { describe, it, expect } from "vitest";
import { requiredMonthly } from './required-monthly';

import type { Goal } from "../types";

describe('monthsUntil', () => {
  it('returns the month count (inclusive)', () => {
    expect(monthsUntil('2026-09', '2026-12')).toBe(4); // Sep,Oct,Nov,Dec
    expect(monthsUntil('2026-09', '2026-09')).toBe(1);
    expect(monthsUntil('2026-09', '2026-08')).toBe(0);
  });

  it('accepts deadlines with date format of YYYY-MM-DD', () => {
    expect(monthsUntil('2026-09', '2027-03-15')).toBe(7);
  });
});

describe('requiredMonthly', () => {
  const base: Goal = {
    category: 'long-term',
    name: 'House',
    target: 12000,
    current: 0,
    deadline: '2027-08',
  };

  it('returns 0 when target or deadline missing', () => {
    expect(requiredMonthly({ ...base, target: 0 }, '2026-09').amount).toBe(0);
    expect(requiredMonthly({ ...base, deadline: '' }, '2026-09').amount).toBe(0);
  });

  it('divides remaining by inclusive months left', () => {
    // Sep 2026 → Aug 2027 = 12 months; 12000/12 = 1000
    const r = requiredMonthly(base, '2026-09');
    expect(r.deadlinePassed).toBe(false);
    expect(r.amount).toBe(1000);
  });

  it('uses full remaining when deadline passed', () => {
    const r = requiredMonthly({ ...base, deadline: '2026-08', current: 2000 }, '2026-09');
    expect(r.deadlinePassed).toBe(true);
    expect(r.amount).toBe(10000);
  });
});