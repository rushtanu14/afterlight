# Afterlight

Afterlight is a React/Vite crisis-memory product with three deliberately separate surfaces: a **Live Source Monitor** for current public records, a **Historical Replay** for attributable official-source rows, and a device-local **Household Drill Builder** for pre-incident practice. Current records never inherit historical decisions or household drill output.

> **Safety boundary:** Afterlight is not official emergency guidance. During an active incident, follow current evacuation orders and public-safety agencies.

## What Works Now

### Live Source Monitor

- Accepts a city, ZIP code, or neighborhood and rejects street-address, unit, and raw-coordinate input.
- Posts coarse-area searches to the same-origin `/api/geocode` proxy; only the server contacts OpenStreetMap Nominatim.
- Requests current NIFC WFIGS incident points, NWS alerts, and NASA EONET wildfire events.
- Reports runtime source health as `live`, `quiet`, `limited`, `error`, or `optional`.
- Displays provider record time, alert effective time, and per-source request-check time so “current” never hides freshness.
- Shows current public records without evacuation timing, route advice, historical action states, or household memory output.
- Marks NASA FIRMS as server-proxy-only. The browser has no FIRMS key and makes no FIRMS request.

### Historical Replay

- Loads separate Palisades Fire and Eaton Fire scenario bundles with six attributable rows each.
- Preserves the row timestamp, source label, source URL, official record text, categorical signal, and case-specific map reference.
- Uses a categorical detector. Only a recognized, internally consistent evacuation-warning or evacuation-order row can produce `official_action`; every other or unverifiable row fails closed to `prepare`.
- Shows route names only as historical row memory with categorical states such as `not_stated_in_row`, `access_restricted`, or `blocked`.
- Stores user-confirmed lessons and bounded, privacy-guarded edits separately for each scenario in browser `localStorage`.
- Starts with no lesson pre-confirmed.

### Household Drill Builder

- Starts with three preparedness-baseline tasks, then adds only the tasks required by selected non-sensitive constraints such as mobility support, pets, essential power, medication continuity, or transportation backup.
- Carries user-confirmed historical lessons into the drill as evidence-linked interpretations: built-in text is labeled `Afterlight takeaway based on …`, while edited text is labeled `Household adaptation based on …` rather than official source text.
- Captures one bounded, non-sensitive household decision plus primary and backup roles for every task. All three are required before a handoff can be marked practiced, and any plan change clears the stale practiced mark/date.
- Records the last practice date after at least one complete handoff while keeping every remaining gap visible, without manufacturing a readiness score or claiming the household is safe.
- Produces a printable practice card labeled `not emergency guidance`, stores bounded drill state separately under `afterlight.household-drill.v1`, and prunes assignments that no longer belong to the current task set on load.
- Links directly to [CAL FIRE firePLANNER](https://plan.readyforwildfire.org/), [Ready.gov Make a Plan](https://www.ready.gov/plan), and [Red Cross wildfire preparedness](https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html).

### Evidence and Evaluation

- The evaluation panel compares expected warning/order rows with detector output for Palisades and Eaton.
- Camp Fire is the third evaluation case and an explicit negative control: it is not scored or replayed because granular official rows are not loaded.
- Historical maps connect each source row to a clearly labeled illustrative anchor, stored OpenStreetMap road geometry, and an attributable incident perimeter source.
- Road snapshots do not state current road status and are not recommendations.

## Architecture

| Surface | Source of truth | Boundary |
|---|---|---|
| App orchestration | `src/App.tsx` | Keeps current-source requests, historical playback, case memory, and drill state separate; judge mode uses isolated in-memory state and never reads or writes saved household payloads. |
| Browser current-source ingestion | `src/engine/liveSources.ts` | Validates coarse-area input, calls the same-origin geocoder, normalizes public feeds, redacts errors, and allowlists external event links. |
| Geocoder API | `api/geocode.ts` | Exposes the Vercel Web Handler at `POST /api/geocode`; deployed requests fail closed without shared Redis. |
| Geocoder service/store | `api/_lib/` | Revalidates coarse-only input, streams a bounded body, hashes cache/client keys, minimizes responses, applies per-client request and provider-miss quotas plus provider pacing through Redis, and supplies bounded local-development state. |
| Historical scenario model | `src/data/replay.ts` | Defines categorical source rows, route memory, map provenance, and scenario types. |
| Historical source rows | `src/data/historicalScenarios.ts` | Contains the Palisades and Eaton row bundles, stored road snapshots, and the Camp Fire archive-only reference. |
| Historical detector | `src/engine/detector.ts` | Verifies recognized source attribution, matching timestamps/text, and warning/order language before emitting `official_action`. |
| Live UI | `src/components/LiveMonitor.tsx` | Renders current records and runtime source health only. |
| Historical UI | `src/components/HistoricalReplay.tsx` | Renders official rows, categorical action state, historical maps, evaluation, and case memory. |
| Memory persistence | `src/engine/memoryStorage.ts` | Sanitizes and stores versioned, scenario-scoped confirmations and edits on the device. |
| Drill domain | `src/engine/drillPlan.ts` | Derives baseline, constraint, and attributable historical-lesson tasks and summarizes unresolved/assigned/practiced state without a safety score. |
| Drill persistence | `src/engine/drillStorage.ts` | Sanitizes and stores allowlisted structured decisions, bounded role assignments, constraints, and practice date under a separate localStorage key. |
| Preparedness UI | `src/components/PreparednessWorkspace.tsx` | Renders household constraints, assignment ledger, practice controls, provenance, and the printable practice card. |
| Judge run | `src/engine/judgeMode.ts` | Maps a deterministic 90-second run across both loaded scenarios and six proof phases. |
| Deployment headers | `vercel.json` | Applies CSP, anti-framing, referrer, permissions, MIME, and opener policies on Vercel. |

## Privacy and Provider Sharing

Afterlight has a narrow server boundary for geocoding. The browser posts the entered coarse-area text in a JSON body to the same-origin `/api/geocode` endpoint. The endpoint validates it with a privacy-first coarse-query grammar, hashes the normalized query for its cache key, and sends the text only to the fixed official OpenStreetMap Nominatim host. It returns only a coarse label, latitude, and longitude. It does not log or cache the raw query. The browser then sends the returned coordinates or regional bounds to NIFC WFIGS/ArcGIS, NWS, and NASA EONET. Those providers receive normal request metadata under their own policies. Do not enter a street address or sensitive household information.

Deployed functions require an Upstash-compatible Redis REST store. Positive coarse matches are cached for 30 days; not-found results are cached for five minutes. Redis atomically enforces 20 requests per hashed client key per minute, a 2,000-provider-request 24-hour circuit breaker that cache hits do not consume, and at least 1,000 ms between provider request starts; body, Redis, queue, provider, parsing, and cache writes share one 8.5-second deadline. Same-origin checking is a browser boundary, not bot protection; a deployment-platform WAF rule remains a release requirement. Local `npm run dev` uses bounded in-process state only; deployed code fails closed with `503` if shared Redis is missing.

Historical memory cards are different: confirmations and privacy-guarded edits remain in `localStorage` for the current site origin. Memory edits and drill role labels reject obvious exact addresses, phone numbers, emails, signed or labeled coordinate pairs, and access-code strings; drill assignments use a second local key and accept short role labels plus task-specific structured decisions only. Arbitrary decision text is neither accepted nor persisted. Neither payload is uploaded by Afterlight, synchronized, encrypted, backed up, or protected from other scripts running on the same origin. Keep names, contacts, routes, exact locations, access codes, and medical details in an official household plan instead.

## Map and Network Policy

- Standard OpenStreetMap tiles are fetched online for display only. Afterlight does not prefetch or claim offline tile availability.
- Historical OSM road geometry is a bundled snapshot captured on the date shown in the map provenance. It is not current road data.
- ArcGIS incident perimeters are fetched when the historical map renders and may be unavailable when the provider or network is unavailable.
- Current feeds require network access and can be delayed, incomplete, rate-limited, blocked by CORS, or temporarily unavailable.
- No alert, map, source record, or route state is intentionally cached for offline emergency use.

## 90-Second Judge Flow

Open the app with:

```text
http://127.0.0.1:5173/?judge=1
```

The deterministic run covers the thesis, official rows, a non-persisted memory preview, the evaluation panel, the household drill output, and the safety boundary for Palisades and Eaton. It starts from isolated empty household state, so saved device memory and drill data are neither rendered nor mutated. Reduced-motion preference disables autoplay; every phase remains manually inspectable.

## Local Setup

Requires Node.js 22 or newer and npm 11.

```bash
npm ci
npm run dev
```

The local URL is normally `http://127.0.0.1:5173`.

Local development mounts the same `/api/geocode` contract through Vite with an in-memory cache. This mode is for one developer process and is not the production rate-control boundary.

## Commands

<!-- AUTO-GENERATED:START scripts -->
Generated from `package.json`.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server on `127.0.0.1`. |
| `npm run build` | Run TypeScript project build checks, then create the production Vite build in `dist/`. |
| `npm run build:sites` | Build the Cloudflare Worker and client asset layout. |
| `npm run preview` | Serve the production build locally with Vite preview on `127.0.0.1`. |
| `npm run test` | Run the Vitest test suite. |
| `npm run test:coverage` | Run Vitest with V8 coverage for the unit/integration suite. |
| `npm run test:e2e` | Run the mocked-source Playwright browser suite in desktop and mobile Chrome. |
| `npm run dev:sites` | Build and serve the Cloudflare Worker plus static assets locally. |
| `npm run test:sites` | Build and bundle the Cloudflare deployment without publishing it. |
<!-- AUTO-GENERATED:END scripts -->

## Environment

The browser app uses no API credentials. Deployed geocoding requires server-only environment values:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GEOCODER_PROVIDER_URL` (defaults to the public Nominatim search endpoint)
- `NOMINATIM_USER_AGENT` (defaults to the identifying Afterlight repository User-Agent)

Set secrets in the deployment platform through an authorized project/team owner. Never prefix them with `VITE_`, expose them to the browser, or commit real values. NASA FIRMS remains a separate future server-proxy integration.

The repository supports both Vercel and Cloudflare Workers deployment. `vercel.json` applies the browser security headers on Vercel; `wrangler.jsonc` and `worker/index.ts` apply the same boundary on Cloudflare, serve the Vite SPA, and route `/api/geocode` through the same fail-closed production handler. Configure the Redis secrets with the selected platform before treating its geocoder as operational.

## Judge Materials

- Judge brief: `docs/judge-brief.md`
- Demo-only cinematic opening and generation receipt: `docs/demo-cinematic-opening.md`
- Moonshot paper: `docs/moonshot-paper.md`
- Vision presentation: `docs/vision-presentation.md`
- Devpost submission pack: `docs/devpost-submission.md`
- Final Hoobit Devpost package: `docs/hoobit-devpost-final.md`
- Operational runbook: `docs/RUNBOOK.md`

## Honest Limitations

- No fire-spread prediction, numeric route-risk score, congestion forecast, evacuation-time estimate, or current route recommendation.
- No live incident owns or modifies a historical scenario, detector result, map anchor, route memory, or household card.
- The household drill is a pre-incident practice artifact, not an emergency plan, safety certification, official checklist, or proof of field readiness.
- Only Palisades and Eaton have loaded granular source rows; Camp Fire is archive-only and deliberately unscored.
- Historical map points are labeled illustrative anchors, not claimed official coordinates.
- No offline emergency-data or map capability.
- No claim that the production geocoder is configured until shared Redis environment values and the deployed endpoint are verified.
- No public deployment URL or demo video is claimed in this repository; verify those submission assets separately.
- **Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
