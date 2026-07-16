# Afterlight Judge Brief

## One-Sentence Thesis

Afterlight turns attributable disaster source rows into an assigned, printable household drill while keeping current public-source monitoring strictly separate from historical decisions and pre-incident practice.

## 90-Second Review

Run the app at:

```text
/?judge=1
```

The deterministic walkthrough covers both loaded fires and six proof phases:

1. **Thesis:** current-source monitoring and historical replay are separate products inside one interface.
2. **Official rows:** inspect the Palisades and Eaton source text, timestamps, categories, and attribution.
3. **Memory output:** view a household lesson preview explicitly marked `not saved`; normal user confirmations remain scenario-scoped.
4. **Evaluation:** compare expected versus detected warning/order rows for Palisades and Eaton, then inspect Camp Fire as an unscored negative control.
5. **Drill output:** inspect baseline tasks, coarse household decisions, primary/backup ownership, unresolved tasks, historical lesson provenance, practice date, and the printable card.
6. **Safety boundary:** confirm that neither historical action state nor the household drill is current emergency guidance.

The full schedule is 90 seconds. Judge mode uses isolated empty in-memory household state and never reads or writes saved `localStorage` payloads, preventing demo capture from exposing or deleting real household entries. Reduced-motion preference disables autoplay; every proof surface remains manually accessible.

## What Works

| Proof | Current implementation |
|---|---|
| Separate surfaces | `LiveMonitor` receives only current-source data; `HistoricalReplay` receives only a selected stored scenario and its decisions/memory. |
| Current records | Same-origin geocoder proxy with shared hashed Redis cache/client quotas and atomic application-wide provider pacing, plus browser NIFC WFIGS, NWS, and NASA EONET requests with provider and request-check timestamps. |
| Geocoder privacy boundary | The browser posts coarse text to `/api/geocode`; only the server contacts the fixed official Nominatim host, redirects are rejected, and only a coarse label/latitude/longitude returns. |
| Browser credential boundary | NASA FIRMS is marked server-proxy-only; no browser key or FIRMS request exists. |
| Loaded replay cases | Palisades Fire and Eaton Fire, six attributable rows each. |
| Detector | Categorical, fail-closed verification of recognized warning/order rows; no numeric risk model. |
| Source-row maps | Illustrative row anchors, stored historical OSM road geometry, online OSM tiles, and attributable ArcGIS perimeters. |
| Household memory | Normal mode uses versioned `localStorage` confirmations and free-text edits scoped by scenario; nothing is pre-confirmed, and judge mode stays isolated from the saved payload. |
| Household drill | Normal mode uses a separate bounded localStorage payload for non-sensitive constraints, task-specific allowlisted decisions, primary/backup role labels, practiced handoffs, and the last practice date; plan changes and stale-task reconciliation invalidate stale practice, while judge mode stays isolated. |
| Practical artifact | Printable card retains unresolved ownership, evidence-linked lessons, and `not emergency guidance`; it never reports a readiness score. |
| Evaluation | Palisades and Eaton expected/detected checks plus Camp Fire as archive-only negative control. |

## Why the Negative Control Matters

Camp Fire has an incident archive, but Afterlight does not invent a timestamped replay from that archive. The evaluation marks it `insufficient_official_rows` and refuses to score it. This demonstrates the product’s evidence boundary, not missing polish.

## Privacy and Network Facts

- Search accepts a city, ZIP code, or neighborhood and rejects street-address precision and raw coordinates.
- The browser posts the area text to same-origin `/api/geocode`; the server validates it, uses hashed cache/client keys, applies Redis quotas, and sends it only to the official Nominatim host. The browser then shares returned coordinates/bounds with NIFC WFIGS/ArcGIS, NWS, and NASA EONET. Provider policies and normal request logs apply.
- Deployed geocoding requires shared Redis and fails closed when that boundary is unavailable. The repository does not claim that a production deployment is configured.
- Current-source data is held in page state and is not written to household-memory storage.
- Household confirmations and privacy-guarded edits remain on the current device/origin, but they are not encrypted, synchronized, backed up, or protected from other same-origin scripts.
- Drill data is stored separately under `afterlight.household-drill.v1`; arbitrary decision text is not accepted, and role labels reject obvious exact address, contact, coordinate, and access-code strings before persistence. Role labels and practice state still have the same device-local limitations and must not contain personal or sensitive details.
- Standard OpenStreetMap tiles and ArcGIS perimeters require network access. There is no offline tile or emergency-data cache.

## Exact Non-Claims

- Not official emergency guidance, an alerting service, a route planner, or a fire-spread predictor.
- No numeric route-risk score, congestion forecast, evacuation-time estimate, or current route recommendation.
- No claim that illustrative anchors are official coordinates or stored road snapshots reflect current status.
- No claim that public feeds are complete, timely, or continuously available.
- No granular replay for incidents without loaded attributable rows.
- No browser FIRMS integration.
- No direct browser Nominatim integration and no production fallback to per-instance memory state.
- No public deployment URL or demo video claimed by this repository; verify external submission assets separately.
- No claim that completing or printing a drill makes a household safe, ready, compliant, or field-validated.

## External Validation Status

**Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**

The next external step is a real, consented scenario review with a participant or emergency-preparedness stakeholder. Until that occurs, Afterlight claims implementation and deterministic evidence only—not improved outcomes, user trust, or field readiness.
