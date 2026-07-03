# Afterlight

Afterlight is a React/Vite frontend for a neighborhood crisis-memory system. It turns a wildfire incident replay into confirmed failures, household memory cards, and offline readiness layers.

## Project Surface

Afterlight is a static React app. The current source of truth is:

- `src/data/replay.ts` for replay events, failure records, source labels, risk labels, and offline-cache percentages.
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

## Production Build

```bash
npm run build
```

## What is included

- React component app shell with a cinematic animated wildfire hero
- Location intake with ranked nearby incident records
- Timestamped incident replay for a Palisades / Eaton-style wildfire scenario
- OpenStreetMap-backed incident map with fire spread, blocked road, primary route, and backup route overlays
- Visible source connector layer for NWS, CAL FIRE, NASA FIRMS, OpenStreetMap, ArcGIS, and household memory
- Failure confirmation and editable lesson cards
- Generated household memory cards and before/during/after resilience framing

The Google Stitch MCP API key shared in chat was not written into this repository.
