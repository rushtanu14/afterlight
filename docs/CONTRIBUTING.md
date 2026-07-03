# Contributing

This project is a Vite + React + TypeScript frontend for Afterlight.

## Prerequisites

- Node.js compatible with Vite 7 and React 19.
- npm, using the checked-in `package-lock.json`.

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
| `npm run test` | Run the Vitest detector test suite. |
<!-- AUTO-GENERATED:END scripts -->

## Environment

<!-- AUTO-GENERATED:START env -->
Generated from environment template discovery.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_FIRMS_MAP_KEY` | No | Optional free NASA FIRMS MAP_KEY for live VIIRS thermal detections. Vite exposes this value in the browser bundle, so use only a rotatable/free key. Leave blank to run the app with Nominatim, NIFC WFIGS, NWS, and EONET only. | `abc123-free-map-key` |
<!-- AUTO-GENERATED:END env -->

## Source Layout

<!-- AUTO-GENERATED:START source-layout -->
Generated from `src/`.

| Path | Purpose |
|------|---------|
| `public/images/afterlight-hero.jpg` | Generated cinematic wildfire hero image used by the landing surface. |
| `src/App.tsx` | Wires replay playback state, confirmed failures, editable lessons, and page sections. |
| `src/components/EmberCanvas.tsx` | Draws the animated cinematic wildfire hero canvas. |
| `src/components/Hero.tsx` | Renders the Afterlight entry section and replay CTA. |
| `src/components/OfflineSection.tsx` | Renders before/during/after offline resilience cards. |
| `src/components/ReplayWorkspace.tsx` | Renders incident search results, replay controls, OSM-backed map overlays, source connectors, detected failures, and household memory cards. |
| `src/data/replay.ts` | Defines replay event and failure types plus the curated incident sequence. |
| `src/engine/detector.ts` | Scores replay signals into route risk, backup overload, leave-before mode, and evidence trails. |
| `src/engine/liveSources.ts` | Fetches and normalizes free/public live source data from OpenStreetMap Nominatim, NIFC WFIGS, NWS alerts, NASA EONET, and optional NASA FIRMS. |
| `src/engine/sourceConnectors.ts` | Defines source connector metadata and readiness scoring. |
| `src/main.tsx` | Mounts the React app into the page. |
| `src/styles.css` | Contains the full visual system and responsive layout rules. |
<!-- AUTO-GENERATED:END source-layout -->

## Testing

Run detector tests and production build before sharing a submission:

```bash
npm run test
npm run build
```

When adding detector logic, replay calculations, or higher-risk UI behavior, update `tests/detector.test.ts` before relying on manual browser checks alone.

## Code Style

- Keep TypeScript strictness intact.
- Keep component state immutable; copy `Set` and object state before updating.
- Keep source data in `src/data/replay.ts` instead of duplicating replay facts inside components.
- Avoid hardcoding secrets or API keys. This repository should stay frontend-only unless backend behavior is explicitly added.

## PR Checklist

- `npm run build` passes.
- New source-of-truth changes are reflected in generated doc sections.
- UI changes have been checked at desktop and mobile widths.
- Emergency/disaster wording does not imply certified official guidance.
