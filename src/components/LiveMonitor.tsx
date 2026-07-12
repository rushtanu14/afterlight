import type { LiveIncidentBundle } from "../engine/liveSources";

type LiveMonitorProps = {
  bundle: LiveIncidentBundle | null;
  error: string;
  submittedQuery: string;
  resultQuery: string;
  searchStatus: "idle" | "loading" | "ready" | "error";
};

export function LiveMonitor({ bundle, error, submittedQuery, resultQuery, searchStatus }: LiveMonitorProps) {
  const checkedStates = bundle?.sourceStates.filter((state) => state.status !== "optional") ?? [];
  const usableCount = checkedStates.filter((state) => state.status === "live" || state.status === "quiet").length;
  const areaStatus =
    searchStatus === "loading"
      ? `Checking public sources for ${submittedQuery}`
      : searchStatus === "error"
        ? "No current result loaded"
        : resultQuery || bundle?.location?.label || "No area checked yet";

  return (
    <section className="workspace" id="connectors" aria-labelledby="live-monitor-title" aria-busy={searchStatus === "loading"}>
      <div className="workspace-hero">
        <div>
          <p className="signal-label">Live source monitor</p>
          <h2 id="live-monitor-title">Current public signals, kept separate from historical decisions.</h2>
        </div>
        <p>
          This monitor shows current incident and alert records near an area. It does not produce evacuation timing, route advice, or historical
          detector output.
        </p>
      </div>

      <div className="control-strip" role="status" aria-live="polite">
        <span>{areaStatus}</span>
        <strong>
          {bundle ? `${usableCount}/${checkedStates.length} usable sources` : searchStatus === "loading" ? "Waiting for fresh results" : "Search an area to begin"}
        </strong>
      </div>

      {error ? (
        <p className="inline-alert">
          {error}
        </p>
      ) : null}

      <div className="lower-grid">
        <section className="incident-panel" aria-label="Current wildfire incident records">
          <div className="panel-header">
            <div>
              <p className="signal-label">Current incidents</p>
              <h3>Public geospatial records</h3>
            </div>
            <span className="feed-pill">{bundle?.incidents.length ?? 0} records</span>
          </div>
          <div className="incident-list">
            {bundle?.incidents.length ? (
              bundle.incidents.map((incident) => (
                <article className="connector-card" key={incident.id}>
                  <span>{incident.sourceId.toUpperCase()} · {incident.distance}</span>
                  <strong>{incident.name}</strong>
                  <small>{incident.location}</small>
                  <small>Public point: {incident.latitude.toFixed(2)}, {incident.longitude.toFixed(2)}</small>
                </article>
              ))
            ) : (
              <article className="memory-card empty">No current wildfire records loaded. Historical scenarios remain separate below.</article>
            )}
          </div>
        </section>

        <section className="evidence-panel" aria-label="Current source health">
          <div className="panel-header">
            <div>
              <p className="signal-label">Runtime source health</p>
              <h3>What responded to this request</h3>
            </div>
            <span className="feed-pill">{checkedStates.length} checked</span>
          </div>
          <div className="live-source-list">
            {bundle?.sourceStates.map((state) => (
              <article className={`live-source-row status-${state.status}`} key={state.id}>
                <span>{state.status}</span>
                <strong>{state.name}</strong>
                <p>{state.detail}</p>
                <small>{state.count} records</small>
              </article>
            )) ?? <article className="memory-card empty">Source health appears after an area search.</article>}
          </div>
        </section>

        <section className="review-panel" aria-label="Current public alerts">
          <div className="panel-header">
            <div>
              <p className="signal-label">Current alerts</p>
              <h3>Public signal records</h3>
            </div>
            <span className="feed-pill">{bundle?.signals.length ?? 0} signals</span>
          </div>
          <div className="live-signal-strip">
            {bundle?.signals.length ? (
              bundle.signals.slice(0, 6).map((signal) => (
                <a className={`live-signal severity-${signal.severity}`} href={signal.url} target="_blank" rel="noreferrer" key={signal.id}>
                  <span>{signal.source}</span>
                  <strong>{signal.title}</strong>
                  <p>{signal.detail}</p>
                </a>
              ))
            ) : (
              <article className="memory-card empty">No current public alert records loaded.</article>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
