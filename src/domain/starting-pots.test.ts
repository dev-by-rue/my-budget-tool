import { describe, it, expect } from 'vitest';
import { createStartingPots } from './starting-pots';

describe('createStartingPots', () => {
  it('returns six pots with exactly one long and one short savings pot', () => {
    const pots =  createStartingPots();
    expect(pots).toHaveLength(6);
    expect(pots.map((p) => p.name)).toEqual([
      'Essentials',
      'Debts',
      'Subscriptions',
      'Long Term Savings Goals',
      'Short Term Savings Goals',
      'Travel',
    ]);
    expect(pots.filter((p) => p.category === 'long-term')).toHaveLength(1);
    expect(pots.filter((p) => p.category === 'short-term')).toHaveLength(1);
    expect(pots.filter((p) => p.category === 'standard')).toHaveLength(4);
    expect(pots.filter((p) => p.system)).toHaveLength(2);
  });
});