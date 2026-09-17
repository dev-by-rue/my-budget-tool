# Budget App — Phase 1 Brief

## What this is
A tool that takes the manual budgeting exercise (list your outgoings, categorise them, see how your salary splits) and turns it into an app. Phase 1 stops at the point the HTML calculator already reached — it does not extend into transaction logging or ongoing spend tracking.

## Core loop
1. User enters their outgoings — amounts can be exact or approximate
2. User assigns each outgoing to a category
3. User enters salary (their own, and optionally a partner's — see Household below)
4. App outputs a report: the split across categories, and a computed **Discretionary** figure

**Discretionary is never entered — it is always calculated:**
`Discretionary = Salary − sum(all other category totals)`, recalculated live whenever any input changes.

## Household model
- One shared local dataset — **not** two separate accounts. No auth, no invite flow, no sync in Phase 1.
- Every outgoing/pot carries an `owner` field: `you`, `partner`, or `joint`.
- Individual pots (income, essentials, debt, subscriptions, personal savings) belong to one person.
- Joint pots (shared savings goals) belong to neither person individually:
  - Have their own `target` and `current` total
  - Carry a `contributions` list recording what each person put in, for transparency
- Views needed:
  - Individual (filtered by owner)
  - Combined household total (sum of everything, regardless of owner)
  - Joint pot detail (contributions breakdown)

## Data model shape
- A **pot** = `{ name, owner: 'you' | 'partner' | 'joint', category, amount, target?, current?, contributions? }`
- Pots are monthly totals, not individual transactions. No line-item/transaction logging in Phase 1 (may come later, but Phase 1's schema should not be shaped around it).
- Categories: **still open** — see Open Questions below.

## History
- Purpose is **trend visualisation** — seeing how categories change month to month — not just convenience/reuse of last month's setup.
- Each month's snapshot (categories, amounts, computed Discretionary) must persist as its own record — current month cannot simply overwrite the previous one.
- Exact depth/format: **still open** — see Open Questions below.

## Stack & shipping
- Ionic + Vue
- Capacitor wired into the repo from day one, but not required for development — build and test in-browser first (PWA-style)
- Native (iOS/Android) build becomes relevant once the product is stable, not before

## Explicitly out of scope for Phase 1
- User accounts / login / invite-a-partner flow
- Multi-device sync
- Transaction/line-item logging (e.g. "£42 at Tesco")
- Bank import or receipt scanning

## Open questions to resolve next
1. **History depth & display** — is Phase 1 a simple this-month-vs-last-month comparison (table, no chart), or a multi-month trend chart from the start? (Multi-month charting pulls in more data modeling — e.g. handling categories that get renamed or dropped between months — so this is a real scope fork, not a detail.)
2. **Categories** — fixed predefined set (Essentials, Debt, Subscriptions, Food, Petrol, Tobacco, with Discretionary always computed) or fully user-defined (free text, e.g. user types "Pets" as a new category)?