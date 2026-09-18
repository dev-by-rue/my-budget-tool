import type { MonthlySnapshot, Settings } from "../domain/types";

/**
 * Persistence contract for settings and monthly snapshots.
 * Adapters (memory, browser, postgres) implement this interface.
 */
export interface BudgetRepository {
  /**
   * Checks that the adapter can read and write.
   */
  probe: () => Promise<void>;

  /**
   * Loads persisted settings, or defaults when none have been saved.
   */
  loadSettings: () => Promise<Settings>;

  /**
   * Replaces persisted settings.
   *
   * @param settings - Settings to store
   */
  saveSettings: (settings: Settings) => Promise<void>;

  /**
   * Lists snapshot ids as YYYY-MM, sorted ascending.
   */
  listMonths: () => Promise<string[]>;

  /**
   * Loads a month snapshot by YYYY-MM id.
   *
   * @param id - Budget month as YYYY-MM
   * @returns The snapshot, or null if none exists
   */
  loadMonth: (id: string) => Promise<MonthlySnapshot | null>;

  /**
   * Inserts or replaces a month snapshot keyed by its id.
   *
   * @param snapshot - Month to persist
   */
  saveMonth: (snapshot: MonthlySnapshot) => Promise<void>;
}
