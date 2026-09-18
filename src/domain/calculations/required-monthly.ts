import type { Goal } from "../types";
import { monthsUntil } from "./months-until";

/**
 * @description Calculates the required monthly contribution to reach a goal by its deadline.
 *
 * @param goal - The goal with target, current balance, and deadline
 * @param budgetMonth - The month of the budget in the format of YYYY-MM
 * @returns The required monthly amount and whether the deadline has already passed
 */
export const requiredMonthly = (
  goal: Goal,
  budgetMonth: string,
): { amount: number; deadlinePassed: boolean } => {
  if (!goal.target || goal.target <= 0 || !goal.deadline) {
    return { amount: 0, deadlinePassed: false };
  }
  const remaining = Math.max(goal.target - (goal.current || 0), 0);
  const months = monthsUntil(budgetMonth, goal.deadline);
  if (months <= 0) {
    return { amount: remaining, deadlinePassed: true };
  }
  return { amount: remaining / months, deadlinePassed: false };
};
