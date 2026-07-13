# Household Drill Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Turn Afterlight's attributable historical lessons into a device-local, printable household drill with concrete coarse decisions, assigned primary/backup responsibilities, visible unresolved questions, and a dated practice record.

**Architecture:** Add a pure drill domain module that derives base, constraint-specific, and confirmed historical-lesson tasks. Persist only bounded non-sensitive assignments and practice state in a separate versioned localStorage payload. Render one product-focused preparedness workspace after the historical replay, with an asymmetric task/print-card layout and no current evacuation advice.

**Tech Stack:** React 19, TypeScript, CSS, browser localStorage/print, Vitest, Playwright.

## Global Constraints

- Preserve `public/images/afterlight-hero.jpg` as the live hero and keep Higgsfield media demo-only.
- Never import `docs/assets/demo/afterlight-higgsfield-opening.png` into `src/` or `public/`.
- Do not produce routes, leave times, predictions, alert decisions, safety scores, or `ready`/`safe` certification language.
- Keep current monitoring, historical evidence, and household drill state visibly and structurally separate.
- Collect only bounded role labels and task-specific allowlisted decision choices, not arbitrary text, routes, exact addresses, medical details, phone numbers, access codes, or full legal names.
- Store drill state on the current device only; bound and sanitize every persisted field.
- Print output must say `Practice card · not emergency guidance` and expose unresolved assignments.
- Preserve keyboard access, reduced-motion equivalence, 320px responsiveness, and current charcoal/ember visual language.
- Do not commit, push, merge, deploy, or spend additional Higgsfield credits in this task.

---

### Task 1: Pure drill domain and RED tests

**Files:**
- Create: `src/engine/drillPlan.ts`
- Create: `tests/drillPlan.test.ts`

**Interfaces:**
- Produces `ConstraintId`, `DrillAssignment`, `DrillState`, `HistoricalLessonInput`, `buildDrillTasks`, `summarizeDrill`, `updateDrillAssignment`, `toggleDrillConstraint`, and `recordDrillPractice`.

- [x] **Step 1: Write failing tests**

Test that base tasks always exist, constraints add only relevant tasks, edited historical lessons are labeled as household adaptations, practiced state requires an allowlisted decision plus primary and backup roles, changed assignments reset practice, updates are immutable, hidden lesson assignments can be purged, and summary language exposes unresolved tasks without a readiness score.

- [x] **Step 2: Verify RED**

Run: `npx vitest run tests/drillPlan.test.ts`

Expected: fail because `src/engine/drillPlan.ts` does not exist.

- [x] **Step 3: Implement the minimal pure domain**

Use stable IDs, deterministic task ordering, bounded role/action drafts, immutable state updates, strict ISO-date validation, and a summary shaped as `{ total, unassigned, assigned, practiced, historicalLessons, lastPracticedOn }`.

- [x] **Step 4: Verify GREEN**

Run: `npx vitest run tests/drillPlan.test.ts`

Expected: all drill-domain tests pass.

---

### Task 2: Versioned local persistence and RED tests

**Files:**
- Create: `src/engine/drillStorage.ts`
- Create: `tests/drillStorage.test.ts`

**Interfaces:**
- Consumes `DrillState` and domain sanitizers from Task 1.
- Produces `DRILL_STORAGE_KEY`, `loadDrillState`, `saveDrillState`, `sanitizeDrillState`, and `clearSavedDrill`.

- [x] **Step 1: Write failing tests**

Cover empty startup, round-trip persistence, oversized payload rejection, unknown constraint/task removal, role/action truncation, invalid date removal, incomplete-practice invalidation, unavailable storage, and clear behavior.

- [x] **Step 2: Verify RED**

Run: `npx vitest run tests/drillStorage.test.ts`

Expected: fail because the storage module does not exist.

- [x] **Step 3: Implement bounded storage**

Use a separate `afterlight.household-drill.v1` key. Cap the serialized payload at 20,000 characters, role labels at 48 characters, and reject any decision outside the task's allowlist. Never migrate historical memory into drill state automatically.

- [x] **Step 4: Verify GREEN**

Run: `npx vitest run tests/drillStorage.test.ts`

Expected: all drill-storage tests pass.

---

### Task 3: Preparedness workspace and browser RED test

**Files:**
- Create: `src/components/PreparednessWorkspace.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/styles.css`
- Modify: `tests/app.spec.ts`

**Interfaces:**
- Consumes current `MemoryState` plus historical scenarios to create evidence-linked lesson inputs.
- Persists drill state independently and renders `#practice`.

- [x] **Step 1: Write a failing Playwright flow**

Prove that the existing hero background remains `afterlight-hero.jpg`, no Higgsfield demo asset is requested, selecting mobility and pets adds relevant tasks, normal keyboard typing preserves spaces, action/primary/backup assignment persists after reload, practice recording is gated on a completed handoff, historical lesson provenance appears after confirmation, removed lessons purge hidden data, and the print card says it is not emergency guidance.

- [x] **Step 2: Verify RED**

Run: `npx playwright test tests/app.spec.ts --grep "builds a household drill" --project=desktop-chrome`

Expected: fail because the preparedness workspace does not exist.

- [x] **Step 3: Implement the workspace**

Use an asymmetric two-column product layout. The setup rail contains household constraints and evidence count. The main column contains divided task rows with source/provenance, structured decision, owner role, backup role, and practiced state. Controls follow the ledger on narrow screens. The print artifact is always visible and becomes the only printable surface under `@media print`; synthetic judge preview cannot print.

- [x] **Step 4: Verify GREEN and responsive behavior**

Run the focused desktop test, then extend the existing 320/390 overflow selector to cover the new section and run the focused mobile project.

---

### Task 4: Product copy, docs, and release verification

**Files:**
- Modify: `src/components/OfflineSection.tsx`
- Modify: `README.md`
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/CONTRIBUTING.md`
- Modify: `docs/judge-brief.md`
- Modify: `docs/moonshot-paper.md`
- Modify: `docs/vision-presentation.md`
- Modify: `PRODUCT.md`

**Interfaces:**
- Documents the drill as pre-incident practice, not current emergency guidance or field validation.

- [x] **Step 1: Update product and operational copy**

Explain the concrete workflow: choose non-sensitive constraints, select a task-specific coarse decision, assign primary and backup roles, carry over confirmed evidence-linked lessons, practice, print, and repeat. State official-reference, storage, privacy, print, and non-claim boundaries.

- [x] **Step 2: Run focused and full verification**

Run:

```bash
npm test -- --run
npm run test:coverage
npm run build
npm run test:e2e
npm audit --audit-level=high
git diff --check
rg -n "afterlight-higgsfield-opening" src public
```

Expected: unit/build/browser/audit/diff all pass; the Higgsfield scan returns no product imports.

- [x] **Step 3: Review safety and usefulness**

Confirm the finished app has a real household action path, source provenance, assignment ownership, unresolved-gap visibility, and printable practice output while retaining every current/historical trust boundary.

- [x] **Step 4: Update existing CSB state**

Capture branch, feature boundary, storage key, verification evidence, remaining external validation, and the unchanged Higgsfield credit rule without storing sensitive data.

---

### Task 5: Independent review remediation

**Files:**
- Modify: drill, live-monitor, geocoder, deployment-header, test, demo-receipt, and documentation files identified by review.

- [x] **Step 1: Fix practical drill defects**

Preserve spaces during controlled typing, require the action/primary/backup triad, reset stale practice, purge hidden lesson assignments, move mobile actions after the ledger, isolate print output, and make reduced-motion judge navigation reveal the announced phase.

- [x] **Step 2: Fix proxy and current-data trust defects**

Reject reverse/street-abbreviation address bypasses, stream the 1 KB body limit, add hashed per-client request and provider-miss Redis quotas, use one sub-10-second deadline, reject redirects, pin the official provider host, and display provider/alert/check freshness.

- [x] **Step 3: Harden public artifacts**

Add deployment document security headers, remove public Higgsfield job/balance metadata while preserving the private CSB receipt, strip PNG metadata without changing pixels, and keep the asset demo-only.

- [x] **Step 4: Repeat independent review and the complete release gate**

No prior P0/P1 finding may remain. Treat deployment/WAF/credentials/public smoke and real human validation as external gates, not repository claims.
