# Afterlight: Disaster Memory as a Decision Engine

## Core Claim

Disaster-response tools are usually built around the present: current alerts, current maps, and current roads. Afterlight explores a different primitive—an attributable memory of how a failure chain unfolded and what a household chose to preserve from it.

The product does not predict the next fire or tell a household when or where to evacuate. It makes historical evidence inspectable, keeps current public records separate, and lets a household turn reviewed source rows into assigned, repeatable pre-incident practice.

## The Product Boundary Is the Idea

Afterlight has three separate surfaces:

1. **Live Source Monitor:** browser-fetched current incident and alert records with runtime source health. It has no route advice, evacuation timing, historical detector state, or household memory output.
2. **Historical Replay:** curated Palisades and Eaton source rows with timestamps, source text, categorical signal types, historical route memory, map provenance, and user-confirmed lessons.
3. **Household Drill Builder:** baseline and constraint-specific practice tasks, coarse household decisions, primary/backup role labels, confirmed historical lesson provenance, unresolved tasks, a practice date, and a printable card.

The separation matters. A current incident that happens to be near a searched area cannot inherit a historical fire’s warning row, route state, illustrative anchor, household lesson, or drill assignment.

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

## Household Drill

The drill is designed backward from a printable artifact. Every task needs one task-specific allowlisted decision plus primary and backup roles before it can be marked practiced; editing any of those fields invalidates the prior practice mark and date. Selected constraints add relevant handoffs for mobility support, medication continuity, pets or service animals, essential power, and transportation backup. Built-in interpretations are labeled `Afterlight takeaway based on …`; user edits become `Household adaptation based on …`. Arbitrary decision text cannot enter storage or the print card, so exact household details remain in an official plan outside Afterlight.

Afterlight deliberately shows unresolved tasks and allows a practice date after at least one complete handoff even when other gaps remain. It does not calculate a readiness score, certify safety, or transform the card into active-incident instructions. Drill state uses the separate bounded key `afterlight.household-drill.v1`; removing a historical lesson purges its hidden assignment, and load-time reconciliation removes any stale task assignment/date left by older state. The state carries the same device-local privacy warning as historical memory.

## Current Public Sources and Privacy

The Live Source Monitor accepts only coarse-area input. The browser posts that text to same-origin `/api/geocode`; the server validates it again with a privacy-first grammar, streams at most 1 KB, uses SHA-256 cache/client keys, shares a per-client request quota, provider-miss capacity, and application-wide provider pacing through Redis, and sends it only to the official Nominatim host with redirects rejected. Cache hits do not consume provider capacity. Only a minimized coarse label, latitude, and longitude return. The browser then sends the resulting point or regional bounds to NIFC WFIGS/ArcGIS, NWS, and NASA EONET. Provider policies and request logging still apply. The UI displays provider record time, alert effective time, and source check time separately.

The proxy does not log or cache raw queries. Deployed instances fail closed without shared Redis; local Vite development uses bounded one-process memory state only. Application quotas do not replace the deployment-platform WAF release gate. This implements a real privacy and provider-load boundary, but the repository does not claim that a public deployment, WAF, or its environment values are configured.

NASA FIRMS is not called from the browser and no FIRMS key is accepted. A future FIRMS integration requires a separate server proxy, credential controls, and an explicit privacy review.

## 90-Second Evidence Run

`?judge=1` starts a deterministic 90-second walkthrough of both loaded fires. It moves through the thesis, official rows, a non-persisted memory preview, the evaluation panel, household drill output, and the safety boundary. The demo surface initializes isolated empty household state and does not read, overwrite, or clear saved device payloads. Reduced-motion preference disables autoplay while preserving manual inspection.

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
- No claim that a completed drill means a household is safe, ready, compliant, or field-validated.
- **Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**
