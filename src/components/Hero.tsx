import type { FormEvent } from "react";
import { EmberCanvas } from "./EmberCanvas";

type HeroProps = {
  error: string;
  historicalRowCount: number;
  incidentCount: number;
  liveSourceCount: number;
  locationInput: string;
  searchStatus: "idle" | "loading" | "ready" | "error";
  onLocationChange: (value: string) => void;
  onLocationSearch: () => void;
  onReplayStart: () => void;
};

export function Hero({
  error,
  historicalRowCount,
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

  const searchMessage =
    searchStatus === "loading"
      ? "Checking the named public sources. Previous results are hidden until this request finishes."
      : searchStatus === "error"
        ? error || "The area search could not be completed."
        : searchStatus === "ready"
          ? `${incidentCount} current incident record${incidentCount === 1 ? "" : "s"} loaded.`
          : "No area checked yet.";

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
          <a href="#practice">Drill</a>
        </nav>
      </header>

      <div className="hero-layout" id="top">
        <div className="hero-content">
          <p className="signal-label">Disaster memory engine</p>
          <h1 id="hero-title">Turn past evacuations into a household drill.</h1>
          <p className="hero-copy">
            Assign responsibilities, expose unresolved gaps, and print a practice card grounded in source-backed Palisades and Eaton lessons.
          </p>
          <div className="hero-actions">
            <a className="primary-cta" href="#practice">Build household drill</a>
            <button className="ghost-cta" type="button" onClick={onReplayStart}>Replay a verified case</button>
          </div>
        </div>

        <aside className="search-console" aria-label="Location fire lookup">
          <div className="console-header">
            <span>Location intelligence</span>
            <strong>{searchStatus === "loading" ? "Searching" : searchStatus === "error" ? "Search failed" : `${incidentCount} records`}</strong>
          </div>
          <form onSubmit={handleSubmit} className="location-form">
            <label htmlFor="locationInput">Home base</label>
            <div className="input-row">
              <input
                id="locationInput"
                type="search"
                value={locationInput}
                onChange={(event) => onLocationChange(event.target.value)}
                placeholder="Pacific Palisades, CA"
                autoComplete="off"
                maxLength={100}
                aria-describedby="locationPrivacyHint locationSearchStatus"
                aria-invalid={searchStatus === "error"}
              />
              <button type="submit" disabled={searchStatus === "loading"}>{searchStatus === "loading" ? "Checking" : "Find fires"}</button>
            </div>
            <p id="locationPrivacyHint">
              City, ZIP code, or neighborhood only—not a street address. Afterlight's same-origin proxy sends that coarse area to OpenStreetMap Nominatim; your browser sends the returned regional coordinates to NIFC, NWS, and NASA EONET.
            </p>
            <p id="locationSearchStatus" className={searchStatus === "error" ? "form-status error" : "form-status"} role={searchStatus === "error" ? "alert" : "status"} aria-live={searchStatus === "error" ? "assertive" : "polite"}>
              {searchMessage}
            </p>
            <p>Current incident records are sorted by distance from the matched coarse area. Source timestamps and health are shown separately.</p>
          </form>
          <div className="hero-metrics" aria-label="Active signal summary">
            <span>
              <strong>{historicalRowCount}</strong>
              verified rows
            </span>
            <span>
              <strong>{liveSourceCount}</strong>
              usable sources
            </span>
            <span>
              <strong>2</strong>
              verified cases
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}
