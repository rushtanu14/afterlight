# Afterlight

Afterlight is a React/Vite frontend for a neighborhood crisis-memory system. It turns a wildfire incident replay into confirmed failures, household memory cards, and offline readiness layers.

## Project Surface

Afterlight is a static React app. The current source of truth is:

- `src/data/replay.ts` for replay events, failure records, source labels, risk labels, and offline-cache percentages.
- `src/engine/detector.ts` for the tested replay-to-decision detector.
- `src/engine/liveSources.ts` for free/public API ingestion from OpenStreetMap Nominatim, NIFC WFIGS, NWS alerts, NASA EONET, and optional NASA FIRMS.
- `src/engine/sourceConnectors.ts` for source connector metadata and readiness scoring.
- `src/App.tsx` for replay state, confirmation state, card editing, and playback timing.
- `src/components/ReplayWorkspace.tsx` for location-ranked incidents, timeline controls, OSM-backed map visualization, source connectors, failure confirmation, and generated memory cards.
- `src/components/Hero.tsx` and `src/components/EmberCanvas.tsx` for the cinematic entry surface.
- `src/components/OfflineSection.tsx` for the before/during/after resilience summary.
- `public/images/afterlight-hero.jpg` for the generated cinematic wildfire hero.

## Commands

<!-- AUTO-GENERATED:START scripts -->
Generated from `package.json`.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server on `127.0.0.1`. |
| `npm run build` | Run TypeScript project build checks, then create the production Vite build in `dist/`. |
| `npm run preview` | Serve the production build locally with Vite preview on `127.0.0.1`. |
| `npm run test` | Run the Vitest detector test suite. |
<!-- AUTO-GENERATED:END scripts -->

## Local Setup

```bash
npm install
npm run dev
```

Open the local Vite URL, usually:

```text
http://127.0.0.1:5173
```

## Environment

Copy `.env.example` only when you want optional NASA FIRMS thermal detections:

```bash
VITE_FIRMS_MAP_KEY=
```

The rest of the live ingestion uses free public endpoints without app-specific secrets.
Because Vite exposes `VITE_` values in the browser bundle, use only a rotatable/free FIRMS key here; a production version should proxy paid or sensitive credentials server-side.

## Production Build

```bash
npm run build
```

## Judge Materials

- Moonshot paper: `docs/moonshot-paper.md`
- Vision presentation script: `docs/vision-presentation.md`

## What is included

- React component app shell with a cinematic animated wildfire hero
- Location intake with ranked nearby incident records
- Live public API ingestion for geocoding, current wildland-fire incident points, NWS alerts, NASA open wildfire events, and optional FIRMS thermal detections
- Timestamped incident replay for a Palisades / Eaton-style wildfire scenario
- OpenStreetMap-backed incident map with fire spread, blocked road, primary route, and backup route overlays
- Visible source connector layer for NWS, CAL FIRE, NASA FIRMS, OpenStreetMap, ArcGIS, and household memory
- Tested detector logic that finds the first leave-now threshold in a historical replay
- Failure confirmation and editable lesson cards
- Generated household memory cards and before/during/after resilience framing

The Google Stitch MCP API key shared in chat was not written into this repository.
