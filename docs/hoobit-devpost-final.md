# Afterlight — Final Hoobit Devpost Package

Verified against the authenticated Hoobit Hacks 2026 Devpost record on July 17, 2026.

## Stop Before Editing

- Existing submission: https://devpost.com/software/afterlight-clq3uz
- Event: https://hoobit-hacks-2026.devpost.com/
- Deadline: July 18, 2026 at 8:00 PM CEST / 11:00 AM PDT
- Edit the existing project. Do not create a duplicate.
- Hoobit has no custom Devpost questions and does not mark video, website, or ZIP fields as globally mandatory. Its prose rules still require an accessible prototype or video, public GitHub code, theme fit, AI disclosure, citations, Discord membership, and participant details.
- The public event description separately asks for an AI-powered tool. Afterlight uses AI-assisted development but no runtime generative or machine-learning model. Confirm with the organizer that this qualifies; never rename the deterministic detector as AI.

## Project Overview

**Name**

```text
Afterlight
```

**Tagline**

```text
Reimagining AI-era crisis technology through source-backed disaster memory and human-controlled household practice.
```

**Thumbnail**

Upload `public/images/afterlight-hero.jpg`. The file is a 1672×941 JPG and under Devpost's 5 MB limit. Check Devpost's crop preview before saving.

**Built With**

```text
React, TypeScript, Vite, Leaflet, OpenStreetMap, NIFC WFIGS, NWS API, NASA EONET, ArcGIS, Upstash Redis, Cloudflare Workers, Vitest, Playwright, OpenAI Codex
```

Remove any platform or service that is not present in the final public build.

## Theme Defense

Theme supplied by the organizer:

> Build something that explores, shapes, improves, challenges, or reimagines a future influenced by AI.

Paste this near the beginning of the story:

> AI is entering emergency-response systems, but a crisis is the worst place for opaque predictions or confident guesses. Afterlight challenges the assumption that an AI-influenced future should depend on more black-box decision-making. It reimagines that future around attributable evidence, visible uncertainty, deterministic refusal, and human-controlled household practice. AI helped me build and test the prototype, but the product does not pretend a language model can predict a fire or decide when and where someone should evacuate.

One-line verbal answer for judges:

> Afterlight challenges the black-box side of an AI-influenced future and demonstrates a more accountable model for crisis technology: source-backed evidence, explicit uncertainty, and humans retaining the final decision.

## Project Story — Paste Into Devpost

### Inspiration

I still remember the Pasadena fires vividly. I was scared and did not know which sources I could trust to understand what was happening. Familiar roads suddenly felt uncertain, while alerts, closures, smoke, traffic, power loss, and cell outages could stack faster than a household could process them.

Most disaster products focus only on the present: the current alert, map, or incident. After the emergency, the sequence of warnings and household failures becomes scattered across reports and memory. The same lessons can disappear before the next crisis.

AI is also entering emergency-response systems, but a crisis is the worst place for opaque predictions or confident guesses. Afterlight challenges the assumption that an AI-influenced future should depend on more black-box decision-making. It reimagines that future around attributable evidence, visible uncertainty, deterministic refusal, and human-controlled household practice.

### What it does

Afterlight is a source-backed wildfire memory and preparedness prototype with three deliberately separate surfaces.

The Live Source Monitor accepts only a coarse area such as a city, ZIP code, or neighborhood. It checks current public records from NIFC WFIGS, the National Weather Service, and NASA EONET and shows source health and freshness. It does not produce evacuation timing, fire-spread predictions, or route recommendations.

Historical Replay presents attributable rows for the Palisades and Eaton Fires. Each row preserves its timestamp, official record text, source link, categorical signal, and map provenance. A deterministic, fail-closed detector recognizes only internally consistent warning or order evidence. Camp Fire acts as a negative control: because granular source rows are not loaded, Afterlight refuses to score or replay it.

The Household Drill Builder lets a user review a historical lesson and turn it into bounded pre-incident practice. A household can select non-sensitive constraints, assign primary and backup roles, practice handoffs, preserve unresolved gaps, and print a practice card. The card is not emergency guidance or proof of readiness.

Current records never inherit historical detector output, route memory, map anchors, household lessons, or drill assignments. Judge mode provides a deterministic walkthrough using isolated in-memory state, so it does not read or modify saved household data.

### How I built it

I built the interface with React 19, TypeScript, and Vite. Leaflet renders OpenStreetMap tiles, stored historical road geometry, and attributable ArcGIS perimeter data. Current-source connectors normalize NIFC WFIGS, National Weather Service, and NASA EONET responses while exposing provider and check timestamps instead of hiding freshness.

The historical detector is deterministic and categorical. It checks source identity, timestamps, official text, and warning or order language before producing an official-action state. When the evidence is malformed, inconsistent, or missing, the detector refuses to manufacture a conclusion.

Coarse-area geocoding runs behind a same-origin server boundary. The server validates input, minimizes returned data, rejects redirects, hashes cache and client keys, and uses Upstash-compatible Redis for shared quotas, caching, and provider pacing. A deployed instance fails closed when that shared boundary is unavailable. Browser-side NASA FIRMS access is intentionally absent because a secure server proxy has not been implemented.

Household memory and drill state use separate versioned browser-storage keys. Obvious exact addresses, phone numbers, emails, coordinate pairs, and access-code patterns are rejected before persistence. The interface also warns that browser storage is not encrypted, synchronized, or suitable for sensitive data.

I used Vitest for detector, storage, live-source, geocoder, and Worker coverage, and Playwright for desktop and mobile product flows.

### Challenges I ran into

The hardest challenge was maintaining an honest boundary between current public records, historical evidence, and household-authored practice. They can look similar in an interface, but treating them as equivalent could create dangerous confidence.

I also had to make coarse-area search useful without inviting exact-address collection or violating provider capacity. That required validation on both sides of the network boundary, minimized results, hashed keys, quotas, atomic pacing, strict timeouts, and safe failures.

The final challenge was resisting the easiest AI story. Calling a score or generated answer “intelligence” would have made the pitch simpler, but it would have weakened the product. Afterlight treats refusal and provenance as features.

### Accomplishments that I am proud of

- A visible separation between current monitoring, historical replay, and household practice.
- Six attributable historical rows each for Palisades and Eaton.
- A deterministic fail-closed detector and Camp Fire negative control.
- A practical drill artifact with role ownership, unresolved gaps, and no fake readiness score.
- Privacy-guarded coarse geocoding with shared server-side controls.
- A deterministic 90-second judge mode isolated from saved household state.
- Automated unit, integration, desktop, and mobile verification.

### What I learned

Trustworthy crisis software depends as much on refusing invalid inferences as on producing useful output. Provenance has to survive the entire path from a source row to a detector result to a household interpretation.

I also learned that an AI-influenced future does not require AI to make every decision. In high-stakes systems, the responsible role for AI may be helping people build, inspect, test, and communicate a tool while deterministic boundaries protect the decisions that should remain attributable and human-controlled.

### What is next

The next step is consented validation with households and emergency-preparedness stakeholders, followed by accessibility and multilingual review. Responsible expansion would require official-source partnerships, provenance governance, threat modeling, retention controls, and a secured server-side integration for any additional data provider.

Long term, Afterlight could become civic memory infrastructure: communities could review source-backed incident timelines and convert verified lessons into durable preparedness practice without turning historical evidence into current emergency advice.

## Required Disclosures

### AI use

Rewrite this in your normal voice, but preserve every fact:

> I used OpenAI Codex as an engineering assistant during prototyping, coding, testing, security/privacy review, and documentation. I supplied the product direction, source material, safety boundaries, and final decisions, then reviewed and verified the resulting work. AI also generated the optional cinematic opening image, which is labeled as a demo asset and is not presented as incident evidence. Afterlight itself does not use a runtime generative model to predict fires, recommend routes, generate evacuation instructions, or score household readiness. Its historical detector is deterministic and fail-closed.

### Originality and prior work

> I started Afterlight on July 2, 2026, during the Hoobit Hacks submission period. I also prepared a separate, unpublished Moonshot submission draft. This Hoobit entry is my original work. Third-party records, APIs, maps, and generated media are cited below and in the product.

### Safety boundary

> Afterlight is a preparedness and historical-learning prototype. It is not an emergency alerting service, fire-spread predictor, route planner, evacuation recommendation system, readiness certification, or replacement for official authorities.

## Sources and Credits

Paste this paragraph:

> Historical rows are attributed to the Fire Safety Research Institute's Southern California Fires Timeline Report and worksheets and to Los Angeles County's Eaton Fire Timeline Overview. Current public records come from NIFC WFIGS, the National Weather Service API, and NASA EONET. Maps use OpenStreetMap data and tiles plus an attributable ArcGIS Palisades and Eaton perimeter. The optional cinematic opening is AI-generated and labeled as a demo asset, not incident evidence. Afterlight does not claim that these sources prove improved household outcomes.

Add these links:

- FSRI report: https://fsri.org/research-update/southern-california-fires-timeline-report
- FSRI worksheets: https://docs.google.com/spreadsheets/d/1Xna6okyL59bk3m6oHphZrN-RWWxOtnBIL0R5EpaZ__4/edit
- LA County Eaton timeline: https://file.lacounty.gov/SDSInter/lac/1191567_EatonFireTimelineOverview.pdf
- NIFC WFIGS: https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0
- National Weather Service API: https://www.weather.gov/documentation/services-web-api
- NASA EONET API: https://eonet.gsfc.nasa.gov/docs/v3
- OpenStreetMap attribution: https://www.openstreetmap.org/copyright
- ArcGIS perimeter: https://hub.arcgis.com/maps/ad51845ea5fb4eb483bc2a7c38b2370c

## Links

**GitHub**

```text
https://github.com/rushtanu14/afterlight
```

**Public demo — add only after signed-out verification**

```text
https://afterlight-replay.rushilcpm02.chatgpt.site/?judge=1
https://afterlight-replay.rushilcpm02.chatgpt.site/
```

The Sites deployment currently returns `401` to anonymous viewers. Do not add it to Devpost until access is public and both URLs work while signed out. Production geocoding also remains unverified without the required Redis and WAF boundary; do not claim that feature works publicly until verified.

**Demo video**

No public YouTube URL is recorded. A video is not marked globally mandatory in the Devpost form, but it is the safest alternative if the prototype cannot be made publicly accessible.

## 90-Second Video Script

Use your natural speaking style rather than reading this word-for-word.

| Time | Show | Talking point |
|---|---|---|
| 0:00–0:08 | Title and three surfaces | AI is entering crisis systems, but opaque confidence can be dangerous. Afterlight explores an evidence-first alternative. |
| 0:08–0:22 | Live Source Monitor | Current public records stay separate, show freshness, and never become evacuation timing or route advice. |
| 0:22–0:42 | Palisades/Eaton rows and maps | Historical Replay preserves official text, timestamps, source links, categorical signals, and map provenance. |
| 0:42–0:55 | Detector and Camp negative control | The deterministic detector accepts consistent warning/order evidence and refuses unsupported replay. |
| 0:55–1:12 | Confirm lesson and build drill | A reviewed lesson becomes bounded practice with primary and backup owners and visible unresolved gaps. |
| 1:12–1:23 | Print card and privacy warning | The printable card preserves evidence and ownership without claiming readiness; sensitive input patterns are rejected. |
| 1:23–1:30 | Safety boundary and repo | Afterlight reimagines AI-era crisis technology around attribution, refusal, and human control—not black-box emergency decisions. |

Recording rules:

- Show the working product, not only slides or generated media.
- Keep text readable at 1080p and add captions.
- Do not show private tabs, accounts, notifications, names, or household data.
- If using the cinematic still, label it `AI-generated atmospheric visual · demo only` and leave it on screen for no more than three seconds.
- Test the uploaded YouTube link while signed out and confirm embedding works.

## Gallery Order

1. `public/images/afterlight-hero.jpg`
2. `artifacts/screenshots/afterlight-desktop-chrome.png`
3. `artifacts/screenshots/afterlight-mobile-390.png`
4. A focused screenshot of Palisades/Eaton source rows and provenance.
5. A focused screenshot of the detector and Camp Fire negative control.
6. A focused screenshot of the printable practice card and safety label.

Do not present `docs/assets/demo/afterlight-higgsfield-opening.png` as real fire evidence.

## Private Participant Information

Have this ready for the organizer. Do not place contact information in the public story unless the form explicitly makes the field private:

```text
Full legal name:
Contact email:
Discord username:
GitHub username: rushtanu14
Age:
Current educational institution:
Country:
Guardian consent confirmed, if under 18: yes / not applicable
```

Join the required Discord: https://discord.gg/ZdZhurPz2b

## Final Edit Sequence

1. Ask the organizer whether Afterlight's deterministic runtime and AI-assisted development satisfy the event's separate AI-powered requirement.
2. Make the prototype public or upload the YouTube demo; test it while signed out.
3. Push the current exact build to the public GitHub repository.
4. Open https://devpost.com/software/afterlight-clq3uz and select **Edit project**.
5. Replace the existing unsafe tagline and story with the copy above.
6. Add the Built With list, citations, originality disclosure, AI disclosure, safety boundary, verified demo, GitHub link, thumbnail, and gallery.
7. Remove every claim about `leave before` signals, safer routes, route risk, backup-route overload, fire prediction, household readiness scoring, current decision support, and browser-side NASA FIRMS.
8. Confirm the participant details and guardian consent requirement are satisfied.
9. Save, then confirm the project remains published and attached to Hoobit Hacks 2026.
10. View the submission while signed out and test every link before July 18 at 11:00 AM PDT.

## Final Checklist

- [ ] Organizer confirmed the AI-powered eligibility interpretation.
- [ ] Theme defense is included near the top of the story.
- [ ] Story is rewritten enough to sound like Rushil's authentic voice without changing facts.
- [ ] Existing project was edited; no duplicate was created.
- [ ] Public prototype or YouTube demo works while signed out.
- [ ] GitHub contains the exact submitted build and will remain public through at least August 26, 2026.
- [ ] AI use, prior-work context, sources, maps, and generated media are disclosed.
- [ ] No prohibited safety or outcome claim remains.
- [ ] Personal eligibility, institution, country, Discord, GitHub, email, and guardian-consent requirements are satisfied.
- [ ] Devpost still shows the project as published/submitted to Hoobit.

