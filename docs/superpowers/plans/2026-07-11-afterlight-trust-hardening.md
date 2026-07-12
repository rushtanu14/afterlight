# Afterlight Trust Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Afterlight honestly separate current public-source monitoring from source-row historical replay, then add trustworthy judge evidence, persistence, privacy protections, responsive QA, and a deterministic 90-second judge run.

**Architecture:** Keep `src/engine/liveSources.ts` as a current-signal monitor that never drives route or evacuation advice. Introduce typed historical scenarios for Palisades and Eaton using the preserved official FSRI/LA County rows and incident-specific map geometry, and drive the replay/detector only from the selected historical scenario. Keep household memory device-local and case-scoped. Derive all status labels from runtime state instead of static connector metadata.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Leaflet, Playwright with installed Chrome.

## Global Constraints

- Afterlight is not official emergency guidance; follow current local authorities during an active incident.
- Live incidents and alerts must never be presented as if they own the historical replay, route memory, or detector output.
- Historical action states require an attributable official evacuation warning or order row.
- No exact-minute evacuation prediction or unsupported live route recommendation.
- Do not fabricate timelines for incidents without loaded official rows.
- Do not expose FIRMS keys, raw request URLs, exact street addresses, or unvalidated external links.
- OpenStreetMap standard tiles are online display only; do not claim or implement offline tile prefetching.
- Preserve the current charcoal/ember documentary design and respect reduced motion.

---

### Task 1: Safety-gated historical model and two official scenario bundles

**Files:**
- Replace: `src/data/replay.ts`
- Create: `src/data/historicalScenarios.ts`
- Replace: `src/engine/detector.ts`
- Modify: `tests/detector.test.ts`
- Create: `tests/historicalScenarios.test.ts`

**Interfaces:**
- Produces: `HistoricalScenario`, `HistoricalEvent`, `ArchiveReference`, `historicalScenarios`, `archiveReferences`, `getHistoricalScenario(id)`.
- Produces: `evaluateHistoricalEvent(event): HistoricalDecision` and `evaluateScenario(events): HistoricalDecision[]`.
- `HistoricalEvent.officialSignal` is one of `red_flag | evacuation_warning | evacuation_order | road_closure`; each event carries `sourceUrl`, `officialRecord`, route-memory state, map point, and source text.

- [ ] **Step 1: Write failing detector safety tests**

```ts
test("never emits an official action without a warning or order row", () => {
  const decision = evaluateHistoricalEvent({ ...palisades.events[2], officialSignal: "red_flag" });
  expect(decision.mode).toBe("prepare");
});

test("uses official warning and order rows as the historical action gate", () => {
  expect(evaluateHistoricalEvent(palisades.events[3]).mode).toBe("official_action");
  expect(evaluateHistoricalEvent(palisades.events[4]).mode).toBe("official_action");
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/detector.test.ts tests/historicalScenarios.test.ts`
Expected: FAIL because the new historical interfaces do not exist.

- [ ] **Step 3: Add source-row event/scenario types and port only the verified Palisades/Eaton records**

```ts
export type HistoricalEvent = {
  id: string;
  timestamp: string;
  displayTime: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  officialSignal: OfficialSignal;
  officialRecord: OfficialRecord;
  narrative: string;
  routePlan: RoutePlan;
  mapPointId: string;
  failureLesson: string;
  futureLesson: string;
};

export type HistoricalScenario = {
  id: "palisades-2025" | "eaton-2025";
  name: string;
  region: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceNote: string;
  mapGeometry: IncidentMapGeometry;
  events: HistoricalEvent[];
};

export type ArchiveReference = {
  id: "camp-2018";
  name: "Camp Fire";
  sourceUrl: string;
  evaluationStatus: "insufficient_official_rows";
};
```

- [ ] **Step 4: Implement categorical detector logic**

```ts
const isOfficialAction = (signal: OfficialSignal) =>
  signal === "evacuation_warning" || signal === "evacuation_order";

export function evaluateHistoricalEvent(event: HistoricalEvent): HistoricalDecision {
  return {
    mode: isOfficialAction(event.officialSignal) ? "official_action" : "prepare",
    officialSignal: event.officialSignal,
    primaryRouteMemory: getPrimaryRoute(event.routePlan),
    alternateRouteMemory: getBackupRoute(event.routePlan),
    triggerSummary: isOfficialAction(event.officialSignal)
      ? "This historical row contains an official warning or order. It is not current guidance."
      : "This historical row is an early pattern signal, not an evacuation instruction."
  };
}
```

- [ ] **Step 5: Run GREEN**

Run: `npm test -- tests/detector.test.ts tests/historicalScenarios.test.ts`
Expected: PASS with both scenarios, chronological rows, source URLs, and official-action gates covered.

### Task 2: Harden current-source ingestion, privacy, errors, and source health

**Files:**
- Modify: `src/engine/liveSources.ts`
- Replace: `src/engine/sourceConnectors.ts`
- Modify: `tests/liveSources.test.ts`
- Modify: `tests/sourceConnectors.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `validateAreaQuery(query): { ok: true; query: string } | { ok: false; message: string }`.
- Produces: `summarizeSourceHealth(states): SourceHealthSummary`.
- `SourceFetchError` stores `sourceId` and `status`, never a URL.

- [ ] **Step 1: Write failing regression tests**

```ts
test("rejects street-address precision", () => {
  expect(validateAreaQuery("123 Main Street, Pasadena")).toMatchObject({ ok: false });
  expect(validateAreaQuery("Pasadena, CA")).toMatchObject({ ok: true });
});

test("never leaks FIRMS keys in a source error", async () => {
  const bundle = await loadLiveIncidentBundle("Pasadena, CA", { fetcher, firmsMapKey: "secret-map-key" });
  expect(JSON.stringify(bundle)).not.toContain("secret-map-key");
});

test("selects the newest valid EONET geometry", async () => {
  expect(bundle.incidents[0]?.lastUpdated).toContain("Jul");
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/liveSources.test.ts tests/sourceConnectors.test.ts`
Expected: FAIL on missing validation/health APIs, key leakage, and old EONET geometry selection.

- [ ] **Step 3: Implement safe validation, redacted errors, newest geometry, URL allowlisting, and actual health**

```ts
export function summarizeSourceHealth(states: LiveSourceState[]) {
  const checked = states.filter((state) => state.status !== "optional").length;
  const usable = states.filter((state) => state.status === "live" || state.status === "quiet").length;
  return { checked, usable, degraded: checked - usable };
}
```

- [ ] **Step 4: Ignore every local env file except the template**

```gitignore
.env*
!.env.example
```

- [ ] **Step 5: Run GREEN**

Run: `npm test -- tests/liveSources.test.ts tests/sourceConnectors.test.ts`
Expected: PASS with no query, coordinate, URL, or key leakage in displayed errors.

### Task 3: Separate Live Source Monitor from Historical Replay and persist case-scoped memory

**Files:**
- Create: `src/engine/memoryStorage.ts`
- Create: `src/engine/judgeMode.ts`
- Replace: `src/App.tsx`
- Replace: `src/components/ReplayWorkspace.tsx`
- Create: `src/components/LiveMonitor.tsx`
- Create: `src/components/HistoricalReplay.tsx`
- Create: `src/components/SafetyBoundary.tsx`
- Create: `tests/memoryStorage.test.ts`
- Create: `tests/judgeMode.test.ts`

**Interfaces:**
- `LiveMonitor` receives only `LiveIncidentBundle`; it renders source health, current incidents/signals, and geospatial points without route advice.
- `HistoricalReplay` receives one `HistoricalScenario`, decisions, active row, and case-scoped memory.
- `loadMemoryState`, `saveMemoryState`, and `sanitizeMemoryState` use a versioned localStorage payload keyed by scenario.
- `getJudgeStep(elapsedMs)` deterministically maps `0..89_999` ms across Palisades and Eaton rows.
- `?judge=1` starts the same deterministic run and moves through thesis, official rows, memory output, evaluation, and safety boundary.

- [ ] **Step 1: Write failing persistence and judge-mode tests**

```ts
test("keeps confirmations and edits scoped to a historical scenario", () => {
  const state = sanitizeMemoryState({ version: 1, scenarios: { "palisades-2025": { confirmedIds: ["p1"], edits: {} } } });
  expect(state.scenarios["eaton-2025"]).toBeUndefined();
});

test("covers both official scenarios in exactly 90 seconds", () => {
  expect(getJudgeStep(0).scenarioId).toBe("palisades-2025");
  expect(getJudgeStep(89_999).scenarioId).toBe("eaton-2025");
  expect(getJudgeStep(90_000)).toBeNull();
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/memoryStorage.test.ts tests/judgeMode.test.ts`
Expected: FAIL because storage/judge modules do not exist.

- [ ] **Step 3: Implement versioned local persistence without pre-confirmed failures**

```ts
export const EMPTY_MEMORY_STATE: MemoryState = { version: 1, scenarios: {} };

export function updateScenarioMemory(state: MemoryState, scenarioId: string, update: ScenarioMemory): MemoryState {
  return { ...state, scenarios: { ...state.scenarios, [scenarioId]: { ...update } } };
}
```

- [ ] **Step 4: Rebuild app orchestration with a request sequence guard**

```ts
const requestIdRef = useRef(0);
const requestId = ++requestIdRef.current;
const bundle = await loadLiveIncidentBundle(query);
if (requestId !== requestIdRef.current) return;
setLiveBundle(bundle);
```

- [ ] **Step 5: Render the persistent safety boundary beside every replay action state**

```tsx
<SafetyBoundary>
  Historical replay only. Not current emergency guidance. Follow local evacuation orders and agencies.
</SafetyBoundary>
```

- [ ] **Step 6: Run GREEN**

Run: `npm test -- tests/memoryStorage.test.ts tests/judgeMode.test.ts`
Expected: PASS with no initial confirmation, scenario isolation, raw editing preserved, and 90-second coverage.

### Task 4: Restore incident-specific real maps and add multi-fire evaluation

**Files:**
- Create: `src/components/HistoricalIncidentMap.tsx`
- Create: `src/components/EvaluationPanel.tsx`
- Modify: `src/components/HistoricalReplay.tsx`
- Modify: `package.json`
- Modify: `tests/historicalScenarios.test.ts`

**Interfaces:**
- `HistoricalIncidentMap` consumes only stored scenario geometry and official-row points; it never accepts a live incident.
- `EvaluationPanel` compares Palisades and Eaton row counts, first official-action rows, source coverage, and detector behavior, plus Camp Fire as an explicit negative control whose granular replay is blocked because official rows are not loaded.

- [ ] **Step 1: Add Leaflet dependencies and exact scenario-map assertions**

Run: `npm install leaflet && npm install -D @types/leaflet`

```ts
test("ships incident-specific perimeter and road provenance", () => {
  expect(palisades.mapGeometry.perimeterLayer?.sourceUrl).toMatch(/^https:\/\//);
  expect(eaton.mapGeometry.roadSnapshots.length).toBeGreaterThan(0);
});

test("refuses to score an archive-only incident", () => {
  expect(archiveReferences[0].evaluationStatus).toBe("insufficient_official_rows");
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/historicalScenarios.test.ts`
Expected: FAIL until the stored map geometry is present.

- [ ] **Step 3: Port the preserved real-map implementation with safe text-only marker DOM**

```tsx
<div
  className="historical-map-canvas"
  ref={mapElementRef}
  aria-label={`${scenario.name} historical source map`}
/>
```

Use DOM nodes/textContent for Leaflet div icons instead of interpolated HTML. Label every road as `historical OSM road snapshot`, not open/recommended.

- [ ] **Step 4: Render evaluation proof**

```tsx
<EvaluationPanel scenarios={historicalScenarios} evaluate={evaluateScenario} />
```

- [ ] **Step 5: Run GREEN**

Run: `npm test -- tests/historicalScenarios.test.ts && npm run build`
Expected: PASS; no static SVG route or hazard overlay remains over live maps.

### Task 5: Responsive, accessibility, motion, and browser regression suite

**Files:**
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/EmberCanvas.tsx`
- Modify: `src/components/OfflineSection.tsx`
- Replace: `src/styles.css`
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/app.spec.ts`

**Interfaces:**
- Location form uses `aria-describedby`, `role=status`, a disabled loading button, and neighborhood/ZIP privacy copy.
- Mobile grids use `minmax(0, 1fr)` and children use `min-width: 0`.
- Browser suite runs installed Chrome on desktop and 390px mobile.

- [ ] **Step 1: Add Playwright and write failing browser tests**

Run: `npm install -D @playwright/test`

```ts
test("keeps live and historical evidence separate", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Live Source Monitor")).toBeVisible();
  await expect(page.getByText("Historical Replay")).toBeVisible();
  await expect(page.getByText(/Not current emergency guidance/i)).toBeVisible();
});

test("has no masked horizontal overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const boxes = await page.locator("h1, .hero-copy, .hero-actions, .search-console").evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().right)
  );
  expect(Math.max(...boxes)).toBeLessThanOrEqual(390);
});
```

- [ ] **Step 2: Run RED**

Run: `npm run test:e2e`
Expected: FAIL on missing mode headings/safety copy and mobile overflow.

- [ ] **Step 3: Fix grid min-content overflow, status semantics, hover gating, and reduced motion**

```css
.hero-layout,
.ops-grid,
.lower-grid { grid-template-columns: minmax(0, 1fr); }
.hero-content,
.search-console,
.workspace > * { min-width: 0; }
@media (hover: hover) and (pointer: fine) { /* hover transforms */ }
@media (prefers-reduced-motion: reduce) { #emberCanvas { display: none; } }
```

- [ ] **Step 4: Run GREEN and capture screenshots**

Run: `npm run test:e2e`
Expected: PASS on desktop and mobile with no horizontal overflow, console errors, or unsafe live-route copy.

### Task 6: Documentation, submission honesty, and full verification

**Files:**
- Modify: `README.md`
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/moonshot-paper.md`
- Modify: `docs/vision-presentation.md`
- Create: `docs/judge-brief.md`

**Interfaces:**
- Docs name the exact working surfaces and exact non-claims.
- Human validation is explicitly `Pending — no quote collected` until a real participant supplies one.

- [ ] **Step 1: Update architecture, privacy, source policy, evaluation, judge-mode, and safety docs**

```md
Afterlight has two separate surfaces: a live public-source monitor and a historical replay engine. Live source data never inherits the historical detector or route memory.
```

- [ ] **Step 2: Document the one external blocker honestly**

```md
Human validation: Pending. No participant quote is claimed in this repository.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
npm run test:e2e
npm audit --json
git diff --check
rg -n "Recommended route|Live incident map|Offline packet|live sources|2\.8 mi from searched area" src README.md docs
rg -n "AIza|sk-|ghp_|secret-map-key|VITE_FIRMS_MAP_KEY=" . -g '!node_modules/**' -g '!dist/**'
```

Expected: all gates pass; banned unsafe copy and secret markers have no unintended matches.

- [ ] **Step 4: Review the complete branch against this plan**

Expected: no Critical/Important findings remain; any external human-validation/deployment/video work is reported as an explicit non-code blocker, not fabricated.
