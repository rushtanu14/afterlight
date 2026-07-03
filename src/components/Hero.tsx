import type { FormEvent } from "react";
import { EmberCanvas } from "./EmberCanvas";

type HeroProps = {
  incidentCount: number;
  liveSourceCount: number;
  locationInput: string;
  searchStatus: "idle" | "loading" | "ready";
  onLocationChange: (value: string) => void;
  onLocationSearch: () => void;
  onReplayStart: () => void;
};

export function Hero({
  incidentCount,
  liveSourceCount,
  locationInput,
  searchStatus,
  onLocationChange,
  onLocationSearch,
  onReplayStart
}: HeroProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLocationSearch();
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-image" aria-hidden="true" />
      <EmberCanvas />
      <div className="hero-shade" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Afterlight home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Afterlight</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#replay">Incident</a>
          <a href="#connectors">Sources</a>
          <a href="#memory">Memory</a>
        </nav>
      </header>

      <div className="hero-layout" id="top">
        <div className="hero-content">
          <p className="signal-label">Disaster memory engine</p>
          <h1 id="hero-title">Turn past evacuations into live decisions.</h1>
          <p className="hero-copy">
            Enter a location, load nearby fire records, replay the official signal chain, and convert what failed into a household plan.
          </p>
          <div className="hero-actions">
            <button className="primary-cta" type="button" onClick={onReplayStart}>
              Enter Afterlight
            </button>
            <a className="ghost-cta" href="#connectors">
              View source chain
            </a>
          </div>
        </div>

        <aside className="search-console" aria-label="Location fire lookup">
          <div className="console-header">
            <span>Location intelligence</span>
            <strong>{searchStatus === "loading" ? "Searching" : `${incidentCount} records`}</strong>
          </div>
          <form onSubmit={handleSubmit} className="location-form">
            <label htmlFor="locationInput">Home base</label>
            <div className="input-row">
              <input
                id="locationInput"
                value={locationInput}
                onChange={(event) => onLocationChange(event.target.value)}
                placeholder="Pacific Palisades, CA"
              />
              <button type="submit">{searchStatus === "loading" ? "Checking" : "Find fires"}</button>
            </div>
            <p>Matches are ranked by proximity, official timestamps, map coverage, and incident-review depth.</p>
          </form>
          <div className="hero-metrics" aria-label="Active signal summary">
            <span>
              <strong>5</strong>
              timestamp rows
            </span>
            <span>
              <strong>{liveSourceCount}</strong>
              live sources
            </span>
            <span>
              <strong>30m</strong>
              mobility buffer
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}
