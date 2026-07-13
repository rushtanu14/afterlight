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
| `npm run test:coverage` | Run Vitest with V8 coverage for the unit/integration suite. |
| `npm run test:e2e` | Run the mocked-source Playwright browser suite in desktop and mobile Chrome. |
<!-- AUTO-GENERATED:END scripts -->

## Environment and Secrets

The browser build uses no API credentials. The geocoder function uses server-only Upstash-compatible Redis REST values. Do not introduce Redis, FIRMS, or any other credential through a `VITE_` variable: Vite exposes those values to the client. Any new credentialed provider requires a separate server boundary, secret management, rate controls, and privacy review.

Keep local environment files ignored. Commit only `.env.example`, and never place real credentials, raw credentialed URLs, or copied provider responses containing sensitive data in source, tests, screenshots, or docs.

## Source Layout

<!-- AUTO-GENERATED:START source-layout -->
Generated from `src/`.

| Path | Purpose |
|---|---|
| `src/App.tsx` | Orchestrates current-source requests, historical playback, scenario memory, and separate drill state without crossing surface boundaries; judge mode remains isolated from saved device data. |
| `api/geocode.ts` | Exposes the production-fail-closed Vercel Web Handler for same-origin coarse-area lookup. |
| `api/_lib/geocodeService.ts` | Enforces bounded streaming requests, origin/privacy boundaries, hashed cache/client keys, minimized provider normalization, quotas, and one total deadline. |
| `api/_lib/geocodeStore.ts` | Provides shared Redis cache, per-client request quotas, provider-miss capacity, provider pacing, and bounded local memory behavior. |
| `api/_lib/geocodeRuntime.ts` | Validates provider/env configuration and selects production Redis or local memory state. |
| `api/_lib/viteGeocodeMiddleware.ts` | Mounts the same Web Handler contract in local Vite development with bounded request buffering. |
| `src/components/LiveMonitor.tsx` | Displays current public incidents, alerts, provider freshness, and runtime source-check time without historical output or route advice. |
| `src/components/HistoricalReplay.tsx` | Displays attributable source rows, categorical action state, historical maps, evaluation, and case memory. |
| `src/components/PreparednessWorkspace.tsx` | Displays pre-incident constraints, coarse household decisions, assigned drill tasks, historical provenance, practice state, and the printable card. |
| `src/components/HistoricalIncidentMap.tsx` | Renders stored historical road geometry, illustrative anchors, online OSM tiles, and an online ArcGIS perimeter. |
| `src/components/EvaluationPanel.tsx` | Compares Palisades/Eaton expected action rows and preserves Camp Fire as an unscored negative control. |
| `src/components/SafetyBoundary.tsx` | Keeps the current-guidance warning beside historical action state. |
| `src/data/replay.ts` | Defines categorical historical rows, route-memory states, and map provenance types. |
| `src/data/historicalScenarios.ts` | Stores the two loaded scenario bundles, map snapshots, and archive-only reference. |
| `src/engine/detector.ts` | Fails closed unless a recognized, internally consistent warning/order row supports `official_action`. |
| `src/engine/liveSources.ts` | Validates coarse-area input, calls same-origin `/api/geocode`, and normalizes NIFC WFIGS, NWS, and EONET responses. |
| `src/shared/geocodeContract.ts` | Shares query validation and the minimized proxy response contract between browser and server. |
| `src/engine/memoryStorage.ts` | Sanitizes and persists versioned scenario confirmations and edits in browser `localStorage`. |
| `src/engine/drillPlan.ts` | Derives baseline, constraint, and historical-lesson practice tasks without producing a readiness score. |
| `src/engine/drillStorage.ts` | Sanitizes and persists the separate bounded drill payload in browser `localStorage`. |
| `src/engine/judgeMode.ts` | Defines the deterministic 90-second proof schedule. |
| `src/styles.css` | Contains the charcoal/ember visual system, responsive behavior, and reduced-motion rules. |
| `vercel.json` | Defines production document security headers for the Vercel deployment path. |
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
- Keep Nominatim behind same-origin `POST /api/geocode`; never restore direct browser geocoding.
- Keep deployed geocoding fail-closed without shared Redis; never use per-instance memory as production rate control.
- Keep the Redis-backed per-client request quota, provider-miss circuit breaker, provider pacing, total function deadline, and deployment-platform WAF release gate intact. Cache hits must not consume provider capacity.
- Keep displayed external event links fixed or allowlisted HTTPS targets.
- Keep the drill pre-incident-only. Never turn assignments, practiced flags, or print output into current routes, timing, hazard predictions, or a `safe`/`ready` score.
- Preserve unresolved assignments in the UI and print card. Completion styling must not resemble safety certification.
- Require a coarse decision plus primary and backup roles before practice; changing any of them must invalidate the practiced handoff.
- Preserve the visible safety boundary and reduced-motion behavior.

## Privacy Rules

- Accept only text-only city/neighborhood input or a standalone ZIP; reject mixed text-plus-number queries, street addresses, units, coordinate pairs, control characters, and oversized values before network access.
- Remember that the browser shares the area query with the Afterlight server, the server shares it with Nominatim, and the browser shares returned coordinates/bounds with NIFC, NWS, and EONET.
- Keep cache keys one-way hashed, cache values minimized, and raw queries out of logs, storage keys, errors, and response metadata.
- Keep the geocoder provider on the fixed official Nominatim host, reject redirects, and reject credentials, private/local hosts, query strings, and fragments.
- Keep user-facing errors redacted: no API key, raw request URL, exact address, or query-coordinate leakage.
- Treat `localStorage` memory as untrusted, device-local convenience data—not secure storage.
- Keep `?judge=1` fully ephemeral: do not load, render, overwrite, or clear saved household memory or drill payloads from the demo surface.
- Do not add medical, identity, exact-address, or access-code fields to household memory without a new privacy/security design.
- Drill decisions must remain task-specific allowlisted choices; arbitrary decision text must fail closed during updates and storage sanitization. Do not add full-name, phone, route, exact-address, medication-detail, access-code, or live-location fields.
- Keep `afterlight.household-memory.v1` and `afterlight.household-drill.v1` separate and independently clearable.
- Purge a historical lesson's drill assignment when that lesson is unconfirmed or its case memory is cleared.
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
- `tests/geocodeProxy.test.ts` for coarse-query grammar, bounded requests, client/provider quotas, cache-hit capacity behavior, minimized cache behavior, provider pacing, deadlines, and safe failures.
- `tests/geocodeRuntime.test.ts` for Redis/provider configuration and atomic slot/quota parsing.
- `tests/geocodeApi.test.ts` and `tests/viteGeocodeMiddleware.test.ts` for deployed/local HTTP adapters.
- `tests/memoryStorage.test.ts` for device-local scenario isolation and sanitization.
- `tests/drillPlan.test.ts` for deterministic task derivation, immutable decision/role updates, practice invalidation, dates, hidden-data purge, and no readiness score.
- `tests/drillStorage.test.ts` for bounded drill persistence, unknown-field rejection, and unavailable-storage behavior.
- `tests/judgeMode.test.ts` for deterministic 90-second coverage.

## Documentation and Submission Honesty

When behavior changes, update `README.md`, `docs/RUNBOOK.md`, `docs/moonshot-paper.md`, `docs/vision-presentation.md`, and `docs/judge-brief.md` as applicable. Do not claim deployment, video, provider reliability, participant outcomes, or human feedback without direct evidence.

**Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
