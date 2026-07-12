# Afterlight

Afterlight is a React/Vite crisis-memory prototype with two deliberately separate surfaces: a **Live Source Monitor** for current public records and a **Historical Replay** for attributable official-source rows. Current records never inherit the historical detector, route memory, or household cards.

> **Safety boundary:** Afterlight is not official emergency guidance. During an active incident, follow current evacuation orders and public-safety agencies.

## What Works Now

### Live Source Monitor

- Accepts a city, ZIP code, or neighborhood and rejects street-address, unit, and raw-coordinate input.
- Uses OpenStreetMap Nominatim for coarse-area geocoding.
- Requests current NIFC WFIGS incident points, NWS alerts, and NASA EONET wildfire events.
- Reports runtime source health as `live`, `quiet`, `limited`, `error`, or `optional`.
- Shows current public records without evacuation timing, route advice, historical action states, or household memory output.
- Marks NASA FIRMS as server-proxy-only. The browser has no FIRMS key and makes no FIRMS request.

### Historical Replay

- Loads separate Palisades Fire and Eaton Fire scenario bundles with six attributable rows each.
- Preserves the row timestamp, source label, source URL, official record text, categorical signal, and case-specific map reference.
- Uses a categorical detector. Only a recognized, internally consistent evacuation-warning or evacuation-order row can produce `official_action`; every other or unverifiable row fails closed to `prepare`.
- Shows route names only as historical row memory with categorical states such as `not_stated_in_row`, `access_restricted`, or `blocked`.
- Stores user-confirmed lessons and free-text edits separately for each scenario in browser `localStorage`.
- Starts with no lesson pre-confirmed.

### Evidence and Evaluation

- The evaluation panel compares expected warning/order rows with detector output for Palisades and Eaton.
- Camp Fire is the third evaluation case and an explicit negative control: it is not scored or replayed because granular official rows are not loaded.
- Historical maps connect each source row to a clearly labeled illustrative anchor, stored OpenStreetMap road geometry, and an attributable incident perimeter source.
- Road snapshots do not state current road status and are not recommendations.

## Architecture

| Surface | Source of truth | Boundary |
|---|---|---|
| App orchestration | `src/App.tsx` | Keeps current-source requests, historical playback, judge mode, and case memory separate. |
| Current-source ingestion | `src/engine/liveSources.ts` | Validates coarse-area input, normalizes public feeds, redacts errors, and allowlists external event links. |
| Historical scenario model | `src/data/replay.ts` | Defines categorical source rows, route memory, map provenance, and scenario types. |
| Historical source rows | `src/data/historicalScenarios.ts` | Contains the Palisades and Eaton row bundles, stored road snapshots, and the Camp Fire archive-only reference. |
| Historical detector | `src/engine/detector.ts` | Verifies recognized source attribution, matching timestamps/text, and warning/order language before emitting `official_action`. |
| Live UI | `src/components/LiveMonitor.tsx` | Renders current records and runtime source health only. |
| Historical UI | `src/components/HistoricalReplay.tsx` | Renders official rows, categorical action state, historical maps, evaluation, and case memory. |
| Memory persistence | `src/engine/memoryStorage.ts` | Sanitizes and stores versioned, scenario-scoped confirmations and edits on the device. |
| Judge run | `src/engine/judgeMode.ts` | Maps a deterministic 90-second run across both loaded scenarios and five proof phases. |

## Privacy and Provider Sharing

Afterlight is a static frontend with no project backend. A current-source search sends the entered coarse-area text from the browser to OpenStreetMap Nominatim. The returned coordinates are then sent to NIFC WFIGS/ArcGIS as a regional bounding box, NWS as a point query, and NASA EONET as a regional bounding box. Those providers receive normal request metadata under their own policies. Do not enter a street address or sensitive household information.

The browser keeps a bounded in-memory cache of normalized geocodes and spaces uncached Nominatim request starts at least one second apart. This protects the local/demo path but cannot enforce a service-wide limit across multiple visitors. A multi-user public deployment must use a controlled proxy with shared caching/rate limits or a geocoder intended for that traffic.

Historical memory cards are different: confirmations and edits remain in `localStorage` for the current site origin. They are not uploaded by Afterlight, synchronized, encrypted, backed up, or protected from other scripts running on the same origin. Clearing browser site data removes them, and the replay provides controls to clear one case or all Afterlight memory on the device. The app has no retention schedule or export workflow, so do not store medical details, exact addresses, or other sensitive information in free-text edits.

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

The deterministic run covers the thesis, official rows, a non-persisted memory preview, the evaluation panel, and the safety boundary for Palisades and Eaton. Reduced-motion preference disables autoplay; the replay remains manually inspectable.

## Local Setup

```bash
npm ci
npm run dev
```

The local URL is normally `http://127.0.0.1:5173`.

## Commands

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

## Environment

The browser app uses no API credentials. NASA FIRMS requires a separate server proxy and secret-management boundary before it can be integrated. Never place a FIRMS key in a `VITE_` variable, browser bundle, source file, request URL, or committed environment file.

## Judge Materials

- Judge brief: `docs/judge-brief.md`
- Moonshot paper: `docs/moonshot-paper.md`
- Vision presentation: `docs/vision-presentation.md`
- Operational runbook: `docs/RUNBOOK.md`

## Honest Limitations

- No fire-spread prediction, numeric route-risk score, congestion forecast, evacuation-time estimate, or current route recommendation.
- No live incident owns or modifies a historical scenario, detector result, map anchor, route memory, or household card.
- Only Palisades and Eaton have loaded granular source rows; Camp Fire is archive-only and deliberately unscored.
- Historical map points are labeled illustrative anchors, not claimed official coordinates.
- No offline emergency-data or map capability.
- No public deployment URL or demo video is claimed in this repository; verify those submission assets separately.
- **Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
