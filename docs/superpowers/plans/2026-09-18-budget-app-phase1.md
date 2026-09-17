# Budget App Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a solo Ionic Vue budget app with tabbed Budget / Goals / History views, live Discretionary + savings allocation, local dual persistence (browser + Postgres), and month snapshots with this-vs-last comparison.

**Architecture:** Pure calc engine → `BudgetRepository` interface with Browser and Postgres adapters (boot probe + fallback) → Pinia store → three Ionic tabs. Capacitor wired from day one; develop in-browser first.

**Tech Stack:** Ionic 8 + Vue 3 + TypeScript (via `@ionic/cli` `ionic start … tabs --type vue`), Vue Router, Pinia, Vitest, Capacitor, local Express + `pg` for Postgres adapter, IndexedDB via `idb` (with Preferences fallback path documented in browser adapter).

**Spec:** `docs/superpowers/specs/2026-09-18-budget-app-phase1-design.md`

## Global Constraints

- Solo only — no owner/partner/joint fields
- Discretionary is always computed, never an editable pot
- Exactly one Long Term and one Short Term goal
- Savings pots (`savings_long`, `savings_short`) are system: renameable, not removable, no editable outgoings
- Persist every month; History UI is this-vs-last only (no charts)
- New month auto-carries forward previous snapshot as editable draft
- No auth, no cloud sync, no transaction line-items
- Terminology: **Pot** = category bucket; **Outgoing** = monthly line item
- Currency display: GBP (`£`) for Phase 1 UI
- Months-until-deadline rule (locked): inclusive month count from budget `YYYY-MM` to deadline month; if ≤ 0, deadline passed and `requiredMonthly = remaining`

---

## File structure (target)

```
budget-application/
  package.json
  ionic.config.json
  capacitor.config.ts
  vite.config.ts
  vitest.config.ts
  index.html
  src/
    main.ts
    App.vue
    theme/variables.css
    router/index.ts
    domain/
      types.ts
      starters.ts
      ids.ts
      calc/
        monthsUntil.ts
        requiredMonthly.ts
        allocateSavings.ts
        computeMonth.ts
      monthFactory.ts
    data/
      BudgetRepository.ts
      createRepository.ts
      adapters/
        memoryAdapter.ts
        browserAdapter.ts
        postgresAdapter.ts
    stores/
      budgetStore.ts
    views/
      BudgetPage.vue
      GoalsPage.vue
      HistoryPage.vue
    components/
      OutgoingEditor.vue
      PotSection.vue
      MoneyInput.vue
      UnderfundedBadge.vue
      PersistenceBanner.vue
    utils/
      money.ts
      debounce.ts
  server/
    package.json
    src/
      index.ts
      db.ts
      schema.sql
  docs/superpowers/specs/2026-09-18-budget-app-phase1-design.md
```

---

### Task 1: Scaffold Ionic Vue + Capacitor + Vitest

**Files:**
- Create: Ionic Vue **tabs** app files **inside this working repo** (`/Users/ruebencumberbatch/code/budget-application`)
- Create: `vitest.config.ts`
- Modify: `package.json` (test scripts)
- Keep: `docs/`, `project_scope.md`, `budget-pot-calculator.html`, existing `.git/`

**Interfaces:**
- Consumes: none
- Produces: runnable `ionic serve` / `npm run dev`, `npm test`, Capacitor config in this repo

**Official docs (source of truth):**
- Quickstart: https://ionicframework.com/docs/vue/quickstart — `npm install -g @ionic/cli` then `ionic start … --type=vue`
- First app (tabs): https://ionicframework.com/docs/vue/your-first-app — `ionic start … tabs --type=vue`
- Capacitor flag: `--capacitor` on `ionic start` (see CLI help). Native `ios`/`android` platforms stay optional until device testing.

**Why a temp folder?** `ionic start` always creates a **new directory**; it cannot initialise into this already-populated git repo. Scaffold next door, then copy **into** `budget-application` (this working repo).

- [ ] **Step 1: Install Ionic CLI (if missing)**

```bash
npm install -g @ionic/cli
ionic -v
```

Use `@ionic/cli` (not the deprecated global `ionic` package).

- [ ] **Step 2: Scaffold tabs + Capacitor, then merge into this repo**

```bash
cd /Users/ruebencumberbatch/code
ionic start budget-app-scaffold tabs --type=vue --capacitor --no-git
```

(`--no-git` avoids a nested `.git` inside the scaffold. If the CLI prompts, accept defaults / Vue / tabs / Capacitor.)

Merge scaffold **into the working repo** without wiping docs or git history:

```bash
rsync -a \
  --exclude='.git' \
  /Users/ruebencumberbatch/code/budget-app-scaffold/ \
  /Users/ruebencumberbatch/code/budget-application/

cd /Users/ruebencumberbatch/code/budget-application
npm install
rm -rf /Users/ruebencumberbatch/code/budget-app-scaffold
```

Confirm still present: `docs/superpowers/`, `project_scope.md`, `budget-pot-calculator.html`.

Starter already includes a tab bar — Task 10 renames tabs to Budget / Goals / History.

- [ ] **Step 3: Confirm Capacitor config in this repo**

```bash
cd /Users/ruebencumberbatch/code/budget-application
ls capacitor.config.ts ionic.config.json package.json src/
```

If Capacitor files are missing (scaffold without `--capacitor`):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar
npx cap init "Budget" "com.budget.app" --web-dir dist
```

Do **not** run `ionic cap add ios/android` yet — browser-first per spec.

- [ ] **Step 4: Add Vitest (in this repo)**

```bash
cd /Users/ruebencumberbatch/code/budget-application
npm install -D vitest @vue/test-utils jsdom
```

Create `src/vite/silenceMissingSourcemapWarnings.ts` and wire it into `vitest.config.ts` / `vite.config.ts` (use `import.meta.dirname`, not `__dirname`; Vitest overwrites `customLogger`, so silence Ionic missing-sourcemap noise via a `configResolved` logger patch):

```ts
// vitest.config.ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { silenceMissingSourcemapWarnings } from './src/vite/silenceMissingSourcemapWarnings.ts'

export default defineConfig({
  plugins: [vue(), silenceMissingSourcemapWarnings()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
```

(See `src/vite/silenceMissingSourcemapWarnings.ts` in the repo for the plugin implementation.)

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Verify in this repo**

```bash
cd /Users/ruebencumberbatch/code/budget-application
npm test
npm run build
ionic serve
```

Expected: Vitest runs; build succeeds; app opens in browser (default tabs starter UI).

- [ ] **Step 6: Commit from this repo**

```bash
cd /Users/ruebencumberbatch/code/budget-application
git add -A
git status   # should show Ionic files + preserved docs; no nested scaffold
git commit -m "chore: scaffold Ionic Vue tabs app with Capacitor and Vitest"
```

---

### Task 2: Domain types and starter pots

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/starters.ts`
- Create: `src/domain/ids.ts`
- Test: `src/domain/starters.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `Pot`, `Outgoing`, `Goal`, `MonthSnapshot`, `Settings`, `MonthComputed`, `LongShortRatio`, `PotKind`; `createStarterPots()`; `newId()`

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/starters.test.ts
import { describe, it, expect } from 'vitest';
import { createStarterPots } from './starters';

describe('createStarterPots', () => {
  it('returns six pots with exactly one long and one short savings pot', () => {
    const pots = createStarterPots();
    expect(pots).toHaveLength(6);
    expect(pots.map((p) => p.name)).toEqual([
      'Essentials',
      'Debts',
      'Subscriptions',
      'Long Term Savings Goals',
      'Short Term Savings Goals',
      'Travel',
    ]);
    expect(pots.filter((p) => p.kind === 'savings_long')).toHaveLength(1);
    expect(pots.filter((p) => p.kind === 'savings_short')).toHaveLength(1);
    expect(pots.filter((p) => p.kind === 'standard')).toHaveLength(4);
    expect(pots.filter((p) => p.system)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/domain/starters.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement types, ids, starters**

```ts
// src/domain/types.ts
export type PotKind = 'standard' | 'savings_long' | 'savings_short';
export type StorageAdapterName = 'browser' | 'postgres' | 'memory';

export interface LongShortRatio {
  long: number; // percent 0–100
  short: number; // percent 0–100; long + short === 100
}

export interface Pot {
  id: string;
  name: string;
  sortOrder: number;
  system: boolean;
  kind: PotKind;
}

export interface Outgoing {
  id: string;
  potId: string;
  name: string;
  amount: number;
}

export interface Goal {
  potKind: 'savings_long' | 'savings_short';
  name: string;
  target: number;
  current: number;
  deadline: string; // YYYY-MM or YYYY-MM-DD
}

export interface MonthComputed {
  potTotals: Record<string, number>;
  allocatedLong: number;
  allocatedShort: number;
  requiredLong: number;
  requiredShort: number;
  discretionary: number;
  underfundedLong: boolean;
  underfundedShort: boolean;
  deadlinePassedLong: boolean;
  deadlinePassedShort: boolean;
}

export interface MonthSnapshot {
  id: string; // YYYY-MM
  salary: number;
  pots: Pot[];
  outgoings: Outgoing[];
  goals: { long: Goal; short: Goal };
  longShortRatio: LongShortRatio;
  computed: MonthComputed;
}

export interface Settings {
  longShortRatio: LongShortRatio;
  activeAdapter?: StorageAdapterName;
  persistenceReadOnly?: boolean;
}
```

```ts
// src/domain/ids.ts
export function newId(): string {
  return crypto.randomUUID();
}
```

```ts
// src/domain/starters.ts
import { newId } from './ids';
import type { Pot } from './types';

export function createStarterPots(): Pot[] {
  const defs: Array<Omit<Pot, 'id'>> = [
    { name: 'Essentials', sortOrder: 0, system: false, kind: 'standard' },
    { name: 'Debts', sortOrder: 1, system: false, kind: 'standard' },
    { name: 'Subscriptions', sortOrder: 2, system: false, kind: 'standard' },
    { name: 'Long Term Savings Goals', sortOrder: 3, system: true, kind: 'savings_long' },
    { name: 'Short Term Savings Goals', sortOrder: 4, system: true, kind: 'savings_short' },
    { name: 'Travel', sortOrder: 5, system: false, kind: 'standard' },
  ];
  return defs.map((d) => ({ ...d, id: newId() }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/domain/starters.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat: add domain types and starter pots"
```

---

### Task 3: Calc — monthsUntil and requiredMonthly

**Files:**
- Create: `src/domain/calc/monthsUntil.ts`
- Create: `src/domain/calc/requiredMonthly.ts`
- Test: `src/domain/calc/requiredMonthly.test.ts`

**Interfaces:**
- Consumes: `Goal` from `types.ts`
- Produces: `monthsUntil(budgetMonth, deadline) => number`; `requiredMonthly(goal, budgetMonth) => { amount: number; deadlinePassed: boolean }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/calc/requiredMonthly.test.ts
import { describe, it, expect } from 'vitest';
import { monthsUntil } from './monthsUntil';
import { requiredMonthly } from './requiredMonthly';
import type { Goal } from '../types';

describe('monthsUntil', () => {
  it('counts inclusive months', () => {
    expect(monthsUntil('2026-09', '2026-12')).toBe(4); // Sep,Oct,Nov,Dec
    expect(monthsUntil('2026-09', '2026-09')).toBe(1);
    expect(monthsUntil('2026-09', '2026-08')).toBe(0);
  });

  it('accepts YYYY-MM-DD deadlines', () => {
    expect(monthsUntil('2026-09', '2027-03-15')).toBe(7);
  });
});

describe('requiredMonthly', () => {
  const base: Goal = {
    potKind: 'savings_long',
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/domain/calc/requiredMonthly.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

```ts
// src/domain/calc/monthsUntil.ts
/** Inclusive months from budget YYYY-MM to deadline month. ≤0 means deadline passed. */
export function monthsUntil(budgetMonth: string, deadline: string): number {
  const [by, bm] = budgetMonth.split('-').map(Number);
  const clean = deadline.length >= 7 ? deadline.slice(0, 7) : deadline;
  if (!clean || clean.length < 7) return 0;
  const [dy, dm] = clean.split('-').map(Number);
  return (dy - by) * 12 + (dm - bm) + 1;
}
```

```ts
// src/domain/calc/requiredMonthly.ts
import type { Goal } from '../types';
import { monthsUntil } from './monthsUntil';

export function requiredMonthly(
  goal: Goal,
  budgetMonth: string,
): { amount: number; deadlinePassed: boolean } {
  if (!goal.target || goal.target <= 0 || !goal.deadline) {
    return { amount: 0, deadlinePassed: false };
  }
  const remaining = Math.max(goal.target - (goal.current || 0), 0);
  const months = monthsUntil(budgetMonth, goal.deadline);
  if (months <= 0) {
    return { amount: remaining, deadlinePassed: true };
  }
  return { amount: remaining / months, deadlinePassed: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/domain/calc/requiredMonthly.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/calc
git commit -m "feat: add requiredMonthly and monthsUntil calc"
```

---

### Task 4: Calc — allocateSavings and computeMonth

**Files:**
- Create: `src/domain/calc/allocateSavings.ts`
- Create: `src/domain/calc/computeMonth.ts`
- Create: `src/domain/monthFactory.ts`
- Test: `src/domain/calc/computeMonth.test.ts`

**Interfaces:**
- Consumes: `requiredMonthly`, domain types, `createStarterPots`, `newId`
- Produces: `allocateSavings(...)`; `computeMonth(input) => MonthComputed`; `createEmptyMonth(id)`; `cloneMonth(prev, newId)`

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/calc/computeMonth.test.ts
import { describe, it, expect } from 'vitest';
import { computeMonth } from './computeMonth';
import { allocateSavings } from './allocateSavings';
import type { Goal, Outgoing, Pot } from '../types';

const pots: Pot[] = [
  { id: 'e', name: 'Essentials', sortOrder: 0, system: false, kind: 'standard' },
  { id: 'lt', name: 'LT', sortOrder: 1, system: true, kind: 'savings_long' },
  { id: 'st', name: 'ST', sortOrder: 2, system: true, kind: 'savings_short' },
];

const goals = {
  long: {
    potKind: 'savings_long' as const,
    name: 'LT',
    target: 1200,
    current: 0,
    deadline: '2026-10', // Sep+Oct = 2 months → 600/mo if from 2026-09
  },
  short: {
    potKind: 'savings_short' as const,
    name: 'ST',
    target: 600,
    current: 0,
    deadline: '2026-10', // 300/mo
  },
};

describe('allocateSavings', () => {
  it('funds both in full when leftover covers required', () => {
    const r = allocateSavings(1000, { long: 60, short: 40 }, 600, 300);
    expect(r).toEqual({
      allocatedLong: 600,
      allocatedShort: 300,
      discretionary: 100,
      underfundedLong: false,
      underfundedShort: false,
    });
  });

  it('splits by ratio when underfunded', () => {
    const r = allocateSavings(500, { long: 60, short: 40 }, 600, 300);
    expect(r.allocatedLong).toBe(300);
    expect(r.allocatedShort).toBe(200);
    expect(r.discretionary).toBe(0);
    expect(r.underfundedLong).toBe(true);
    expect(r.underfundedShort).toBe(true);
  });
});

describe('computeMonth', () => {
  it('sums only standard pot outgoings before savings', () => {
    const outgoings: Outgoing[] = [
      { id: '1', potId: 'e', name: 'Rent', amount: 1000 },
      { id: '2', potId: 'lt', name: 'ignored', amount: 999 }, // must be ignored
    ];
    const computed = computeMonth({
      budgetMonth: '2026-09',
      salary: 2500,
      pots,
      outgoings,
      goals,
      longShortRatio: { long: 50, short: 50 },
    });
    // leftover = 2500-1000 = 1500; required 600+300=900; disc=600
    expect(computed.requiredLong).toBe(600);
    expect(computed.requiredShort).toBe(300);
    expect(computed.allocatedLong).toBe(600);
    expect(computed.allocatedShort).toBe(300);
    expect(computed.discretionary).toBe(600);
    expect(computed.potTotals['e']).toBe(1000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/domain/calc/computeMonth.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement allocateSavings, computeMonth, monthFactory**

```ts
// src/domain/calc/allocateSavings.ts
import type { LongShortRatio } from '../types';

export function allocateSavings(
  leftover: number,
  ratio: LongShortRatio,
  requiredLong: number,
  requiredShort: number,
) {
  const safeLeftover = Math.max(leftover, 0);
  if (requiredLong + requiredShort <= safeLeftover) {
    return {
      allocatedLong: requiredLong,
      allocatedShort: requiredShort,
      discretionary: safeLeftover - requiredLong - requiredShort,
      underfundedLong: false,
      underfundedShort: false,
    };
  }
  const allocatedLong = (safeLeftover * ratio.long) / 100;
  const allocatedShort = (safeLeftover * ratio.short) / 100;
  return {
    allocatedLong,
    allocatedShort,
    discretionary: 0,
    underfundedLong: allocatedLong < requiredLong,
    underfundedShort: allocatedShort < requiredShort,
  };
}
```

```ts
// src/domain/calc/computeMonth.ts
import type { Goal, LongShortRatio, MonthComputed, Outgoing, Pot } from '../types';
import { requiredMonthly } from './requiredMonthly';
import { allocateSavings } from './allocateSavings';

export function computeMonth(input: {
  budgetMonth: string;
  salary: number;
  pots: Pot[];
  outgoings: Outgoing[];
  goals: { long: Goal; short: Goal };
  longShortRatio: LongShortRatio;
}): MonthComputed {
  const potTotals: Record<string, number> = {};
  for (const pot of input.pots) potTotals[pot.id] = 0;

  let standardSum = 0;
  for (const o of input.outgoings) {
    const pot = input.pots.find((p) => p.id === o.potId);
    if (!pot || pot.kind !== 'standard') continue;
    const amount = Number.isFinite(o.amount) ? o.amount : 0;
    potTotals[pot.id] = (potTotals[pot.id] || 0) + amount;
    standardSum += amount;
  }

  const longReq = requiredMonthly(input.goals.long, input.budgetMonth);
  const shortReq = requiredMonthly(input.goals.short, input.budgetMonth);
  const leftover = input.salary - standardSum;
  const alloc = allocateSavings(
    leftover,
    input.longShortRatio,
    longReq.amount,
    shortReq.amount,
  );

  const longPot = input.pots.find((p) => p.kind === 'savings_long');
  const shortPot = input.pots.find((p) => p.kind === 'savings_short');
  if (longPot) potTotals[longPot.id] = alloc.allocatedLong;
  if (shortPot) potTotals[shortPot.id] = alloc.allocatedShort;

  return {
    potTotals,
    allocatedLong: alloc.allocatedLong,
    allocatedShort: alloc.allocatedShort,
    requiredLong: longReq.amount,
    requiredShort: shortReq.amount,
    discretionary: alloc.discretionary,
    underfundedLong: alloc.underfundedLong,
    underfundedShort: alloc.underfundedShort,
    deadlinePassedLong: longReq.deadlinePassed,
    deadlinePassedShort: shortReq.deadlinePassed,
  };
}
```

```ts
// src/domain/monthFactory.ts
import { computeMonth } from './calc/computeMonth';
import { createStarterPots } from './starters';
import { newId } from './ids';
import type { MonthSnapshot } from './types';

export function emptyGoals() {
  return {
    long: {
      potKind: 'savings_long' as const,
      name: '',
      target: 0,
      current: 0,
      deadline: '',
    },
    short: {
      potKind: 'savings_short' as const,
      name: '',
      target: 0,
      current: 0,
      deadline: '',
    },
  };
}

export function createEmptyMonth(id: string): MonthSnapshot {
  const pots = createStarterPots();
  const outgoings: MonthSnapshot['outgoings'] = [];
  const goals = emptyGoals();
  const longShortRatio = { long: 60, short: 40 };
  const salary = 0;
  return {
    id,
    salary,
    pots,
    outgoings,
    goals,
    longShortRatio,
    computed: computeMonth({
      budgetMonth: id,
      salary,
      pots,
      outgoings,
      goals,
      longShortRatio,
    }),
  };
}

export function cloneMonth(prev: MonthSnapshot, newId: string): MonthSnapshot {
  const pots = prev.pots.map((p) => ({ ...p }));
  const outgoings = prev.outgoings.map((o) => ({ ...o, id: newId() }));
  const goals = {
    long: { ...prev.goals.long },
    short: { ...prev.goals.short },
  };
  const longShortRatio = { ...prev.longShortRatio };
  const salary = prev.salary;
  return {
    id: newId,
    salary,
    pots,
    outgoings,
    goals,
    longShortRatio,
    computed: computeMonth({
      budgetMonth: newId,
      salary,
      pots,
      outgoings,
      goals,
      longShortRatio,
    }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/domain/calc/computeMonth.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat: add allocateSavings, computeMonth, and month factory"
```

---

### Task 5: BudgetRepository interface + memory adapter

**Files:**
- Create: `src/data/BudgetRepository.ts`
- Create: `src/data/adapters/memoryAdapter.ts`
- Test: `src/data/adapters/memoryAdapter.test.ts`

**Interfaces:**
- Consumes: `MonthSnapshot`, `Settings`
- Produces: `BudgetRepository` interface; `createMemoryAdapter(): BudgetRepository`

```ts
// Interface to implement exactly:
export interface BudgetRepository {
  probe(): Promise<void>;
  loadSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  listMonths(): Promise<string[]>; // YYYY-MM sorted ascending
  loadMonth(id: string): Promise<MonthSnapshot | null>;
  saveMonth(snapshot: MonthSnapshot): Promise<void>;
}
```

- [ ] **Step 1: Write the failing test**

```ts
// src/data/adapters/memoryAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { createMemoryAdapter } from './memoryAdapter';
import { createEmptyMonth } from '../../domain/monthFactory';

describe('memoryAdapter', () => {
  it('round-trips settings and months', async () => {
    const repo = createMemoryAdapter();
    await repo.probe();
    await repo.saveSettings({ longShortRatio: { long: 70, short: 30 } });
    expect(await repo.loadSettings()).toEqual({
      longShortRatio: { long: 70, short: 30 },
    });

    const month = createEmptyMonth('2026-09');
    month.salary = 3000;
    await repo.saveMonth(month);
    expect(await repo.loadMonth('2026-09')).toEqual(month);
    expect(await repo.listMonths()).toEqual(['2026-09']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/data/adapters/memoryAdapter.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement interface + memory adapter**

Implement `BudgetRepository.ts` with the interface above and default settings `{ longShortRatio: { long: 60, short: 40 } }`.

`createMemoryAdapter` keeps `Map`s in closure for settings + months; `probe` resolves; `listMonths` returns sorted keys.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/data/adapters/memoryAdapter.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data
git commit -m "feat: add BudgetRepository interface and memory adapter"
```

---

### Task 6: Browser adapter (IndexedDB via idb)

**Files:**
- Create: `src/data/adapters/browserAdapter.ts`
- Test: `src/data/adapters/browserAdapter.test.ts`
- Modify: `package.json` (dependency `idb`)

**Interfaces:**
- Consumes: `BudgetRepository`
- Produces: `createBrowserAdapter(): BudgetRepository`

- [ ] **Step 1: Install idb**

```bash
npm install idb
```

- [ ] **Step 2: Write the failing test**

Use fake-indexeddb:

```bash
npm install -D fake-indexeddb
```

```ts
// src/data/adapters/browserAdapter.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createBrowserAdapter } from './browserAdapter';
import { createEmptyMonth } from '../../domain/monthFactory';

describe('browserAdapter', () => {
  beforeEach(async () => {
    // fresh DB name per test via createBrowserAdapter({ dbName: `t-${Date.now()}` })
  });

  it('probe and round-trip month', async () => {
    const repo = createBrowserAdapter({ dbName: `budget-test-${Date.now()}` });
    await repo.probe();
    const month = createEmptyMonth('2026-09');
    await repo.saveMonth(month);
    expect(await repo.loadMonth('2026-09')).toEqual(month);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- src/data/adapters/browserAdapter.test.ts
```

Expected: FAIL

- [ ] **Step 4: Implement browserAdapter**

- DB name default `budget-app-phase1`
- Object stores: `settings` (key `main`), `months` (key `id`)
- `probe`: write and read a `_probe` key in settings, then delete it
- Serialize/deserialize JSON snapshots as stored

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- src/data/adapters/browserAdapter.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/data/adapters
git commit -m "feat: add IndexedDB browser persistence adapter"
```

---

### Task 7: Local Postgres API + postgres adapter

**Files:**
- Create: `server/package.json`
- Create: `server/src/schema.sql`
- Create: `server/src/db.ts`
- Create: `server/src/index.ts`
- Create: `src/data/adapters/postgresAdapter.ts`
- Test: `src/data/adapters/postgresAdapter.test.ts` (skipped if `DATABASE_URL` unset)

**Interfaces:**
- Consumes: `BudgetRepository`
- Produces: HTTP API on `http://127.0.0.1:8787`; `createPostgresAdapter({ baseUrl })`

- [ ] **Step 1: Create server package**

`server/package.json` dependencies: `express`, `pg`, `cors`, `zod`. Scripts: `"dev": "tsx watch src/index.ts"`, `"start": "tsx src/index.ts"`.

`server/src/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS months (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL
);
```

`db.ts`: connect via `process.env.DATABASE_URL || 'postgres://localhost:5432/budget_app'`, run schema on boot.

`index.ts` routes:

- `GET /health` → `{ ok: true }`
- `GET /settings` / `PUT /settings`
- `GET /months` → `{ ids: string[] }`
- `GET /months/:id` → snapshot or 404
- `PUT /months/:id` → body = snapshot

Bind `127.0.0.1:8787` only.

- [ ] **Step 2: Implement postgresAdapter**

`createPostgresAdapter({ baseUrl = 'http://127.0.0.1:8787' })`:

- `probe`: `GET /health` must be ok
- Other methods map to fetch JSON

- [ ] **Step 3: Manual/automated verify**

```bash
createdb budget_app   # if needed
cd server && npm install && DATABASE_URL=postgres://localhost:5432/budget_app npm run dev
```

In another terminal, from app root:

```bash
DATABASE_URL=postgres://localhost:5432/budget_app npm test -- src/data/adapters/postgresAdapter.test.ts
```

Test: skip with `it.skipIf(!process.env.RUN_PG_TESTS)` unless `RUN_PG_TESTS=1`; when enabled, round-trip like memory test against live server.

Document in test file header: require server running + `RUN_PG_TESTS=1`.

- [ ] **Step 4: Commit**

```bash
git add server src/data/adapters/postgresAdapter.ts src/data/adapters/postgresAdapter.test.ts
git commit -m "feat: add local Postgres API and client adapter"
```

---

### Task 8: createRepository — probe and fallback

**Files:**
- Create: `src/data/createRepository.ts`
- Test: `src/data/createRepository.test.ts`

**Interfaces:**
- Consumes: browser + postgres + memory adapters
- Produces: `createRepository(options?) => Promise<{ repo: BudgetRepository; adapter: StorageAdapterName }>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createRepository } from './createRepository';
import type { BudgetRepository } from './BudgetRepository';

function failingAdapter(): BudgetRepository {
  return {
    async probe() {
      throw new Error('indexeddb blocked');
    },
    async loadSettings() {
      throw new Error('no');
    },
    async saveSettings() {},
    async listMonths() {
      return [];
    },
    async loadMonth() {
      return null;
    },
    async saveMonth() {},
  };
}

describe('createRepository', () => {
  it('falls back when primary probe fails', async () => {
    const { adapter } = await createRepository({
      primary: failingAdapter(),
      fallback: (await import('./adapters/memoryAdapter')).createMemoryAdapter(),
      primaryName: 'browser',
      fallbackName: 'memory',
    });
    expect(adapter).toBe('memory');
  });

  it('honours forceAdapter', async () => {
    const mem = (await import('./adapters/memoryAdapter')).createMemoryAdapter();
    const { adapter } = await createRepository({
      forceAdapter: 'memory',
      forcedRepo: mem,
    });
    expect(adapter).toBe('memory');
  });
});
```

- [ ] **Step 2: Implement createRepository**

Logic:

1. If `import.meta.env.VITE_FORCE_ADAPTER` or `forceAdapter` set → use that repo
2. Else try primary (browser) `probe()`
3. On failure try fallback (postgres) `probe()`
4. If both fail, return memory adapter and caller sets `persistenceReadOnly` after a failed save — for boot, still return memory so UI loads, with `adapter: 'memory'`

Default wiring for app:

```ts
await createRepository({
  primary: createBrowserAdapter(),
  fallback: createPostgresAdapter(),
  primaryName: 'browser',
  fallbackName: 'postgres',
});
```

- [ ] **Step 3: Run tests — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add src/data
git commit -m "feat: add repository probe and fallback selection"
```

---

### Task 9: Pinia budget store

**Files:**
- Create: `src/stores/budgetStore.ts`
- Create: `src/utils/debounce.ts`
- Create: `src/utils/money.ts`
- Test: `src/stores/budgetStore.test.ts`
- Modify: `src/main.ts` (register Pinia)

**Interfaces:**
- Consumes: `BudgetRepository`, `computeMonth`, `cloneMonth`, `createEmptyMonth`
- Produces: store with `current`, `previous`, `settings`, `init()`, `setSalary`, `addOutgoing`, `updateOutgoing`, `removeOutgoing`, `addPot`, `renamePot`, `removePot`, `updateGoal`, `setRatio`, `ensureMonth(id)`, `saveError`, `readOnly`

- [ ] **Step 1: Write failing store tests using memory adapter**

Cover:

- `init` creates current calendar month if none exist
- editing salary recomputes discretionary
- `ensureMonth` for next month clones previous
- cannot `removePot` when `pot.system === true`
- save is called (spy) after edit (flush debounce with fake timers)

- [ ] **Step 2: Implement debounce + money helpers**

```ts
// src/utils/debounce.ts
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = () => {
    clearTimeout(t);
    // tests can call fn directly via store.saveNow()
  };
  return wrapped;
}
```

```ts
// src/utils/money.ts
export function formatGBP(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}£${Math.abs(n).toFixed(2)}`;
}
```

- [ ] **Step 3: Implement budgetStore**

Key behaviours:

- On any mutation: `current.computed = computeMonth(...)` then debounced `repo.saveMonth(current)` (300ms)
- `saveNow()` immediate save for tests/tab blur
- On save failure: set `saveError` message; try re-init fallback once if exposed; set `readOnly` if still failing
- `removePot`: throw/no-op if `system`
- Savings pots: no `addOutgoing` allowed for non-standard pots (guard)

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/stores src/utils src/main.ts
git commit -m "feat: add Pinia budget store with live recompute and save"
```

---

### Task 10: App shell — tabs and routing

**Files:**
- Modify: `src/App.vue`
- Modify: `src/router/index.ts`
- Create: `src/views/BudgetPage.vue` (stub)
- Create: `src/views/GoalsPage.vue` (stub)
- Create: `src/views/HistoryPage.vue` (stub)
- Create: `src/components/PersistenceBanner.vue`

**Interfaces:**
- Consumes: `useBudgetStore().init` on app mount
- Produces: IonTabs with Budget, Goals, History routes

- [ ] **Step 1: Wire router**

Routes:

- `/tabs/budget` → BudgetPage  
- `/tabs/goals` → GoalsPage  
- `/tabs/history` → HistoryPage  
- redirect `/` → `/tabs/budget`

Use Ionic Vue tabs pattern (`IonTabs`, `IonTabBar`, icons `wallet`, `flag`, `time`).

- [ ] **Step 2: Call store.init() in App.vue onMounted**

Show `PersistenceBanner` when `readOnly` or `saveError`.

Stub pages: single `IonPage` + title text each.

- [ ] **Step 3: Manual verify**

```bash
npm run dev
```

Expected: three tabs navigate; no console errors after init.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue src/router src/views src/components/PersistenceBanner.vue
git commit -m "feat: add tab shell for Budget, Goals, and History"
```

---

### Task 11: Budget page UI

**Files:**
- Modify: `src/views/BudgetPage.vue`
- Create: `src/components/MoneyInput.vue`
- Create: `src/components/OutgoingEditor.vue`
- Create: `src/components/PotSection.vue`
- Create: `src/components/UnderfundedBadge.vue`

**Interfaces:**
- Consumes: budget store actions/getters
- Produces: working Budget tab matching spec behaviour (not HTML styling)

- [ ] **Step 1: Implement MoneyInput**

Props: `modelValue: number`, `label: string`. Emit `update:modelValue` only for `>= 0`; reject negatives with inline error text.

- [ ] **Step 2: Implement PotSection + OutgoingEditor**

- Standard pots: list outgoings, add/remove/rename outgoing, edit amount
- Savings pots: show read-only allocated amount from `computed`, button/link “Edit in Goals”
- Pot header: rename; delete only if `!system`

- [ ] **Step 3: Assemble BudgetPage**

- Month label `current.id`
- Salary `MoneyInput`
- Summary card: Discretionary (`formatGBP`), allocated LT/ST, `UnderfundedBadge` if either underfunded
- Render pots by `sortOrder`
- Actions: “Add pot” (standard only), “Open next month” → `ensureMonth(nextYYYYMM)`

- [ ] **Step 4: Manual smoke**

Enter salary + outgoing → Discretionary updates live.

- [ ] **Step 5: Commit**

```bash
git add src/views/BudgetPage.vue src/components
git commit -m "feat: implement Budget tab with outgoings and live Discretionary"
```

---

### Task 12: Goals page UI

**Files:**
- Modify: `src/views/GoalsPage.vue`

**Interfaces:**
- Consumes: `updateGoal`, `setRatio`, `current.computed`

- [ ] **Step 1: Implement GoalsPage**

For Long and Short:

- Fields: name, target, current, deadline (`type="month"` → `YYYY-MM`)
- Display: required monthly, allocated, underfunded state, deadline-passed note

Priority ratio: range or two number inputs constrained so `long + short === 100` (editing long sets `short = 100 - long`).

Copy when underfunded: “Not enough leftover after outgoings to fund both goals at the required rate. Leftover is split by your priority ratio.”

- [ ] **Step 2: Manual smoke** — change deadline → required changes; tighten salary on Budget → underfunded appears on Goals.

- [ ] **Step 3: Commit**

```bash
git add src/views/GoalsPage.vue
git commit -m "feat: implement Goals tab with ratio and required monthly"
```

---

### Task 13: History page UI

**Files:**
- Modify: `src/views/HistoryPage.vue`
- Create: `src/domain/historyCompare.ts`
- Test: `src/domain/historyCompare.test.ts`

**Interfaces:**
- Consumes: stored `MonthSnapshot.computed` only
- Produces: `compareMonths(current, previous) => { rows, discretionaryDelta }`

- [ ] **Step 1: Write failing test for historyCompare**

Assert comparison uses `computed.potTotals` and `computed.discretionary` from snapshots — do **not** call `computeMonth` inside compare.

- [ ] **Step 2: Implement historyCompare + HistoryPage**

- Load `previous` as prior id in `listMonths` relative to current
- If no previous: message “Save another month to compare”
- Table/list: pot name → this / last / delta; Discretionary row

- [ ] **Step 3: Run unit test — PASS; manual smoke with two months**

- [ ] **Step 4: Commit**

```bash
git add src/domain/historyCompare.ts src/domain/historyCompare.test.ts src/views/HistoryPage.vue
git commit -m "feat: implement History this-vs-last comparison"
```

---

### Task 14: Persistence UX polish + README

**Files:**
- Modify: `src/components/PersistenceBanner.vue`
- Modify: `src/stores/budgetStore.ts` (retry / read-only paths if gaps)
- Create: `README.md`

- [ ] **Step 1: Banner copy**

- Read-only: “Persistence unavailable — changes won’t survive refresh.”
- Save error: “Couldn’t save — retrying. If this keeps failing, start the local API or check browser storage.”

- [ ] **Step 2: README**

Document:

- `npm install && npm run dev`
- `npm test`
- Postgres: create DB, `cd server && npm install && npm run dev`
- `VITE_FORCE_ADAPTER=browser|postgres`
- `RUN_PG_TESTS=1` for adapter tests
- Phase 1 scope pointer to design spec

- [ ] **Step 3: Full test run**

```bash
npm test
npm run build
```

Expected: all unit tests PASS; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add README.md src
git commit -m "docs: add README and persistence UX polish"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Ionic + Vue + Capacitor | 1 |
| Terminology pot/outgoing | 2, 11 |
| Starter pots | 2 |
| requiredMonthly + deadline passed | 3 |
| Ratio underfunded allocation + Discretionary | 4 |
| Dual persistence + probe fallback | 6–8 |
| Local Postgres API | 7 |
| Live recompute + debounced save | 9 |
| New month carry-forward | 9 |
| Tabs Budget/Goals/History | 10–13 |
| System savings pots no outgoings | 9, 11 |
| History uses stored computed | 13 |
| Error handling / read-only | 9, 14 |
| No partner/auth/transactions | Global — not implemented |

## Self-review notes

- Locked inclusive months-until rule in Global Constraints and Task 3
- No TBD placeholders in task steps
- Types aligned: `MonthSnapshot`, `BudgetRepository`, `LongShortRatio` reused throughout
- `memory` adapter used for tests and last-resort boot; production force flag uses `browser` \| `postgres`
