# Afterlight: Disaster Memory as a Decision Engine

## Core Claim

Evacuation failure is usually treated as a routing problem or an alerting problem. Afterlight argues that it is a memory problem.

Communities repeatedly learn the same painful lessons: a familiar road fails under smoke and congestion, a warning arrives after visible signs, someone with limited mobility needs extra time, and the lesson disappears after the incident report fades. Afterlight turns those past failure chains into a replayable decision engine.

## Misunderstood Problem

Most tools ask, "Where is the fire now?" or "What route is open now?"

That is too late for many households. The practical question is earlier:

What combination of signs should make this specific household leave before the same failure pattern stacks again?

## Why Existing Solutions Are Insufficient

- Alert dashboards show official status, but they usually do not preserve the local consequence of that status.
- Route planners optimize the present road graph, but they do not remember when a familiar shortcut historically became unsafe.
- Preparedness checklists are static, so they fail to absorb evidence from real incidents.
- Incident reports contain lessons, but they are not executable during the next event.

## First-Principles Insight

A disaster is not only an event. It is a sequence.

If a historical sequence can be represented as timestamped signals, route stress, hazard movement, source confidence, and household constraints, then a future household can use that sequence as a decision object.

Afterlight's primitive is therefore not an alert. It is a memory-to-action trace:

1. Source signal appears.
2. Failure pattern is detected.
3. Household constraint is applied.
4. Route recommendation changes.
5. The lesson becomes a reusable crisis card.

## Prototype Architecture

The current prototype is intentionally narrow and auditable.

- `src/data/replay.ts` stores curated replay events, incident options, official-source links, route stress, hazard movement, source confidence, and failure cards.
- `src/engine/detector.ts` scores each timestamp into route closure risk, backup overload risk, mode, route choice, leave-before signal, and an evidence trail.
- `src/engine/sourceConnectors.ts` models the future connector layer for NWS, CAL FIRE, NASA FIRMS, OpenStreetMap, ArcGIS, and household memory.
- `src/components/ReplayWorkspace.tsx` renders the source chain, map overlay, rule trace, failure confirmation, and household cards.
- `tests/detector.test.ts` verifies the detector catches the first leave-now threshold in timestamp order.

## Detector Model

The detector does not pretend to predict fire behavior. It detects failure-chain recurrence.

Inputs:

- hazard movement
- route stress
- official-source confidence
- assistance or mobility pressure
- household mobility buffer

Outputs:

- `routeClosureRisk`
- `backupOverloadRisk`
- `mode`
- `recommendedRoute`
- `leaveBeforeSignal`
- `evidenceTrail`

The first leave-now threshold currently appears at `18:42`, when route stress, hazard movement, and official-source confidence stack together.

## Why This Is Not a Route Planner

A route planner answers: "Where should I go right now?"

Afterlight answers: "Which remembered failure pattern is beginning again, and what should this household do before it repeats?"

The route is only one part of the artifact. The actual product is the conversion of incident memory into household-specific action.

## Long-Term Implications

If this works, cities and households could build disaster memory libraries:

- fire season route rules
- school pickup failure patterns
- mobility-assistance thresholds
- power and signal loss playbooks
- post-incident lessons that stay executable

The future version is a civic memory layer: every incident improves the next decision instead of becoming a PDF that nobody opens again.

## Prototype Boundary

Afterlight is not an official emergency-alerting system. During active emergencies, people must follow official evacuation orders and local agencies.

The prototype demonstrates a new category: disaster memory that operates.
