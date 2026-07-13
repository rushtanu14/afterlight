# Afterlight Runbook

This runbook covers the React/Vite frontend and its narrow Vercel-compatible geocoder function.

## Service Inventory

<!-- AUTO-GENERATED:START service-inventory -->
Generated from `package.json`, `vite.config.ts`, and infrastructure file discovery.

| Area | Current state |
|---|---|
| App type | Vite React frontend plus Web Handler API |
| Development host | `127.0.0.1` |
| Development port | `5173` |
| Production artifact | `dist/` plus `api/geocode.ts` on a compatible function host |
| Backend/API | Same-origin `POST /api/geocode` only |
| Client credentials | None; Redis and any future FIRMS credentials remain server-only |
| Persistent app data | Scenario-scoped confirmations/edits plus a separate bounded household-drill payload in browser `localStorage` |
| Current-source providers | Server: official OpenStreetMap Nominatim geocoder host. Browser: NIFC WFIGS/ArcGIS, NWS, NASA EONET |
| Shared geocoder state | Upstash-compatible Redis REST in deployed environments; bounded memory store in local Vite development |
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

For a functional public search, deploy both the generated `dist/` output and the `api/` function directory. Vercel discovers `api/geocode.ts` as a Web Handler. A static-only host may serve the historical replay, but `/api/geocode` will be unavailable and current-area search must not be described as working.

Configure these as server-only deployment environment values:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
GEOCODER_PROVIDER_URL
NOMINATIM_USER_AGENT
```

Use an authorized project/team-owned Redis deployment. Do not place real values in `.env.example`, Git, screenshots, docs, CSB, or any `VITE_` variable. Deployed geocoding intentionally returns `503` when shared Redis is missing or invalid.

Add a deployment-platform WAF rate-limit rule for `/api/geocode` before public launch. The application already enforces a Redis-backed 20-request/client-minute quota, a 2,000-provider-request 24-hour circuit breaker that cache hits do not consume, and the authoritative application-wide Nominatim provider slot. The WAF is still required to protect function and Redis capacity before application code runs. Origin equality is a browser boundary, not bot authentication.

Deploy `vercel.json` with the app and confirm the CSP, anti-framing, referrer, permissions, MIME, and opener headers are present on the production document.

## Functional Smoke Check

1. Confirm the page labels **Live Source Monitor** and **Historical Replay** as separate surfaces.
2. Search a coarse area such as `Pacific Palisades, CA`.
3. Confirm the browser calls same-origin `/api/geocode` and does not contact `nominatim.openstreetmap.org` directly.
4. Confirm the monitor shows current records or honest `quiet`, `limited`, or `error` source health, with provider record time, alert effective time, and source check time.
5. Confirm the monitor does not show evacuation timing, route advice, historical action state, or household cards.
6. Select Palisades and Eaton independently and inspect several official rows.
7. Confirm only recognized warning/order rows display `official_action` and the safety boundary stays visible.
8. Confirm each map labels row points as illustrative anchors and roads as historical OSM snapshots.
9. Confirm a saved lesson remains in its selected scenario and is not pre-confirmed in the other scenario.
10. Open **Household Drill Builder**, select a non-sensitive constraint, choose a task-specific coarse decision, assign primary and backup role labels, and mark one handoff practiced.
11. Confirm the evidence-linked historical lesson appears only after confirmation and is labeled either `Afterlight takeaway based on …` or `Household adaptation based on …`.
12. Record practice today and confirm unresolved assignments remain visible instead of becoming a readiness score.
13. Print the practice card and confirm it says `not emergency guidance`.
14. Confirm Camp Fire appears only as an unscored negative control.
15. Check desktop and mobile widths for overflow, keyboard access, and readable safety copy.

## 90-Second Judge Check

Open `http://127.0.0.1:5173/?judge=1`.

The run should move through these phases for both loaded fires:

1. Thesis
2. Official source rows
3. Household-memory preview marked `not saved`
4. Three-case evaluation evidence
5. Household drill output
6. Safety boundary

The total deterministic schedule is 90 seconds. A reduced-motion preference disables autoplay, so inspect the same surfaces manually in that mode.

Judge mode is fully ephemeral: it initializes empty household memory and drill state, never reads or writes the two saved `localStorage` payloads, and labels its persistence surfaces accordingly. This prevents a recorded demo from exposing or deleting device-local household data.

## Recorded Demo Opening

The optional Higgsfield still at `docs/assets/demo/afterlight-higgsfield-opening.png` is restricted to the recorded demo's opening 2.5-3 seconds. Follow `docs/demo-cinematic-opening.md`, keep the visible `AI-generated atmospheric visual · demo only` disclosure, then transition to real product capture. Never ship the asset in the live application or present it as incident evidence.

## Current-Source Privacy Check

- Enter only a city, ZIP code, or neighborhood.
- Enter a ZIP code by itself. Mixed text-plus-ZIP queries are rejected because they are ambiguous with street addresses.
- Street addresses, unit identifiers, and raw coordinate pairs should be rejected before a request.
- The browser sends coarse-area text in a JSON body to same-origin `POST /api/geocode`; it never puts the query in an Afterlight API URL.
- The proxy revalidates input, hashes normalized queries for cache keys, and stores only coarse results or a not-found sentinel. Raw queries are not logged or cached.
- Deployed instances share positive/negative cache, a per-client request quota, a provider-miss circuit breaker, and an atomic minimum one-second provider slot through Redis. Local development uses bounded one-process memory state.
- The public Nominatim limit applies to the whole application, not each user. Keep usage directly user-triggered, moderate, cached, and single-threaded at the provider boundary. The server accepts only the official Nominatim host and rejects redirects.
- The proxy sends an identifying non-stock `User-Agent` and returns only a coarse label, latitude, and longitude.
- The geocoded point or regional bounds are then sent to NIFC WFIGS/ArcGIS, NWS, and NASA EONET.
- Nominatim sees the proxy request; the other providers still receive browser request metadata. Their policies and logs apply.
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

## Household Drill Operations

The drill uses a separate key:

```text
afterlight.household-drill.v1
```

The payload contains selected constraint identifiers, short primary/backup role labels, allowlisted structured decision values, practiced flags, and the last recorded practice date. It does not store live-source results or copy historical source text. Confirmed historical lesson IDs are referenced only while they remain present in case-scoped memory; unconfirming or clearing a lesson purges its hidden drill assignment. Loading the app also reconciles persisted assignments against the current visible task IDs and clears a stale practice date when anything is pruned.

- Use role labels such as `Alert checker` or `Pet carrier lead`; choose only the provided coarse decision patterns. The decision control does not accept arbitrary text.
- Keep names, contact details, routes, exact locations, access codes, device identifiers, and medical details in an official household plan, not Afterlight.
- A task requires a decision, primary role, and backup role before it can be marked practiced. Editing any of those fields resets the practiced mark.
- **Record practice today** requires at least one completed handoff but remains allowed with other unresolved tasks because a drill should expose gaps rather than hide them.
- **Print practice card** invokes the browser print flow; print CSS isolates the real card and prevents task-row splitting. Synthetic judge-preview data cannot be printed.
- **Clear drill data** requires explicit confirmation and removes only the drill payload. **Clear all device memory** from the replay removes both historical memory and drill data.
- The card must always retain `Practice card · not emergency guidance`, unresolved assignments, and the current-authority direction.

To remove only drill state manually:

```js
localStorage.removeItem("afterlight.household-drill.v1")
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
| Geocoder returns `503` | Shared Redis is missing, invalid, or unavailable | Fix server-only Redis configuration. Do not fall back to direct browser Nominatim. |
| Geocoder returns `429` | Client quota, provider-request circuit breaker, or application-wide provider slot is busy | Honor `Retry-After`; retry manually later. Do not increase concurrency or weaken the limit. |
| Geocoder returns `502` | Nominatim is unavailable, redirected, or rejected the request | Keep the redacted error and retry later; do not reflect provider response bodies. |
| FIRMS is `optional` | No FIRMS server proxy exists | Leave it disabled. Do not add a browser key. |
| Historical perimeter is unavailable | ArcGIS or network failure | Keep the replay rows and provenance visible; do not substitute fabricated geometry. |
| OSM base map is blank | Tile network/provider failure | Keep the historical text and stored provenance visible; do not claim offline map support. |
| Saved card disappeared | Site data was cleared, origin changed, or storage failed | Explain that memory has no sync or backup. Do not claim recovery. |
| Drill assignment disappeared | The constraint was deselected, drill data was cleared, or site data changed | Re-select the constraint and re-enter non-sensitive role labels. Do not claim recovery or synchronization. |
| Printed card looks incomplete | Roles remain unassigned or the user has not confirmed a historical lesson | Keep unresolved items visible; do not replace them with invented completion. |
| Judge autoplay does not start | Reduced-motion preference is active | Use manual controls and preserve reduced-motion behavior. |
| A source row cannot be verified | Attribution, timestamp, text, or category mismatch | The detector must fail closed to `prepare`. |

## Rollback

Redeploy the previous known-good frontend and function source or revert the source commit and rebuild. Browser-local historical memory and drill state are independent of a code rollback. Redis contains only hashed geocoder/client keys, counters, pacing state, and minimized coarse cache entries with TTLs; it may safely expire naturally, or an authorized operator may remove the `afterlight:geocode:v1:*` namespace during a rollback.

## Release Boundary

Before publishing submission claims, verify the tests/build, source links, live-provider behavior, responsive UI, and the complete safety language. Do not claim a public deployment, video, provider reliability, human outcome, or participant feedback without direct evidence.

**Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
