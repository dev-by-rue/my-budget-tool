import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { createEmptyMonth } from "../../domain/month-factory";
import { createBrowserAdapter } from "./browser-adapter";

describe("createBrowserAdapter", () => {
  it("probes and round-trips settings and months", async () => {
    const repo = createBrowserAdapter({ dbName: `budget-test-${Date.now()}` });
    await repo.probe();

    const settings = {
      longShortRatio: { long: 70, short: 30 },
      activeAdapter: "browser" as const,
      persistToStorage: true,
    };
    await repo.saveSettings(settings);
    expect(await repo.loadSettings()).toEqual(settings);

    const month = createEmptyMonth("2026-09");
    month.salary = 3000;
    await repo.saveMonth(month);
    expect(await repo.loadMonth("2026-09")).toEqual(month);
    expect(await repo.listMonths()).toEqual(["2026-09"]);
  });
});
