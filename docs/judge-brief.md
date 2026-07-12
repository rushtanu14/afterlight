# Afterlight Judge Brief

## One-Sentence Thesis

Afterlight turns attributable disaster source rows into inspectable, case-scoped household memory while keeping current public-source monitoring strictly separate from historical decisions.

## 90-Second Review

Run the app at:

```text
/?judge=1
```

The deterministic walkthrough covers both loaded fires and five proof phases:

1. **Thesis:** current-source monitoring and historical replay are separate products inside one interface.
2. **Official rows:** inspect the Palisades and Eaton source text, timestamps, categories, and attribution.
3. **Memory output:** view a household lesson preview explicitly marked `not saved`; normal user confirmations remain scenario-scoped.
4. **Evaluation:** compare expected versus detected warning/order rows for Palisades and Eaton, then inspect Camp Fire as an unscored negative control.
5. **Safety boundary:** confirm that historical action state is not current emergency guidance.

The full schedule is 90 seconds. Reduced-motion preference disables autoplay; every proof surface remains manually accessible.

## What Works

| Proof | Current implementation |
|---|---|
| Separate surfaces | `LiveMonitor` receives only current-source data; `HistoricalReplay` receives only a selected stored scenario and its decisions/memory. |
| Current records | Coarse-area Nominatim lookup with bounded session caching and one-second client throttling, plus NIFC WFIGS, NWS, and NASA EONET requests with runtime source health. |
| Browser credential boundary | NASA FIRMS is marked server-proxy-only; no browser key or FIRMS request exists. |
| Loaded replay cases | Palisades Fire and Eaton Fire, six attributable rows each. |
| Detector | Categorical, fail-closed verification of recognized warning/order rows; no numeric risk model. |
| Source-row maps | Illustrative row anchors, stored historical OSM road geometry, online OSM tiles, and attributable ArcGIS perimeters. |
| Household memory | Versioned `localStorage` confirmations and free-text edits scoped by scenario; nothing pre-confirmed. |
| Evaluation | Palisades and Eaton expected/detected checks plus Camp Fire as archive-only negative control. |

## Why the Negative Control Matters

Camp Fire has an incident archive, but Afterlight does not invent a timestamped replay from that archive. The evaluation marks it `insufficient_official_rows` and refuses to score it. This demonstrates the product’s evidence boundary, not missing polish.

## Privacy and Network Facts

- Search accepts a city, ZIP code, or neighborhood and rejects street-address precision and raw coordinates.
- The browser sends the area text to Nominatim, then shares the returned point or bounds with NIFC WFIGS/ArcGIS, NWS, and NASA EONET. Provider policies and normal request logs apply.
- Current-source data is held in page state and is not written to household-memory storage.
- Household confirmations and edits remain on the current device/origin, but they are not encrypted, synchronized, backed up, or protected from other same-origin scripts.
- Standard OpenStreetMap tiles and ArcGIS perimeters require network access. There is no offline tile or emergency-data cache.

## Exact Non-Claims

- Not official emergency guidance, an alerting service, a route planner, or a fire-spread predictor.
- No numeric route-risk score, congestion forecast, evacuation-time estimate, or current route recommendation.
- No claim that illustrative anchors are official coordinates or stored road snapshots reflect current status.
- No claim that public feeds are complete, timely, or continuously available.
- No granular replay for incidents without loaded attributable rows.
- No browser FIRMS integration.
- No public deployment URL or demo video claimed by this repository; verify external submission assets separately.

## External Validation Status

**Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**

The next external step is a real, consented scenario review with a participant or emergency-preparedness stakeholder. Until that occurs, Afterlight claims implementation and deterministic evidence only—not improved outcomes, user trust, or field readiness.
