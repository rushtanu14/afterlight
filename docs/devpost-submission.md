# Afterlight Devpost Submission Pack

Verified on July 16, 2026.

## Submission Status

The intended [Moonshot Hackathon](https://moonshot-aethra.devpost.com/) is closed. Its organizers extended the final submission deadline from June 30 to July 5, 2026, then stated that the extension was final. Do not describe Afterlight as submitted to Moonshot unless the organizers explicitly reopen the event.

You can still publish Afterlight as a Devpost portfolio project now, then import that project into a future eligible hackathon. Use [Devpost's project-entry guide](https://help.devpost.com/article/122-how-to-enter-a-submission) for a future event or [Devpost's portfolio guide](https://help.devpost.com/article/116-adding-projects-to-your-portfolio) for the portfolio-only route.

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

Required before a competitive submission. Deploy first, verify it, then enter:

```text
https://YOUR-PUBLIC-DEPLOYMENT.example/?judge=1
```

Use the judge-mode URL as the first Try it Out link. Add the plain home URL second. Do not submit `localhost`.

**Demo video**

Required before a competitive submission. Upload the finished recording to YouTube or Vimeo with public or unlisted visibility and embedding enabled, then paste its share URL. Devpost does not accept a local video path as the demo link.

**Moonshot supporting files already in this repository**

- Moonshot paper: `docs/moonshot-paper.md`
- Vision presentation script: `docs/vision-presentation.md`
- Judge brief: `docs/judge-brief.md`
- Cinematic opening asset and receipt: `docs/demo-cinematic-opening.md`

The closed Moonshot event required a prototype/demonstration, Moonshot paper, and vision presentation. If the organizers reopen submissions, export the paper and presentation to the exact formats requested in the live form before uploading.

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

### Portfolio route available now

1. Sign in at [Devpost](https://devpost.com/).
2. Follow [Adding projects to your portfolio](https://help.devpost.com/article/116-adding-projects-to-your-portfolio) and choose **Add a project to your Portfolio**.
3. Enter the name, tagline, and thumbnail above.
4. Paste the Project Story and Built With tags.
5. Add the verified deployment and repository under Try it Out.
6. Add the final YouTube/Vimeo demo link and gallery images.
7. Save, open **View**, and proofread every field in the rendered page.

### Future hackathon route

1. Register for the eligible event and re-read its live Rules and Requirements pages.
2. From the event overview, choose **Start project**, or **Import from portfolio** if this project is already published.
3. Confirm team size, age, country, build-period, required-tool, category, license, and video-length rules before importing the copy.
4. Complete Manage Team, Project Overview, Project Details, and every event-specific Additional Details field.
5. Check the agreement box and click **Submit project**. A Draft is not a submission.
6. Confirm Devpost shows the green submitted state, then open **View** in a private browser window and test every link, image, video, and Markdown section.

## Final No-Fabrication Checklist

- [ ] The chosen hackathon is open and Rushil is eligible.
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

1. Moonshot is closed; only the organizers can reopen it.
2. The repository does not yet contain a verified public deployment URL.
3. The repository does not yet contain a public YouTube/Vimeo demo URL.
4. Human validation remains pending and must not be implied in the submission.
