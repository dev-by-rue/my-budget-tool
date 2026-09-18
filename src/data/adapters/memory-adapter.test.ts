import { describe, it, expect } from "vitest";
import { createEmptyMonth } from "../../domain/month-factory";
import { createMemoryAdapter } from "./memory-adapter";

describe("createMemoryAdapter", () => {
  it("round-trips settings and months", async () => {
    const repo = createMemoryAdapter();
    await repo.probe();

    const settings = {
      longShortRatio: { long: 70, short: 30 },
      activeAdapter: "browser" as const,
      persistToStorage: false,
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
