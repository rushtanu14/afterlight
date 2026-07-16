# Afterlight Vision Presentation

## Slide 1: Disasters Produce Evidence. Communities Lose the Memory.

Incident logs preserve what agencies observed. Households remember what failed. Those two records rarely become one inspectable preparedness artifact.

Afterlight explores a household black box for disaster memory.

## Slide 2: Three Surfaces, One Hard Boundary

The Live Source Monitor shows current public incident and alert records with provider record time, alert effective time, and runtime source-check health.

The Historical Replay shows attributable Palisades and Eaton rows, categorical action state, historical map provenance, and case-scoped household memory.

The Household Drill Builder turns non-sensitive constraints and confirmed lessons into assigned pre-incident practice.

Current records never inherit the historical detector, route memory, household cards, or drill output.

## Slide 3: Source Rows Before Conclusions

Every replay step exposes its timestamp, source label, source URL, record text, and categorical signal.

Only a recognized and internally consistent evacuation-warning or evacuation-order row can produce `official_action`. Everything else fails closed to `prepare`.

This is a historical interpretation, not current emergency guidance.

## Slide 4: Maps Without Route Theater

Each historical row points to a clearly labeled illustrative anchor.

Stored OpenStreetMap road geometry is labeled as a historical snapshot. ArcGIS supplies the attributable perimeter. Standard OSM tiles are online-only display.

No line is presented as currently open, safe, or recommended.

## Slide 5: Three-Case Evaluation

Palisades and Eaton each contain six loaded rows. The evaluation compares their expected warning/order rows with detector output.

Camp Fire is the negative control. Its archive exists, but granular replay is blocked because official rows are not loaded.

That refusal is part of the technical proof.

## Slide 6: Household Memory Becomes Assigned Practice

A user can confirm a historical lesson and edit its future-memory text. Confirmations and privacy-guarded edits stay scenario-scoped in browser `localStorage`.

They reject obvious exact address, contact, coordinate, and access-code strings before persistence, but they are not encrypted, synchronized, backed up, or suitable for names, medical details, or other sensitive data.

A separate drill payload adds baseline and constraint-specific tasks, one coarse household decision plus primary and backup roles per task, practiced handoffs, a practice date, and a printable card. Editing a decision or role invalidates its prior practice mark. User-edited historical text is labeled as a household adaptation, unresolved tasks stay visible, and there is no readiness score or safety certification.

## Slide 7: The 90-Second Judge Run

Open `?judge=1`.

The judge run is ephemeral: saved household memory and drill payloads are never read, rendered, overwritten, or deleted during demo capture.

The deterministic run covers the thesis, official rows, a memory preview marked `not saved`, evaluation, household drill output, and the safety boundary for both loaded fires. Reduced-motion preference disables autoplay.

## Slide 8: What We Do Not Claim

Afterlight is not an alerting service, route planner, fire predictor, or offline map.

It does not provide numeric risk scores, evacuation timing, current route recommendations, or proof that a completed drill makes a household safe. Public feeds may be incomplete or unavailable. FIRMS has no browser key or request.

Current geocoding goes through same-origin `/api/geocode`; the browser no longer contacts Nominatim directly. Production requires shared Redis for hashed cache/client keys, per-client request limits, provider-miss capacity, and application-wide provider pacing, and fails closed without it. Cache hits do not consume provider capacity. The fixed official provider rejects redirects, and a platform WAF remains a public-launch gate.

**Human validation: Pending — no quote collected. No participant quote is claimed in this repository.**

## Slide 9: The Moonshot

The larger idea is a governed civic memory layer where official evidence and community review can improve future preparedness without pretending that historical patterns are current instructions.

The prototype proves the evidence boundary before claiming the network.
