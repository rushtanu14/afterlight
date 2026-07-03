import type { CSSProperties } from "react";
import type { Failure, IncidentOption, ReplayEvent } from "../data/replay";
import type { DetectorDecision } from "../engine/detector";
import type { LiveLocation, LiveSignal, LiveSourceState } from "../engine/liveSources";
import { connectorReadinessScore, sourceConnectors } from "../engine/sourceConnectors";

type ReplayWorkspaceProps = {
  activeDecision: DetectorDecision;
  activeEvent: ReplayEvent;
  activeIndex: number;
  confirmedFailures: Set<string>;
  edits: Record<string, string>;
  events: ReplayEvent[];
  decisionSeries: DetectorDecision[];
  incidents: IncidentOption[];
  isPlaying: boolean;
  liveError: string;
  liveLocation: LiveLocation | null;
  liveSignals: LiveSignal[];
  liveSourceStates: LiveSourceState[];
  locationInput: string;
  memoryCards: Failure[];
  searchStatus: "idle" | "loading" | "ready";
  selectedIncident: IncidentOption;
  selectedIncidentId: string;
  speed: number;
  onConfirmFailure: (id: string, checked: boolean) => void;
  onEditFailure: (id: string, value: string) => void;
  onRestart: () => void;
  onSelectEvent: (index: number) => void;
  onSelectIncident: (id: string) => void;
  onSpeedChange: (value: number) => void;
  onTogglePlay: () => void;
};

const fallbackLocation = { latitude: 34.0480643, longitude: -118.5264706 };
const mapZoom = 10;

type MapTile = {
  x: number;
  y: number;
  z: number;
};

type MapPoint = {
  id: string;
  label: string;
  kind: "home" | "fire";
  x: number;
  y: number;
  selected?: boolean;
};

function cssProgress(value: number): CSSProperties {
  return { "--progress": `${value}%` } as CSSProperties;
}

function lonToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latToTileY(latitude: number, zoom: number) {
  const radians = (latitude * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom;
}

function buildTiles(center: Pick<LiveLocation, "latitude" | "longitude">): MapTile[] {
  const centerX = Math.floor(lonToTileX(center.longitude, mapZoom));
  const centerY = Math.floor(latToTileY(center.latitude, mapZoom));
  return [
    { x: centerX - 1, y: centerY - 1, z: mapZoom },
    { x: centerX, y: centerY - 1, z: mapZoom },
    { x: centerX + 1, y: centerY - 1, z: mapZoom },
    { x: centerX - 1, y: centerY, z: mapZoom },
    { x: centerX, y: centerY, z: mapZoom },
    { x: centerX + 1, y: centerY, z: mapZoom }
  ];
}

function mapCenter(liveLocation: LiveLocation | null, selectedIncident: IncidentOption) {
  if (liveLocation && selectedIncident.latitude !== undefined && selectedIncident.longitude !== undefined) {
    return {
      latitude: (liveLocation.latitude + selectedIncident.latitude) / 2,
      longitude: (liveLocation.longitude + selectedIncident.longitude) / 2
    };
  }

  if (selectedIncident.latitude !== undefined && selectedIncident.longitude !== undefined) {
    return { latitude: selectedIncident.latitude, longitude: selectedIncident.longitude };
  }

  return liveLocation ?? fallbackLocation;
}

function projectPoint(latitude: number, longitude: number, tiles: MapTile[]) {
  const startX = Math.min(...tiles.map((tile) => tile.x));
  const startY = Math.min(...tiles.map((tile) => tile.y));
  const worldX = lonToTileX(longitude, mapZoom);
  const worldY = latToTileY(latitude, mapZoom);
  const x = ((worldX - startX) / 3) * 900;
  const y = ((worldY - startY) / 2) * 560;

  if (x < -20 || x > 920 || y < -20 || y > 580) return null;
  return { x, y };
}

function buildMapPoints(liveLocation: LiveLocation | null, incidents: IncidentOption[], selectedIncidentId: string, tiles: MapTile[]): MapPoint[] {
  const homeProjection = liveLocation ? projectPoint(liveLocation.latitude, liveLocation.longitude, tiles) : projectPoint(fallbackLocation.latitude, fallbackLocation.longitude, tiles);
  const homePoint: MapPoint | null = homeProjection
    ? {
        id: "home",
        label: liveLocation?.label ?? "Searched area",
        kind: "home",
        x: homeProjection.x,
        y: homeProjection.y
      }
    : null;
  const firePoints = incidents
    .filter((incident) => incident.latitude !== undefined && incident.longitude !== undefined)
    .map((incident): MapPoint | null => {
      const projected = projectPoint(incident.latitude as number, incident.longitude as number, tiles);
      return projected
        ? {
            id: incident.id,
            label: incident.name,
            kind: "fire" as const,
            x: projected.x,
            y: projected.y,
            selected: incident.id === selectedIncidentId
          }
        : null;
    })
    .filter((point): point is MapPoint => point !== null);

  return homePoint ? [homePoint, ...firePoints] : firePoints;
}

export function ReplayWorkspace({
  activeDecision,
  activeEvent,
  activeIndex,
  confirmedFailures,
  edits,
  events,
  decisionSeries,
  incidents,
  isPlaying,
  liveError,
  liveLocation,
  liveSignals,
  liveSourceStates,
  locationInput,
  memoryCards,
  searchStatus,
  selectedIncident,
  selectedIncidentId,
  speed,
  onConfirmFailure,
  onEditFailure,
  onRestart,
  onSelectEvent,
  onSelectIncident,
  onSpeedChange,
  onTogglePlay
}: ReplayWorkspaceProps) {
  const connectorScore = connectorReadinessScore(sourceConnectors);
  const firstLeaveNow = decisionSeries.find((decision) => decision.mode === "leave_now");
  const center = mapCenter(liveLocation, selectedIncident);
  const mapTiles = buildTiles(center);
  const mapPoints = buildMapPoints(liveLocation, incidents, selectedIncidentId, mapTiles);
  const hasLiveSources = liveSourceStates.length > 0;
  const liveIncidentCount = incidents.filter((incident) => incident.sourceId).length;

  return (
    <section className="workspace" id="replay" aria-labelledby="workspace-title">
      <div className="workspace-hero">
        <div>
          <p className="signal-label">Incident workspace</p>
          <h2 id="workspace-title">A source-backed replay that becomes a usable plan.</h2>
        </div>
        <p>
          Afterlight keeps the judge-facing story simple: where you are, which fires matter, what official signals appeared first, and what a
          household should preserve before the next crisis.
        </p>
      </div>

      <div className="control-strip" aria-label="Replay controls">
        <div className="control-left">
          <button className="icon-button" type="button" onClick={onTogglePlay} aria-label={isPlaying ? "Pause replay" : "Play replay"}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button className="icon-button subtle" type="button" onClick={onRestart} aria-label="Restart replay">
            Restart
          </button>
          <label className="speed-control" htmlFor="speedRange">
            <span>Replay speed</span>
            <input id="speedRange" type="range" min="900" max="2600" value={speed} step="100" onChange={(event) => onSpeedChange(Number(event.target.value))} />
          </label>
        </div>
        <div className="cache-meter" aria-label="Offline cache status">
          <span>Offline packet</span>
          <strong>{activeEvent.cache}%</strong>
        </div>
      </div>

      <div className="ops-grid">
        <aside className="incident-panel" aria-label="Nearby fire records">
          <div className="panel-header">
            <div>
              <p className="signal-label">Search area</p>
              <h3>{liveLocation?.label ?? locationInput}</h3>
            </div>
            <span className="feed-pill">{searchStatus === "loading" ? "Scanning" : hasLiveSources ? "Live query" : "Matched"}</span>
          </div>
          {liveError ? <p className="inline-alert">{liveError}</p> : null}
          {hasLiveSources && liveIncidentCount === 0 ? (
            <p className="inline-note">No current wildfire points were returned nearby; reference records remain loaded for the replay engine.</p>
          ) : null}
          <div className="incident-list">
            {incidents.map((incident) => (
              <button
                className={`incident-card${incident.id === selectedIncidentId ? " active" : ""}`}
                type="button"
                key={incident.id}
                onClick={() => onSelectIncident(incident.id)}
                aria-pressed={incident.id === selectedIncidentId}
              >
                <span>{incident.sourceId ? `${incident.sourceId.toUpperCase()} · ${incident.distance}` : incident.distance}</span>
                <strong>{incident.name}</strong>
                <small>{incident.location}</small>
              </button>
            ))}
          </div>
          <article className="source-summary">
            <span>{selectedIncident.confidence}</span>
            <h4>{selectedIncident.started}</h4>
            <p>{selectedIncident.summary}</p>
          </article>
        </aside>

        <section className="map-panel" aria-labelledby="map-title">
          <div className="panel-header map-header">
            <div>
              <p className="signal-label">Official timestamp {activeEvent.time}</p>
              <h3 id="map-title">{activeEvent.title}</h3>
            </div>
            <span className={`feed-pill risk-${activeEvent.risk}`}>{activeEvent.risk}</span>
          </div>

          <div className="map-stage" aria-label="Live incident map with route and fire overlays">
            <div className="osm-grid" aria-hidden="true">
              {mapTiles.map((tile) => (
                <img
                  key={`${tile.z}-${tile.x}-${tile.y}`}
                  src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
                  alt=""
                  loading="lazy"
                />
              ))}
            </div>
            <div className="map-vignette" aria-hidden="true" />
            <svg className="route-layer" viewBox="0 0 900 560" role="img" aria-label="Evacuation route, backup route, blocked roads, and fire spread">
              <defs>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path className="hazard-field" style={cssProgress(activeEvent.spread)} d="M565 44 C678 40 770 102 824 194 C784 228 704 244 636 222 C582 204 526 156 502 104 C516 78 535 58 565 44Z" />
              <path className="route primary-route" d="M102 458 C204 420 298 384 386 330 C494 264 564 208 710 144" />
              <path className="route backup-route" d="M96 374 C214 356 326 340 430 300 C548 256 650 244 790 282" />
              <path className="blocked-route" d="M342 160 C458 190 568 214 690 206" />
              <path className="smoke-vector" d="M662 112 C568 126 472 148 374 194 C292 232 214 270 132 302" />
              {mapPoints.map((point) => (
                <circle
                  className={`node ${point.kind === "home" ? "home-node" : "live-fire-node"}${point.selected ? " selected" : ""}`}
                  cx={point.x}
                  cy={point.y}
                  r={point.kind === "home" ? 10 : point.selected ? 12 : 8}
                  key={point.id}
                >
                  <title>{point.label}</title>
                </circle>
              ))}
            </svg>
            <div className="map-callout fire">Fire movement</div>
            <div className="map-callout primary">Primary route</div>
            <div className="map-callout backup">Backup route</div>
            <div className="map-caption">
              <strong>{activeEvent.signal}</strong>
              <span>
                {selectedIncident.sourceId
                  ? `${selectedIncident.name} is plotted from ${selectedIncident.confidence}; route overlays show the household decision model.`
                  : activeEvent.caption}
              </span>
            </div>
            <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap
            </a>
          </div>
        </section>

        <aside className="decision-panel" aria-label="Decision engine">
          <div className="panel-header">
            <div>
              <p className="signal-label">Decision engine</p>
              <h3>{activeDecision.mode === "leave_now" ? "Leave now threshold crossed." : "Leave before signs stack again."}</h3>
            </div>
            <span className="feed-pill">{activeDecision.score} risk score</span>
          </div>
          <div className="signal-stack">
            <div>
              <span>Route closure risk</span>
              <i style={cssProgress(activeDecision.routeClosureRisk === "high" ? 92 : activeDecision.routeClosureRisk === "medium" ? 58 : 24)} />
              <strong>{activeDecision.routeClosureRisk}</strong>
            </div>
            <div>
              <span>Backup overload</span>
              <i style={cssProgress(activeDecision.backupOverloadRisk === "high" ? 88 : activeDecision.backupOverloadRisk === "medium" ? 55 : 18)} />
              <strong>{activeDecision.backupOverloadRisk}</strong>
            </div>
            <div>
              <span>Mobility buffer</span>
              <i style={cssProgress(activeDecision.mobilityBufferMinutes + 40)} />
              <strong>{activeDecision.mobilityBufferMinutes}m</strong>
            </div>
          </div>
          <article className="action-card">
            <span>Recommended route</span>
            <p>
              {activeDecision.recommendedRoute.name}: {activeDecision.leaveBeforeSignal}
            </p>
          </article>
          <div className="rule-trace" aria-label="Detector rule trace">
            {activeDecision.evidenceTrail.slice(0, 4).map((item) => (
              <span key={`${item.rule}-${item.time}`}>
                <strong>{item.rule.replaceAll("_", " ")}</strong>
                {item.detail}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <div className="lower-grid">
        <section className="timeline-panel" aria-label="Timestamped incident timeline">
          <div className="panel-header">
            <div>
              <p className="signal-label">Timestamp chain</p>
              <h3>What happened first</h3>
            </div>
            <span className="feed-pill">{events.length} rows</span>
          </div>
          <div className="timeline-list">
            {events.map((event, index) => (
              <button
                className={`event-card${index === activeIndex ? " active" : ""}`}
                type="button"
                key={event.time}
                onClick={() => onSelectEvent(index)}
                aria-pressed={index === activeIndex}
              >
                <span className="event-time">{event.time}</span>
                <span>
                  <span className="event-title">{event.title}</span>
                  <p>
                    {event.source} · {decisionSeries[index]?.mode === "leave_now" ? "leave-now" : decisionSeries[index]?.routeClosureRisk ?? "risk"} signal
                  </p>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="evidence-panel" id="connectors" aria-label="Source connectors and evidence chain">
          <div className="panel-header">
            <div>
              <p className="signal-label">Source connectors</p>
              <h3>Live public data chain</h3>
            </div>
            <span className="feed-pill">{connectorScore}% ready</span>
          </div>
          {hasLiveSources ? (
            <div className="live-source-list" aria-label="Live source health">
              {liveSourceStates.map((state) => (
                <article className={`live-source-row status-${state.status}`} key={state.id}>
                  <span>{state.status}</span>
                  <strong>{state.name}</strong>
                  <p>{state.detail}</p>
                  <small>
                    {state.count} records · {new Date(state.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </small>
                </article>
              ))}
            </div>
          ) : null}
          {liveSignals.length > 0 ? (
            <div className="live-signal-strip" aria-label="Live alerts and thermal signals">
              {liveSignals.slice(0, 4).map((signal) => (
                <a className={`live-signal severity-${signal.severity}`} href={signal.url} target="_blank" rel="noreferrer" key={signal.id}>
                  <span>{signal.source}</span>
                  <strong>{signal.title}</strong>
                  <p>{signal.detail}</p>
                </a>
              ))}
            </div>
          ) : null}
          <div className="connector-grid">
            {sourceConnectors.map((connector) => (
              <article key={connector.name} className="connector-card">
                <span>{connector.status}</span>
                <strong>{connector.name}</strong>
                <p>{connector.detail}</p>
                <small>{connector.proof}</small>
              </article>
            ))}
          </div>
          <article className="engine-proof">
            <span>Replay validation</span>
            <strong>First leave-now threshold: {firstLeaveNow?.time ?? "none"}</strong>
            <p>
              The detector replays every timestamp in order and records the first point where hazard movement, route stress, and official-source
              confidence stack into a household route decision.
            </p>
          </article>
          <div className="evidence-chain">
            {activeEvent.evidence.map((item) => (
              <a href={item.url} target="_blank" rel="noreferrer" key={`${item.label}-${item.source}`}>
                <span>{item.label}</span>
                <strong>{item.source}</strong>
                <p>{item.detail}</p>
              </a>
            ))}
          </div>
        </section>

        <aside className="review-panel" aria-label="Detected failures and memory cards">
          <div className="panel-header">
            <div>
              <p className="signal-label">Detected failures</p>
              <h3>Confirm memory</h3>
            </div>
            <span className="feed-pill">{memoryCards.length} saved</span>
          </div>

          <div className="failure-stack">
            {activeEvent.failures.map((failure) => (
              <article className="failure-card" key={failure.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={confirmedFailures.has(failure.id)}
                    onChange={(event) => onConfirmFailure(failure.id, event.target.checked)}
                  />
                  <span>
                    <h4>{failure.title}</h4>
                    <p>{failure.text}</p>
                  </span>
                </label>
                <textarea
                  aria-label={`Edit ${failure.title} lesson`}
                  value={edits[failure.id] ?? failure.text}
                  onChange={(event) => onEditFailure(failure.id, event.target.value)}
                />
              </article>
            ))}
          </div>

          <div className="memory-output" id="memory">
            <div className="panel-header small">
              <div>
                <p className="signal-label">Household plan</p>
                <h3>Crisis cards</h3>
              </div>
            </div>
            <div className="memory-cards">
              {memoryCards.length === 0 ? (
                <article className="memory-card empty">Confirm a detected failure to generate the first household memory card.</article>
              ) : (
                memoryCards.map((failure) => (
                  <article className="memory-card" key={failure.id}>
                    <h4>{failure.title}</h4>
                    <p>{edits[failure.id] || failure.card}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
