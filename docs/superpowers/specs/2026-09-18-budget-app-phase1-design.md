# Budget App — Phase 1 Design

**Date:** 2026-09-18  
**Status:** Approved for implementation planning  
**Stack:** Ionic + Vue, Capacitor wired from day one (browser-first development)

## Problem

Turn the manual monthly budgeting exercise (list outgoings, assign them to pots, see how salary splits) into an app. Phase 1 stops at what the HTML calculator demonstrated functionally — not its styling — and does **not** include transaction logging, bank import, auth, or multi-device sync.

Reference output behaviour only: `budget-pot-calculator.html` (personal sample numbers; not a design or branding reference).

## Goals

- Enter monthly outgoings (exact or approximate) under pots (categories)
- Enter salary; see a live report: split across pots and computed **Discretionary**
- Support one Long Term and one Short Term savings goal with target + deadline; compute required monthly contributions
- When both goals cannot be fully funded, split leftover by a user-set Long/Short priority ratio and flag underfunded goals
- Persist every month’s snapshot locally; Phase 1 UI compares **this month vs last month** only
- Ship as a tabbed Ionic app, testable in-browser, Capacitor-ready

## Non-goals (Phase 1)

- User accounts, login, invite-a-partner
- Multi-device sync / cloud
- Partner / joint household model (solo only)
- Multiple goals per savings pot
- Transaction / line-item logging (e.g. “£42 at Tesco”)
- Bank import or receipt scanning
- Trend charts (data is stored to enable them later)

## Terminology

| Term | Meaning |
|------|---------|
| **Pot** | A category bucket (e.g. Essentials, Debts, Travel) |
| **Outgoing** | A named monthly line item inside a pot (name + amount) |
| **Discretionary** | Always computed: never user-entered as a pot |
| **Goals** | The single Long Term + single Short Term savings targets attached to those two pots |

## Product shape — Approach 2 (tabbed shell)

| Tab | Responsibility |
|-----|----------------|
| **Budget** | Salary, pots with outgoings, live Discretionary, underfunded summary, current month |
| **Goals** | Long Term + Short Term goal fields, priority ratio, required vs allocated |
| **History** | This month vs previous month (table / stacked layout); no charts yet |

### Budget tab

- Salary field (take-home, monthly)
- Pots as sections; each lists editable outgoings (name + amount)
- Add / rename / remove pots (user-defined on top of starters)
- Discretionary is never shown as an editable pot
- Summary: allocated savings (LT/ST), Discretionary, underfunded badge when applicable
- Month label (`YYYY-MM`); new month auto-carries forward previous month’s salary, outgoings, goals, and ratio as an editable draft

### Goals tab

- Long Term: name, target, current saved, deadline → required monthly
- Short Term: same (exactly one of each)
- Priority ratio control (e.g. 70% LT / 30% ST)
- Copy explaining allocated vs required when underfunded

### History tab

- Compare current vs previous snapshot: per-pot totals + Discretionary delta
- Uses **stored** snapshot values (not recalculated with today’s formula if logic changes later)

## Starter pots

1. Essentials  
2. Debts  
3. Subscriptions  
4. Long Term Savings Goals  
5. Short Term Savings Goals  
6. Travel  

Users may add, rename, or remove **standard** pots. The two savings pots (`savings_long`, `savings_short`) are system pots: renameable, not removable, and they do **not** hold editable outgoings — their monthly amounts are the computed allocations from the goals engine. Discretionary remains computed-only.

## Savings & Discretionary logic

**Required monthly** for a goal (when target, current, and deadline are set):

- Remaining = `max(target − current, 0)`
- Months left = months from “now” (current budget month) to deadline (inclusive rules fixed in implementation; document in calc module)
- `requiredMonthly = remaining / monthsLeft` (if deadline passed: `requiredMonthly = remaining`, flagged “deadline passed”)
- Incomplete goal fields → required treated as `0` until target + deadline exist

**Allocation order each recalc:**

1. Sum all outgoings in **standard** pots only (Essentials, Debts, Subscriptions, Travel, and any user-added standard pots). Savings pots contribute no outgoing rows.
2. `leftover = salary − that sum`
3. Compute `requiredLT` and `requiredST`
4. If `requiredLT + requiredST ≤ leftover`: allocate both in full;  
   `Discretionary = leftover − requiredLT − requiredST`
5. If not: split `leftover` by user ratio (LT% / ST%); mark each goal underfunded if allocated < required;  
   `Discretionary = 0`

Budget tab may show the two savings pots as read-only allocated amounts (linking to Goals), not as outgoing editors.

Underfunded is an expected state (badge + explanation), not a hard error.

Negative outgoing/salary amounts: block via validation (do not coerce silently). Empty amounts: treat as `0`.

## Data model

```
Settings {
  longShortRatio: { long: number, short: number }  // sums to 100
  activeAdapter?: 'browser' | 'postgres'
}

Pot {
  id: string
  name: string
  sortOrder: number
  system: boolean          // starter pots may be flagged
  kind: 'standard' | 'savings_long' | 'savings_short'
}

Outgoing {
  id: string
  potId: string
  name: string
  amount: number           // monthly
}

Goal {
  potKind: 'savings_long' | 'savings_short'
  name: string
  target: number
  current: number
  deadline: string         // ISO date or YYYY-MM
}

MonthSnapshot {
  id: string               // YYYY-MM
  salary: number
  pots: Pot[]              // names/structure as of that month
  outgoings: Outgoing[]
  goals: { long: Goal, short: Goal }
  longShortRatio: { long: number, short: number }
  computed: {
    potTotals: Record<potId, number>
    allocatedLong: number
    allocatedShort: number
    requiredLong: number
    requiredShort: number
    discretionary: number
    underfundedLong: boolean
    underfundedShort: boolean
  }
}
```

Past snapshots keep pot names as saved; renaming a pot in the current month does not rewrite history.

## Architecture

```
Ionic Vue tabs (Budget | Goals | History)
        ↓
  App store (current month + settings)
        ↓
  Calc engine (pure functions)
        ↓
  BudgetRepository (interface)
     ├── BrowserAdapter (IndexedDB and/or Capacitor Preferences/SQLite)
     └── PostgresAdapter (thin local HTTP API → local Postgres)
```

- **No cloud backend, no auth.** Postgres, if used, is localhost-only.
- Capacitor is in the repo from day one; native builds wait until the product is stable.
- Develop and test in-browser first.

### Dual persistence (“try both”)

App code depends only on `BudgetRepository` (`loadMonth`, `saveMonth`, `listMonths`, `loadSettings`, `saveSettings`, categories/pots registry as needed).

On boot:

1. Probe browser adapter with a write/read round-trip
2. If it fails (e.g. ZScaler interference with IndexedDB), fall back to Postgres API
3. Dev flag/env may force an adapter

Both adapters are exercised during development so failures surface early.

## Data flow

**Write:** edit salary / outgoing / goal / ratio → update in-memory month → run calc → re-render Budget & Goals → debounced `saveMonth`.

**Read:** boot → load current month (or clone latest into new `YYYY-MM`) + settings → hydrate store.

**History:** `getMonth(current)` + `getMonth(previous)` → compare stored `computed` fields.

**New month:** clone previous snapshot (salary, outgoings, pots, goals, ratio) → new id → save → becomes current.

## Error handling

| Situation | Behaviour |
|-----------|-----------|
| Save failure | Keep in-memory edits; toast; retry; try fallback adapter once |
| Both adapters down | Read-only banner; calc still works; warn changes won’t persist |
| Deadline passed | Required = remaining; flag in Goals UI |
| Corrupt/partial snapshot | Fill missing fields with defaults; don’t crash |

## Testing

- **Unit:** calc engine — required monthly, full funding, underfunded ratio split, Discretionary, deadline passed, empty/zero inputs
- **Repository:** round-trip both adapters; boot probe + fallback; new-month clone
- **History:** assertions that comparison uses stored totals
- **Manual smoke:** outgoing edit updates Discretionary; underfunded badge; History after two months exist

## Out of scope reminders

Solo only — no `owner`, partner salary, or joint contribution lists in Phase 1 (may return later). Schema should not be shaped around transaction line-items.

## Open implementation details (resolve in plan, not product forks)

- Exact “months until deadline” rounding rule
- Whether browser adapter prefers IndexedDB vs Capacitor Preferences/SQLite as primary
- Postgres schema + minimal API shape (local only)
- Debounce timing for saves
