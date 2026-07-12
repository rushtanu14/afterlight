# Contributing

Afterlight is a Vite + React + TypeScript frontend with strict safety and evidence boundaries.

## Setup

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`.

## Available Scripts

<!-- AUTO-GENERATED:START scripts -->
Generated from `package.json`.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server on `127.0.0.1`. |
| `npm run build` | Run TypeScript project build checks, then create the production Vite build in `dist/`. |
| `npm run preview` | Serve the production build locally with Vite preview on `127.0.0.1`. |
| `npm run test` | Run the Vitest test suite. |
| `npm run test:e2e` | Run the mocked-source Playwright browser suite in desktop and mobile Chrome. |
<!-- AUTO-GENERATED:END scripts -->

## Environment and Secrets

The browser build uses no API credentials. Do not introduce a FIRMS key or any other credential through a `VITE_` variable: Vite exposes those values to the client. A credentialed provider requires a separate server proxy, secret management, rate controls, and privacy review.

Keep local environment files ignored. Commit only `.env.example`, and never place real credentials, raw credentialed URLs, or copied provider responses containing sensitive data in source, tests, screenshots, or docs.

## Source Layout

<!-- AUTO-GENERATED:START source-layout -->
Generated from `src/`.

| Path | Purpose |
|---|---|
| `src/App.tsx` | Orchestrates current-source requests, historical playback, judge mode, and scenario memory without crossing surface boundaries. |
| `src/components/LiveMonitor.tsx` | Displays current public incidents, alerts, and runtime source health without historical output or route advice. |
| `src/components/HistoricalReplay.tsx` | Displays attributable source rows, categorical action state, historical maps, evaluation, and case memory. |
| `src/components/HistoricalIncidentMap.tsx` | Renders stored historical road geometry, illustrative anchors, online OSM tiles, and an online ArcGIS perimeter. |
| `src/components/EvaluationPanel.tsx` | Compares Palisades/Eaton expected action rows and preserves Camp Fire as an unscored negative control. |
| `src/components/SafetyBoundary.tsx` | Keeps the current-guidance warning beside historical action state. |
| `src/data/replay.ts` | Defines categorical historical rows, route-memory states, and map provenance types. |
| `src/data/historicalScenarios.ts` | Stores the two loaded scenario bundles, map snapshots, and archive-only reference. |
| `src/engine/detector.ts` | Fails closed unless a recognized, internally consistent warning/order row supports `official_action`. |
| `src/engine/liveSources.ts` | Validates coarse-area input and normalizes Nominatim, NIFC WFIGS, NWS, and EONET responses. |
| `src/engine/memoryStorage.ts` | Sanitizes and persists versioned scenario confirmations and edits in browser `localStorage`. |
| `src/engine/judgeMode.ts` | Defines the deterministic 90-second proof schedule. |
| `src/styles.css` | Contains the charcoal/ember visual system, responsive behavior, and reduced-motion rules. |
<!-- AUTO-GENERATED:END source-layout -->

## Non-Negotiable Safety Rules

- Never connect a current incident or alert to historical detector output, route memory, or household cards.
- Never emit a historical action state without an attributable warning/order row and detector verification.
- Never add an exact evacuation time, numeric route-risk score, current route recommendation, or fire-spread prediction.
- Never fabricate a granular timeline for an archive-only incident.
- Label map points as illustrative unless their provenance changes and is tested.
- Label stored roads as historical OSM snapshots; do not imply current road status.
- Keep standard OpenStreetMap tiles online-only. Do not add tile prefetching or offline-map claims.
- Keep FIRMS server-proxy-only; no browser key or request.
- Keep displayed external event links fixed or allowlisted HTTPS targets.
- Preserve the visible safety boundary and reduced-motion behavior.

## Privacy Rules

- Accept only city, ZIP, or neighborhood search input; reject street addresses, units, coordinate pairs, control characters, and oversized values before network access.
- Remember that the browser shares the area query with Nominatim and the resulting coordinates/bounds with current-source providers.
- Keep user-facing errors redacted: no API key, raw request URL, exact address, or query-coordinate leakage.
- Treat `localStorage` memory as untrusted, device-local convenience data—not secure storage.
- Do not add medical, identity, exact-address, or access-code fields to household memory without a new privacy/security design.
- Keep scenario updates immutable and scenario-scoped.

## Verification

Before sharing a change:

```bash
npm test
npm run build
git diff --check
```

Run any browser/E2E command present in `package.json` when changing UI, judge mode, accessibility, responsive behavior, maps, or current-source interactions.

Add or update the focused tests for the boundary you changed:

- `tests/detector.test.ts` for warning/order verification and fail-closed behavior.
- `tests/historicalScenarios.test.ts` for source manifests, maps, and three-case evaluation.
- `tests/liveSources.test.ts` for query privacy, feed normalization, redacted failures, and source states.
- `tests/memoryStorage.test.ts` for device-local scenario isolation and sanitization.
- `tests/judgeMode.test.ts` for deterministic 90-second coverage.

## Documentation and Submission Honesty

When behavior changes, update `README.md`, `docs/RUNBOOK.md`, `docs/moonshot-paper.md`, `docs/vision-presentation.md`, and `docs/judge-brief.md` as applicable. Do not claim deployment, video, provider reliability, participant outcomes, or human feedback without direct evidence.

**Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
