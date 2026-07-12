# Afterlight Runbook

This runbook covers the static React/Vite Afterlight frontend.

## Service Inventory

<!-- AUTO-GENERATED:START service-inventory -->
Generated from `package.json`, `vite.config.ts`, and infrastructure file discovery.

| Area | Current state |
|---|---|
| App type | Static Vite React frontend |
| Development host | `127.0.0.1` |
| Development port | `5173` |
| Production artifact | `dist/` from `npm run build` |
| Backend/API | None |
| Client credentials | None; FIRMS is server-proxy-only |
| Persistent app data | Scenario-scoped confirmations and edits in browser `localStorage` |
| Current-source providers | OpenStreetMap Nominatim, NIFC WFIGS/ArcGIS, NWS, NASA EONET |
| Historical evidence | Stored Palisades/Eaton official rows, stored OSM road snapshots, online ArcGIS perimeters |
<!-- AUTO-GENERATED:END service-inventory -->

## Local Start

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`.

## Production Build and Preview

```bash
npm test
npm run build
npm run preview
```

Deploy only the generated `dist/` directory. A static deployment does not add a privacy proxy, credential boundary, offline map, or server-side persistence.

## Functional Smoke Check

1. Confirm the page labels **Live Source Monitor** and **Historical Replay** as separate surfaces.
2. Search a coarse area such as `Pacific Palisades, CA`.
3. Confirm the monitor shows current records or honest `quiet`, `limited`, or `error` source health.
4. Confirm the monitor does not show evacuation timing, route advice, historical action state, or household cards.
5. Select Palisades and Eaton independently and inspect several official rows.
6. Confirm only recognized warning/order rows display `official_action` and the safety boundary stays visible.
7. Confirm each map labels row points as illustrative anchors and roads as historical OSM snapshots.
8. Confirm a saved lesson remains in its selected scenario and is not pre-confirmed in the other scenario.
9. Confirm Camp Fire appears only as an unscored negative control.
10. Check desktop and mobile widths for overflow, keyboard access, and readable safety copy.

## 90-Second Judge Check

Open `http://127.0.0.1:5173/?judge=1`.

The run should move through these phases for both loaded fires:

1. Thesis
2. Official source rows
3. Household-memory preview marked `not saved`
4. Three-case evaluation evidence
5. Safety boundary

The total deterministic schedule is 90 seconds. A reduced-motion preference disables autoplay, so inspect the same surfaces manually in that mode.

## Current-Source Privacy Check

- Enter only a city, ZIP code, or neighborhood.
- Street addresses, unit identifiers, and raw coordinate pairs should be rejected before a request.
- The browser sends coarse-area text to Nominatim.
- Normalized geocodes are cached in memory for the browser session, and uncached Nominatim request starts are spaced at least one second apart.
- That client gate cannot enforce a service-wide limit across multiple visitors. Do not launch a multi-user public deployment against the shared Nominatim endpoint; add a controlled proxy with shared caching/rate limits or choose a suitable geocoder first.
- The geocoded point or regional bounds are then sent to NIFC WFIGS/ArcGIS, NWS, and NASA EONET.
- Provider access logs and policies still apply because the app has no backend privacy proxy.
- FIRMS should remain `optional` with copy stating that no browser key or request is used.
- Displayed external event URLs must be fixed or allowlisted HTTPS links.

## Household Memory Operations

Afterlight stores a versioned payload under:

```text
afterlight.household-memory.v1
```

The payload contains confirmed historical event IDs and free-text edits, grouped by Palisades or Eaton scenario. It is device- and origin-local, not encrypted, not synchronized, not backed up, and has no retention guarantee. It is accessible to any script with access to the same origin. Do not enter exact addresses, health data, access codes, or other sensitive information.

Use **Clear this case** to remove only the selected scenario or **Clear all device memory** to remove the entire Afterlight payload. Browser site-data controls or DevTools can also remove the key directly:

```js
localStorage.removeItem("afterlight.household-memory.v1")
```

## Map Policy

- OpenStreetMap standard tiles are online-only display. Do not add tile prefetching or describe them as available offline.
- Bundled OSM road snapshots are historical geometry only; never label them open, safe, closed today, or recommended.
- Row-linked map points are illustrative anchors unless the type and provenance explicitly change.
- ArcGIS perimeter layers are fetched at render time. If unavailable, keep the source rows usable and report the perimeter as unavailable.
- Never attach current-source results to a historical map, route state, or detector decision.

## Common Issues

| Issue | Likely cause | Required response |
|---|---|---|
| Current-source status is `limited` | Provider throttling or temporary outage | Keep other source results visible; retry later. Do not imply full coverage. |
| Current-source status is `error` | Invalid payload, CORS, network, or provider failure | Show the redacted source error. Do not display raw request URLs or credentials. |
| FIRMS is `optional` | No server proxy exists | Leave it disabled. Do not add a browser key. |
| Historical perimeter is unavailable | ArcGIS or network failure | Keep the replay rows and provenance visible; do not substitute fabricated geometry. |
| OSM base map is blank | Tile network/provider failure | Keep the historical text and stored provenance visible; do not claim offline map support. |
| Saved card disappeared | Site data was cleared, origin changed, or storage failed | Explain that memory has no sync or backup. Do not claim recovery. |
| Judge autoplay does not start | Reduced-motion preference is active | Use manual controls and preserve reduced-motion behavior. |
| A source row cannot be verified | Attribution, timestamp, text, or category mismatch | The detector must fail closed to `prepare`. |

## Rollback

The app has no database or server state. Redeploy the previous known-good `dist/` artifact or revert the source commit and rebuild. Browser-local memory is independent of a code rollback and may remain until site data is cleared.

## Release Boundary

Before publishing submission claims, verify the tests/build, source links, live-provider behavior, responsive UI, and the complete safety language. Do not claim a public deployment, video, provider reliability, human outcome, or participant feedback without direct evidence.

**Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
