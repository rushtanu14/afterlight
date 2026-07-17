# Afterlight — Hoobit Hacks 2026 Submission Pack

Verified on July 16, 2026.

## Submission Status

Afterlight is **already submitted** to [Hoobit Hacks 2026](https://hoobit-hacks-2026.devpost.com/). The authenticated Devpost record shows it was published and submitted on July 5, 2026. Edit the existing [Afterlight project](https://devpost.com/software/afterlight-clq3uz); do not create a duplicate. Corrections remain possible while submissions are open, until **July 18, 2026 at 8:00 PM CEST / 11:00 AM PDT**.

The live submission needs correction before judging. Its current public copy predates the trust-hardening work and still claims `leave before` signals, safer-route context, hazard/route scoring, decision support, and optional browser-side NASA FIRMS. Those claims no longer match the repository and cross the product's current safety boundaries. It also has no video URL and its only submitted website link is the GitHub repository; the working Sites deployment is owner-only and returns HTTP `401` to signed-out judges.

Afterlight is a strong social-good and problem fit, but its **AI eligibility is unresolved**. Hoobit asks for an AI-powered tool; Afterlight's runtime detector is deliberately deterministic and does not call a generative or machine-learning model. Using AI during development does not make the submitted product AI-powered. Ask the organizers in a Discord ticket whether this architecture qualifies before submitting; do not label the detector as AI unless they explicitly accept that interpretation.

The Git history shows that Afterlight was started on July 2, 2026, inside Hoobit's published submission window. A separate unpublished Moonshot submission draft exists on Devpost. Because Hoobit rejects uncited resubmissions and requires original work, disclose that history exactly; do not imply the project was conceived specifically for Hoobit.

Before submitting, confirm both the current event theme and AI eligibility in the Hoobit Discord. The public Devpost overview still shows its theme section as unreleased even though the event is active. If the announced theme does not cover disaster preparedness, ask the organizers whether Afterlight qualifies.

## Hoobit Eligibility and Required Fields

- Every participant must be a student and age 13–24. A guardian's consent is expected for minors.
- The prototype or a short YouTube demo must be publicly accessible.
- The submitted code must stay public on GitHub until at least **August 26, 2026**, one month after the scheduled July 26 winner announcement.
- Join the [Hoobit Discord](https://discord.gg/ZdZhurPz2b) and follow its rules.
- Provide every team member's legal name, contact email, Discord username, GitHub username, age, educational institution, and country in the submission form.
- Disclose every material use of AI and cite third-party data, statistics, images, and prior work.
- Read the [event overview](https://hoobit-hacks-2026.devpost.com/), [rules](https://hoobit-hacks-2026.devpost.com/rules), [schedule](https://hoobit-hacks-2026.devpost.com/details/dates), and any organizer announcements immediately before the final click.

Personal details to have ready; do not commit them to this repository:

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

Discord ticket message; send this in your own voice:

> Hi, I am preparing an entry called Afterlight. It is a working, source-backed wildfire-preparedness tool that separates current public records, historical replay, and household drills. Its runtime detector is deterministic and fail-closed; it does not call a generative or machine-learning model, although I used AI tools during development and will disclose that. The Git history begins July 2, during the event submission period, and the project was prepared for but never submitted to another hackathon. Does this satisfy Hoobit's AI-powered requirement and current theme, or would it be ineligible? I want to describe it accurately before submitting.

## Project Overview Fields

**Project name**

Afterlight

**Tagline** — 116 characters, below Devpost's 140-character limit

> A source-backed wildfire memory system that turns historical failure chains into safer, repeatable household drills.

**Thumbnail**

Upload `public/images/afterlight-hero.jpg` (409,451 bytes). It is a 1672×941 JPG and therefore under Devpost's 5 MB limit. Devpost recommends a 3:2 image; this source is 16:9, so use Devpost's crop preview carefully and keep the central subject/title-safe area visible.

**Submitter type**

Individual, unless actual teammates contributed and have agreed to be listed.

**Built with tags**

React, TypeScript, Vite, Vitest, Playwright, Leaflet, OpenStreetMap, ArcGIS, NWS API, NASA EONET, Upstash Redis, Cloudflare Workers, Vercel

Only keep deployment-platform tags for platforms you actually deploy to before submitting.

**Proposed theme fit — paste only after the organizers confirm the theme and AI eligibility**

> Afterlight addresses a failure that appears after every major disaster: the evidence exists, but the lesson does not reliably survive. It turns attributable wildfire timelines into bounded household practice while refusing to turn historical evidence into live emergency advice.

**Originality and prior-work disclosure**

> I built Afterlight during the Hoobit Hacks 2026 submission period. I also prepared a separate, unpublished Moonshot submission draft. This Hoobit entry is my original work. I have cited the official records, public APIs, maps, generated demo asset, and AI-assisted development work used in the project.

**AI-use disclosure — rewrite in your own voice, but preserve every fact**

> I used OpenAI Codex as an engineering assistant while prototyping, coding, testing, reviewing security and privacy boundaries, and organizing documentation. I directed the product concept, selected the safety boundaries and source material, reviewed the generated changes, and made the final product decisions. The app itself does not use a generative model to predict fires, recommend routes, or generate evacuation advice. Its historical detector is deterministic and fail-closed.

## Project Story — Copy Ready

### Inspiration

Most disaster tools focus on what is happening now: current alerts, current maps, and current roads. That matters, but it leaves another problem unsolved. After a disaster, the sequence of warnings, closures, and household failures is scattered across reports and memory. The same lessons can be forgotten before the next incident.

Afterlight explores a different primitive: disaster memory that remains attributable to official source rows and can be converted into pre-incident household practice. The goal is not to predict a fire or replace emergency agencies. It is to help people inspect what happened, preserve the lesson honestly, and assign a repeatable drill before the next crisis.

### What it does

Afterlight has three deliberately separate surfaces.

1. The Live Source Monitor accepts only a coarse area such as a city, ZIP code, or neighborhood. It shows current public records from NIFC WFIGS, the National Weather Service, and NASA EONET with source-health and freshness labels. It never turns those records into evacuation timing or route advice.
2. Historical Replay presents attributable Palisades and Eaton Fire rows with timestamps, official record text, source links, categorical signals, and map provenance. A fail-closed detector recognizes only internally consistent warning or order rows; it refuses to manufacture conclusions from malformed or insufficient evidence.
3. The Household Drill Builder lets a user confirm historical lessons, select non-sensitive constraints, assign primary and backup roles, choose bounded decisions, practice handoffs, and print a card that keeps unresolved gaps visible. The card is explicitly labeled as pre-incident practice, not emergency guidance.

Current records never inherit historical detector output, route memory, map anchors, household lessons, or drill assignments. Judge mode provides a deterministic 90-second walkthrough while using isolated in-memory state, so it never reads or modifies saved household data.

### How we built it

The interface is built with React 19, TypeScript, and Vite. Leaflet renders maps with OpenStreetMap tiles, stored historical road geometry, and attributable ArcGIS perimeter data. Current public-source connectors normalize NIFC WFIGS, NWS, and NASA EONET responses and expose provider/check timestamps instead of hiding data freshness.

The historical detector is deterministic and categorical. It verifies source identity, timestamps, official text, and warning/order language before emitting an official-action state. Camp Fire is used as an archive-only negative control: because granular source rows are not loaded, Afterlight refuses to score or replay it.

Coarse-area geocoding runs behind a same-origin server boundary. The server revalidates input, hashes cache and client keys, minimizes returned data, rejects redirects, and uses Upstash-compatible Redis for shared quotas, caching, and atomic provider pacing. Deployed instances fail closed if shared Redis is unavailable. Browser-side NASA FIRMS access is intentionally absent because a secure server proxy has not been implemented.

Household memory and drill state use separate versioned browser-storage keys. Obvious exact-address, phone, email, signed or labeled coordinate-pair, and access-code patterns are rejected before persistence, while the UI still warns that browser storage is not encrypted, synchronized, or suitable for sensitive data.

Vitest covers the detector, storage boundaries, live-source normalization, geocoder proxy, and Worker routing. Playwright checks the desktop and mobile product flows. The project can build for Vercel or bundle as a Cloudflare Worker and static single-page app.

### Challenges we ran into

The hardest challenge was maintaining an honest boundary between three kinds of information that look similar in a UI but must never be treated as equivalent: current public records, historical evidence, and household-authored practice.

We also had to make geocoding useful without inviting exact-address collection or violating provider capacity. That required coarse-query validation on both sides of the network boundary, minimized responses, hashed keys, shared quotas, atomic pacing, strict timeouts, and safe failures.

Finally, we resisted the temptation to turn uncertainty into a score. Afterlight does not claim fire prediction, current route risk, household readiness, or improved outcomes. When evidence is insufficient, the system says so.

### Accomplishments that we're proud of

- A visible, testable separation between live monitoring, historical replay, and household practice.
- An evidence-linked replay with six attributable rows each for Palisades and Eaton.
- A fail-closed detector and a Camp Fire negative control that demonstrate refusal behavior, not just successful cases.
- A practical drill artifact with role ownership, unresolved gaps, provenance, and no fake readiness score.
- A privacy-guarded, fail-closed geocoder boundary with shared Redis controls.
- A deterministic 90-second judge mode that never reads or writes saved household state.
- Desktop/mobile automated coverage plus production and Cloudflare bundle checks.

### What we learned

Trustworthy crisis software depends as much on refusing invalid inferences as on producing useful output. Provenance has to survive the entire path from source row to detector result to household interpretation. We also learned that “device local” is not the same as private or secure, so input minimization, explicit warnings, and deletion controls still matter.

### What's next for Afterlight

The next step is not another prediction feature. It is consented validation with households and emergency-preparedness stakeholders, followed by accessibility and multilingual review. A responsible expansion would also require official-source partnerships, provenance governance, threat modeling, retention controls, and a properly secured server-side FIRMS integration.

Long term, Afterlight could become civic memory infrastructure: communities could review source-backed incident timelines and convert verified lessons into durable preparedness practice without turning historical evidence into current emergency advice.

## Links to Enter

**Code repository**

https://github.com/rushtanu14/afterlight

**Try it out**

Current Sites URL:

```text
https://afterlight-replay.rushilcpm02.chatgpt.site/?judge=1
```

This deployment is currently owner-only and does **not** satisfy Hoobit's public-access requirement. Make the site public, then test the exact judge-mode URL in a signed-out/private browser window before entering it. Use judge mode as the first Try it Out link and `https://afterlight-replay.rushilcpm02.chatgpt.site/` second. Do not submit `localhost`.

**Demo video**

Hoobit permits a publicly accessible prototype or a short YouTube demo, but a concise demo still makes the submission stronger. Upload the finished recording to YouTube with public or unlisted visibility and embedding enabled, then paste its share URL.

**Supporting files already in this repository**

- Moonshot paper: `docs/moonshot-paper.md`
- Vision presentation script: `docs/vision-presentation.md`
- Judge brief: `docs/judge-brief.md`
- Cinematic opening asset and receipt: `docs/demo-cinematic-opening.md`

These are evidence and presentation aids, not Hoobit-required uploads unless the live form asks for them.

## Sources and Credits — Copy Ready

> Historical timeline rows are attributed in-product to the Fire Safety Research Institute's Southern California Fires Timeline Report and worksheets and to Los Angeles County's Eaton Fire Timeline Overview. Current records come from NIFC WFIGS, the National Weather Service API, and NASA EONET. Maps use OpenStreetMap data/tiles and an attributable ArcGIS Palisades and Eaton perimeter. The cinematic opening image is AI-generated and is labeled as a demo asset, not incident evidence. Afterlight does not claim that these sources prove improved household outcomes.

Add these links to the Devpost story or credits field:

- [FSRI Southern California Fires Timeline Report](https://fsri.org/research-update/southern-california-fires-timeline-report)
- [FSRI Palisades and Eaton timeline worksheets](https://docs.google.com/spreadsheets/d/1Xna6okyL59bk3m6oHphZrN-RWWxOtnBIL0R5EpaZ__4/edit)
- [Los Angeles County Eaton Fire Timeline Overview](https://file.lacounty.gov/SDSInter/lac/1191567_EatonFireTimelineOverview.pdf)
- [NIFC WFIGS current incident layer](https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0)
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api)
- [NASA EONET API](https://eonet.gsfc.nasa.gov/docs/v3)
- [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright)
- [Palisades and Eaton dissolved fire perimeters](https://hub.arcgis.com/maps/ad51845ea5fb4eb483bc2a7c38b2370c)

## 90-Second Demo Video Script

Record a real screen capture of the product. Use the cinematic still only for the first 2.5–3 seconds, then show the actual interface. Do not imply that the still is fire evidence.

| Time | Show | Narration |
|---|---|---|
| 0:00–0:08 | Title, then the three product surfaces | “Disaster tools remember the present. Afterlight preserves how failure chains unfolded and turns verified lessons into household practice.” |
| 0:08–0:22 | Live Source Monitor and coarse-area boundary | “Current public records stay separate. Afterlight accepts only a coarse area, shows source health and freshness, and never generates evacuation timing or route advice.” |
| 0:22–0:42 | Palisades/Eaton official rows and maps | “Historical Replay preserves the timestamp, official text, source link, categorical signal, and map provenance for each loaded row.” |
| 0:42–0:55 | Evaluation and Camp negative control | “The detector recognizes only consistent warning or order evidence. Camp Fire is deliberately unscored because granular rows are not loaded.” |
| 0:55–1:12 | Confirm a lesson and show Drill Builder | “A reviewed lesson can become a bounded household adaptation, then a drill with a decision, primary owner, backup owner, and unresolved gaps.” |
| 1:12–1:23 | Printable card and privacy warning | “The printable card preserves evidence and ownership without claiming readiness. Sensitive exact-address and contact patterns are rejected before browser storage.” |
| 1:23–1:30 | Safety boundary / repo | “Afterlight is pre-incident practice, not emergency guidance. The code, tests, sources, and exact non-claims are public.” |

Video checklist:

- 1080p preferred; text must remain readable.
- Use narration or burned-in captions.
- Show the product operating, not only slides or cinematic assets.
- Keep account tabs, notifications, names, and private browser data out of frame.
- Upload early enough for YouTube/Vimeo processing.
- Test the final link in a signed-out/private browser window and confirm Devpost can embed it.

## Gallery Uploads

Recommended order:

1. `public/images/afterlight-hero.jpg` as the thumbnail.
2. `artifacts/screenshots/afterlight-desktop-chrome.png` for the full desktop proof.
3. `artifacts/screenshots/afterlight-mobile-390.png` for mobile responsiveness.
4. A cropped screenshot of the evaluation panel and Camp negative control.
5. A cropped screenshot of the printable drill card and its safety label.

The full-page screenshots are tall, so crop focused gallery images before upload. Never label `docs/assets/demo/afterlight-higgsfield-opening.png` as incident evidence; it is a generated demo-only opening.

## Exact Submission Steps

### Correct the existing Hoobit submission

1. Open the existing [Afterlight submission](https://devpost.com/software/afterlight-clq3uz) and choose **Edit project**. Do not start another project.
2. Open a Discord ticket: state that Afterlight is a deterministic, source-backed wildfire-preparedness tool with no runtime generative model; ask whether it satisfies the AI-powered requirement and announced theme. Save the organizer reply.
3. Make the Sites deployment public and verify both public URLs while signed out.
4. Push the current `main` branch so the public GitHub repository contains the exact submitted build.
5. Replace the old tagline and story with the name, tagline, Built With tags, story, source credits, originality disclosure, and AI-use disclosure from this file.
6. Add the verified public judge-mode URL while keeping the GitHub URL. Remove NASA FIRMS from the live feature claims and remove every `leave before`, safer-route, route-risk, prediction, scoring, or current decision-support claim.
7. Add only actual teammates, then provide every required identity/contact field in Devpost's private additional-details area. Do not paste those details into the public story.
8. Upload the gallery images in the recommended order. Add the YouTube demo if recorded.
9. Save the edit, then confirm the project remains attached to Hoobit Hacks 2026 and still shows the submitted/published state.
10. Open **View** in a private browser window and test every link, image, video, and Markdown section before the deadline.

## Final No-Fabrication Checklist

- [ ] Rushil is age 13–24, currently a student, and has guardian consent if required.
- [ ] The Discord-announced theme was checked and the theme-fit sentence is accurate.
- [ ] Hoobit confirmed that Afterlight's deterministic runtime satisfies the AI-powered requirement, or a truthful qualifying AI feature was added and verified before submission.
- [ ] The project history and AI usage are disclosed honestly.
- [ ] The repository contains the exact submitted build and is publicly accessible if required.
- [ ] A public deployment loads on desktop and mobile.
- [ ] `/?judge=1` works on the public deployment.
- [ ] Production `/api/geocode` was verified with shared Redis before claiming it works publicly.
- [ ] The demo video is hosted on YouTube or Vimeo and embeds while signed out.
- [ ] The video shows working software and obeys the event's maximum length.
- [ ] The thumbnail is below 5 MB and looks correct in Devpost's 3:2 crop.
- [ ] No participant outcome, human-validation quote, fire prediction, route recommendation, readiness score, or public deployment claim was added without direct proof.
- [ ] The project is marked **Submitted**, not **Draft**.

## Current External Blockers

1. Afterlight does not currently contain a runtime generative or machine-learning model; Hoobit organizer confirmation is needed before claiming it meets the AI-powered requirement.
2. The Hoobit theme is not visible on its public Devpost page; confirm it in Discord before claiming theme fit.
3. The Sites deployment exists but is owner-only; it must be made public and tested while signed out.
4. The existing Devpost copy contains outdated and unsafe claims that do not match the current code or trust boundaries.
5. Local `main` is two commits ahead of `origin/main`; the exact current build is not yet on the public GitHub repository.
6. The live Devpost record has no video URL. This is optional if the public prototype works, but recommended.
7. Personal eligibility/contact fields and guardian consent status cannot be completed from repository evidence.
8. Human validation remains pending and must not be implied in the submission.
