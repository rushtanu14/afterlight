# Afterlight: Disaster Memory as a Decision Engine

## Core Claim

Disaster-response tools are usually built around the present: current alerts, current maps, and current roads. Afterlight explores a different primitive—an attributable memory of how a failure chain unfolded and what a household chose to preserve from it.

The prototype does not predict the next fire or tell a household when or where to evacuate. It makes historical evidence inspectable, keeps current public records separate, and lets a household turn reviewed source rows into case-scoped memory.

## The Product Boundary Is the Idea

Afterlight has two separate surfaces:

1. **Live Source Monitor:** browser-fetched current incident and alert records with runtime source health. It has no route advice, evacuation timing, historical detector state, or household memory output.
2. **Historical Replay:** curated Palisades and Eaton source rows with timestamps, source text, categorical signal types, historical route memory, map provenance, and user-confirmed lessons.

The separation matters. A current incident that happens to be near a searched area cannot inherit a historical fire’s warning row, route state, illustrative anchor, or household lesson.

## Historical Replay Model

Each replay event preserves:

- the original timestamp and display time;
- source label, HTTPS source URL, and official record text;
- a categorical signal such as incident report, warning, order, or road closure;
- historical route names and categorical row states;
- a row-linked illustrative map anchor;
- a failure lesson and editable future-memory prompt.

The detector is categorical and fail-closed. `official_action` requires a recognized source/label pair, internally matching timestamp and record text, and source language that supports an evacuation warning or order. A road closure, incident report, awareness notice, malformed row, or unrecognized attribution remains `prepare`. That output describes a historical row and is never current guidance.

## Source-Row Maps

The map combines several evidence types without collapsing them into one claim:

- row-linked points labeled as illustrative anchors;
- stored OpenStreetMap road geometry labeled as a historical snapshot with capture date and ODbL attribution;
- an attributable ArcGIS dissolved fire perimeter fetched when the map renders;
- standard OpenStreetMap tiles fetched online for display.

The road lines do not state current status and are not route recommendations. Standard OSM tiles are not prefetched or available as an offline emergency map.

## Evaluation

The visible evaluation uses three cases:

- **Palisades Fire:** six loaded official-source rows; warning/order rows are compared with detector output.
- **Eaton Fire:** six loaded official-source rows; warning/order rows are compared with detector output.
- **Camp Fire:** archive-only negative control; granular replay and scoring are blocked because official rows are not loaded.

This is a deterministic category/attribution check, not a model-accuracy, outcome, or live-incident performance claim. It demonstrates that the detector recognizes the loaded warning/order rows and refuses to manufacture a timeline for an archive-only incident.

## Household Memory

Users can confirm a historical lesson and edit its future-memory text. The app stores confirmations and edits in versioned browser `localStorage`, scoped separately to Palisades and Eaton. Nothing is pre-confirmed.

Device-local does not mean secure. The data is not encrypted, synchronized, backed up, or protected from other scripts on the same origin. It can disappear when site data is cleared and has no retention or export workflow. Users should not enter exact addresses, medical details, credentials, or other sensitive data.

## Current Public Sources and Privacy

The Live Source Monitor accepts only coarse-area input. The browser sends that text to OpenStreetMap Nominatim, then sends the resulting point or regional bounds to NIFC WFIGS/ArcGIS, NWS, and NASA EONET. Provider policies and request logging apply. The app has no backend privacy proxy.

NASA FIRMS is not called from the browser and no FIRMS key is accepted. A future FIRMS integration requires a separate server proxy, credential controls, and an explicit privacy review.

## 90-Second Evidence Run

`?judge=1` starts a deterministic 90-second walkthrough of both loaded fires. It moves through the thesis, official rows, a non-persisted memory preview, the evaluation panel, and the safety boundary. Reduced-motion preference disables autoplay while preserving manual inspection.

## Moonshot Direction

The long-term opportunity is civic memory infrastructure: source-backed incident timelines that communities can review, correct, and convert into durable preparedness knowledge. Extending that safely would require official partnerships, provenance governance, accessibility and multilingual work, threat modeling, consent and retention controls, and real community validation.

The present repository does not claim those future capabilities. It demonstrates the narrow trust boundary first.

## Explicit Non-Claims

- Not official emergency guidance or an emergency-alerting service.
- No fire-spread prediction, numeric risk score, congestion forecast, evacuation-time estimate, or current route recommendation.
- No offline current-source, alert, perimeter, or map-tile capability.
- No guarantee that a public feed is complete, timely, accurate, or available.
- No granular replay for incidents without loaded attributable rows.
- No public deployment URL or demo video claimed by this repository.
- **Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
