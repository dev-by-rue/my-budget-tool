import type { BudgetRepository } from "../budget-repository";
import type { MonthlySnapshot, Settings } from "../../domain/types";

/**
 * @description Default settings when nothing has been persisted yet.
 *
 * @returns 60/40 long-short ratio, browser adapter, and persistToStorage false
 */
const defaultSettings = (): Settings => ({
  longShortRatio: { long: 60, short: 40 },
  activeAdapter: "browser",
  persistToStorage: false,
});

/**
 * @description Deep-clones a value via JSON so stored objects are not shared by reference.
 *
 * @param value - Value to clone
 * @returns A structured clone of value
 */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * @description In-memory BudgetRepository for tests and last-resort boot.
 *
 * Settings and months live in Maps for the lifetime of the adapter instance.
 *
 * @returns A repository that never hits disk or the network
 */
export const createMemoryAdapter = (): BudgetRepository => {
  let settings: Settings | undefined;
  const months = new Map<string, MonthlySnapshot>();

  return {
    probe: async () => {},

    loadSettings: async () => clone(settings ?? defaultSettings()),

    saveSettings: async (nextSettings) => {
      settings = clone(nextSettings);
    },

    listMonths: async () => [...months.keys()].sort(),

    loadMonth: async (id) => {
      const snapshot = months.get(id);
      return snapshot ? clone(snapshot) : null;
    },

    saveMonth: async (snapshot) => {
      months.set(snapshot.id, clone(snapshot));
    },
  };
};
