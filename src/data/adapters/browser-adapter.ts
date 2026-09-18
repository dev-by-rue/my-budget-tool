import { openDB, type IDBPDatabase } from "idb";
import type { BudgetRepository } from "../budget-repository";
import type { MonthlySnapshot, Settings } from "../../domain/types";

const SETTINGS_STORE = "settings";
const MONTHS_STORE = "months";
const SETTINGS_KEY = "main";
const PROBE_KEY = "_probe";
const DEFAULT_DB_NAME = "budget-app-phase1";

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

export interface BrowserAdapterOptions {
  dbName?: string;
}

/**
 * @description Opens (or creates) the IndexedDB database with settings and months stores.
 *
 * @param dbName - Database name
 * @returns A promise for the opened database
 */
const openBudgetDb = (dbName: string): Promise<IDBPDatabase> =>
  openDB(dbName, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
      if (!db.objectStoreNames.contains(MONTHS_STORE)) {
        db.createObjectStore(MONTHS_STORE);
      }
    },
  });

/**
 * @description IndexedDB BudgetRepository for browser persistence.
 *
 * Stores settings under the `main` key and months keyed by YYYY-MM.
 *
 * @param options.dbName - Database name (defaults to budget-app-phase1)
 * @returns A repository backed by IndexedDB
 */
export const createBrowserAdapter = (
  options: BrowserAdapterOptions = {},
): BudgetRepository => {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  let dbPromise: Promise<IDBPDatabase> | undefined;

  const getDb = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
      dbPromise = openBudgetDb(dbName);
    }
    return dbPromise;
  };

  return {
    probe: async () => {
      const db = await getDb();
      await db.put(SETTINGS_STORE, { ok: true }, PROBE_KEY);
      const read = await db.get(SETTINGS_STORE, PROBE_KEY);
      if (!read) {
        throw new Error("IndexedDB probe failed");
      }
      await db.delete(SETTINGS_STORE, PROBE_KEY);
    },

    loadSettings: async () => {
      const db = await getDb();
      const stored = await db.get(SETTINGS_STORE, SETTINGS_KEY);
      return stored ? clone(stored as Settings) : defaultSettings();
    },

    saveSettings: async (nextSettings) => {
      const db = await getDb();
      await db.put(SETTINGS_STORE, clone(nextSettings), SETTINGS_KEY);
    },

    listMonths: async () => {
      const db = await getDb();
      const keys = await db.getAllKeys(MONTHS_STORE);
      return keys.map(String).sort();
    },

    loadMonth: async (id) => {
      const db = await getDb();
      const snapshot = await db.get(MONTHS_STORE, id);
      return snapshot ? clone(snapshot as MonthlySnapshot) : null;
    },

    saveMonth: async (snapshot) => {
      const db = await getDb();
      await db.put(MONTHS_STORE, clone(snapshot), snapshot.id);
    },
  };
};
