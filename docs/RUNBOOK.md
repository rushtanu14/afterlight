# Runbook

This runbook covers the current static Afterlight frontend.

## Service Inventory

<!-- AUTO-GENERATED:START service-inventory -->
Generated from `package.json`, `vite.config.ts`, and infrastructure file discovery.

| Area | Current State |
|------|---------------|
| App type | Static Vite React frontend |
| Development host | `127.0.0.1` |
| Development port | `5173` |
| Production artifact | `dist/` from `npm run build` |
| Backend/API | None detected |
| Environment template | None detected |
| Docker configuration | None detected |
| OpenAPI spec | None detected |
<!-- AUTO-GENERATED:END service-inventory -->

## Deployment Procedure

<!-- AUTO-GENERATED:START deployment -->
Generated from `package.json`.

1. Install dependencies with `npm ci`.
2. Build the app with `npm run build`.
3. Deploy the generated `dist/` directory to the static host.
4. Validate the deployed page loads and the replay workspace renders.
<!-- AUTO-GENERATED:END deployment -->

## Local Health Checks

Run these checks before sharing a build:

```bash
npm run build
npm run preview
```

Then open the preview URL and verify:

- The hero renders.
- `Enter Afterlight` scrolls to the replay workspace.
- The replay play button advances the timeline.
- Confirming a failure creates a household memory card.
- The page has no obvious horizontal overflow on mobile width.

## Common Issues

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| `npm run dev` cannot bind to port `5173` | Another Vite server is already running | Stop the old process or run Vite on a different port. |
| Build fails in TypeScript | Component prop or replay-data shape drifted | Fix the source type mismatch; do not bypass strict mode. |
| Preview shows stale UI | `dist/` was not rebuilt | Run `npm run build` again before preview/deploy. |
| Hero canvas appears blank | Browser canvas or reduced-motion behavior needs inspection | Check console errors and verify `EmberCanvas.tsx` still mounts inside `Hero.tsx`. |

## Rollback

This app has no database or server state. Roll back by redeploying the previous known-good `dist/` artifact or reverting the source commit and rebuilding.

## Safety Boundary

Afterlight is not an official emergency-alerting system. Any production expansion that uses live incident, route, weather, or evacuation data must include source attribution, failure handling, and clear user-facing boundaries before release.
