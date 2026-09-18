/**
 * @description Calculates the number of months until a deadline, inclusive of the budget month.
 * 
 * @param budgetMonth - The month of the budget in the format of YYYY-MM
 * @param deadline - The deadline in the format of YYYY-MM-DD or YYYY-MM
 * @returns The number of months until the deadline
 */
export const monthsUntil = (budgetMonth: string, deadline: string): number => {
  const [budgetYear, budgetMonthNumber] = budgetMonth.split('-').map(Number);
  const clean = deadline.length >= 7 ? deadline.slice(0, 7) : deadline;
  if (!clean || clean.length < 7) return 0;
  const [deadlineYear, deadlineMonthNumber] = clean.split('-').map(Number);

  return (deadlineYear - budgetYear) * 12 + (deadlineMonthNumber - budgetMonthNumber) + 1;
}
