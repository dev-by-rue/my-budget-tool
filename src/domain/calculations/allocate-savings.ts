import type { LongShortRatio } from "../types";

export interface AllocateSavingsResult {
  allocatedLong: number;
  allocatedShort: number;
  discretionary: number;
  underfundedLong: boolean;
  underfundedShort: boolean;
}

/**
 * Allocates leftover savings to long-term and short-term pots by ratio,
 * or fully funds both when leftover covers the required amounts.
 *
 * Negative leftover is treated as 0. When both required amounts fit,
 * any remainder becomes discretionary; otherwise discretionary is 0 and
 * underfunded flags reflect shortfalls.
 *
 * @param leftover - Amount available after standard outgoings
 * @param longShortRatio - Long/short split percentages (out of 100)
 * @param requiredLongTerm - Required monthly long-term contribution
 * @param requiredShortTerm - Required monthly short-term contribution
 * @returns Allocated amounts, discretionary remainder, and underfunded flags
 */
export const allocateSavings = (
  leftover: number,
  longShortRatio: LongShortRatio,
  requiredLongTerm: number,
  requiredShortTerm: number,
): AllocateSavingsResult => {
  const safeLeftover = Math.max(leftover, 0);

  if (requiredLongTerm + requiredShortTerm <= safeLeftover) {
    return {
      allocatedLong: requiredLongTerm,
      allocatedShort: requiredShortTerm,
      discretionary: safeLeftover - requiredLongTerm - requiredShortTerm,
      underfundedLong: false,
      underfundedShort: false,
    }
  }
  const allocatedLong = (safeLeftover * longShortRatio.long) / 100;
  const allocatedShort = (safeLeftover * longShortRatio.short) / 100;
  return {
    allocatedLong,
    allocatedShort,
    discretionary: 0,
    underfundedLong: allocatedLong < requiredLongTerm,
    underfundedShort: allocatedShort < requiredShortTerm,
  };
}
