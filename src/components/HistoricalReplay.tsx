import { useState } from "react";
import type { HistoricalScenario, HistoricalScenarioId } from "../data/replay";
import type { HistoricalDecision } from "../engine/detector";
import type { JudgePhase } from "../engine/judgeMode";
import { MAX_MEMORY_EDIT_LENGTH, type ScenarioMemory } from "../engine/memoryStorage";
import { trustedHistoricalSourceUrl } from "../engine/trustedHistoricalSources";
import { evaluateScenario } from "../engine/detector";
import { DestructiveConfirmation } from "./DestructiveConfirmation";
import { EvaluationPanel } from "./EvaluationPanel";
import { HistoricalIncidentMap } from "./HistoricalIncidentMap";
import { SafetyBoundary } from "./SafetyBoundary";

type HistoricalReplayProps = {
  activeIndex: number;
  autoPlayDisabled: boolean;
  decisions: HistoricalDecision[];
  isPlaying: boolean;
  judgeMode: boolean;
  judgePhase: JudgePhase | null;
  judgeProgress: number;
  memory: ScenarioMemory;
  memoryPersistenceStatus: "idle" | "saved" | "error";
  scenario: HistoricalScenario;
  scenarios: HistoricalScenario[];
  onConfirm: (eventId: string, checked: boolean) => void;
  onClearAllMemory: () => void;
  onClearScenarioMemory: () => void;
  onEdit: (eventId: string, value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onRestart: () => void;
  onSelectEvent: (index: number) => void;
  onSelectScenario: (scenarioId: HistoricalScenarioId) => void;
  onTogglePlay: () => void;
};

export function HistoricalReplay({
  activeIndex,
  autoPlayDisabled,
  decisions,
  isPlaying,
  judgeMode,
  judgePhase,
  judgeProgress,
  memory,
  memoryPersistenceStatus,
  scenario,
  scenarios,
  onConfirm,
  onClearAllMemory,
  onClearScenarioMemory,
  onEdit,
  onNext,
  onPrevious,
  onRestart,
  onSelectEvent,
  onSelectScenario,
  onTogglePlay
}: HistoricalReplayProps) {
  const [clearScope, setClearScope] = useState<"case" | "all" | null>(null);
  const activeEvent = scenario.events[activeIndex] ?? scenario.events[0];
  const activeDecision = decisions[activeIndex] ?? decisions[0];
  if (!activeEvent || !activeDecision) return null;

  const confirmedEvents = scenario.events.filter((event) => memory.confirmedIds.includes(event.id));
  const sourceUrl = trustedHistoricalSourceUrl(activeEvent.sourceUrl);
  const memoryEditId = `memory-edit-${activeEvent.id}`;
  const playbackLabel = autoPlayDisabled
    ? judgeMode
      ? "Next judge section"
      : "Autoplay off"
    : isPlaying
      ? "Pause"
      : judgeMode
        ? "Run judge replay"
        : "Play";
  const persistenceMessage =
    judgeMode
      ? "Judge mode is ephemeral; changes do not read or write saved device memory."
      : memoryPersistenceStatus === "saved"
      ? "Latest memory change saved on this device."
      : memoryPersistenceStatus === "error"
        ? "Latest change is visible now but could not be saved in this browser."
        : "No memory change has been saved in this session.";

  return (
    <section className="workspace" id="replay" aria-labelledby="historical-replay-title">
      <div className="workspace-hero" id="historical-thesis">
        <div>
          <p className="signal-label">Historical replay</p>
          <h2 id="historical-replay-title" tabIndex={-1}>Official rows become case-scoped household memory.</h2>
        </div>
        <p>
          Palisades and Eaton use separate verified timelines. Current live-source results never replace these rows or own their route-memory output.
        </p>
      </div>

      <SafetyBoundary />

      <div className="control-strip" aria-label="Historical replay controls">
        <div className="control-left">
          <button className="icon-button" type="button" onClick={onTogglePlay} disabled={autoPlayDisabled && !judgeMode}>
            {playbackLabel}
          </button>
          <button className="icon-button subtle" type="button" onClick={onRestart}>Restart</button>
          <button className="icon-button subtle" type="button" onClick={onPrevious} disabled={activeIndex === 0}>Previous row</button>
          <button className="icon-button subtle" type="button" onClick={onNext} disabled={activeIndex === scenario.events.length - 1}>Next row</button>
        </div>
        <div className="cache-meter">
          <span role="status" aria-live="polite" aria-atomic="true">
            {judgeMode ? `Judge run · ${judgePhase?.replaceAll("_", " ") ?? "paused"}` : "Manual replay"}
          </span>
          {judgeMode ? (
            <strong role="progressbar" aria-label="Judge replay progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={judgeProgress}>
              {judgeProgress}%
            </strong>
          ) : <strong>{activeIndex + 1}/{scenario.events.length}</strong>}
        </div>
      </div>

      <div className="ops-grid">
        <aside className="incident-panel" aria-label="Historical scenarios">
          <div className="panel-header">
            <div>
              <p className="signal-label">Verified cases</p>
              <h3>Select an official-row scenario</h3>
            </div>
          </div>
          <div className="incident-list">
            {scenarios.map((candidate) => (
              <button
                className={`incident-card${candidate.id === scenario.id ? " active" : ""}`}
                type="button"
                key={candidate.id}
                aria-pressed={candidate.id === scenario.id}
                onClick={() => onSelectScenario(candidate.id)}
              >
                <span>{candidate.events.length} official rows</span>
                <strong>{candidate.name}</strong>
                <small>{candidate.region}</small>
              </button>
            ))}
          </div>
          <article className="source-summary">
            <span>{scenario.sourceLabel}</span>
            <p>{scenario.sourceNote}</p>
          </article>
        </aside>

        <section className="map-panel" aria-labelledby="historical-map-title">
          <div className="panel-header map-header">
            <div>
              <p className="signal-label">Case-specific historical source map</p>
              <h3 id="historical-map-title">{scenario.name} · {activeEvent.displayTime}</h3>
            </div>
            <span className="feed-pill">{activeEvent.officialSignal.replaceAll("_", " ")}</span>
          </div>
          <HistoricalIncidentMap scenario={scenario} activePointId={activeEvent.mapPointId} />
        </section>

        <aside className="decision-panel" aria-label="Historical decision trace">
          <div className="panel-header">
            <div>
              <p className="signal-label">Historical action state</p>
              <h3>{activeDecision.mode === "official_action" ? "Official warning or order row." : "Early historical pattern row."}</h3>
            </div>
            <span className="feed-pill">{activeDecision.officialSignal.replaceAll("_", " ")}</span>
          </div>
          <article className="action-card">
            <span>Interpretation</span>
            <p>{activeDecision.triggerSummary}</p>
          </article>
          <div className="rule-trace">
            <span><strong>Primary route row state</strong>{activeDecision.primaryRouteMemory.state.replaceAll("_", " ")}</span>
            <span><strong>Alternate route row state</strong>{activeDecision.alternateRouteMemory.state.replaceAll("_", " ")}</span>
          </div>
          <SafetyBoundary compact id="historical-safety-boundary" />
        </aside>
      </div>

      <div className="lower-grid">
        <section className="timeline-panel" id="official-rows" aria-label="Official historical timeline">
          <div className="panel-header">
            <div>
              <p className="signal-label">Official row chain</p>
              <h3>{scenario.name}</h3>
            </div>
            <span className="feed-pill">{scenario.events.length} rows</span>
          </div>
          <div className="timeline-list">
            {scenario.events.map((event, index) => (
              <button
                className={`event-card${index === activeIndex ? " active" : ""}`}
                type="button"
                key={event.id}
                aria-pressed={index === activeIndex}
                onClick={() => onSelectEvent(index)}
              >
                <span className="event-time">{event.displayTime}</span>
                <span className="event-details">
                  <span className="event-title">{event.title}</span>
                  <span className="event-meta">{event.sourceLabel} · {event.officialSignal.replaceAll("_", " ")}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="evidence-panel" aria-label="Active official source row">
          <div className="panel-header">
            <div>
              <p className="signal-label">Official source row</p>
              <h3>{activeEvent.title}</h3>
            </div>
          </div>
          <article className="engine-proof">
            <span>{activeEvent.officialRecord.sourceDescription}</span>
            <strong>{activeEvent.officialRecord.eventDate} · {activeEvent.officialRecord.eventTime}</strong>
            <p>{activeEvent.sourceText}</p>
          </article>
          <div className="evidence-chain">
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                <span>Attributable source</span>
                <strong>{activeEvent.sourceLabel}</strong>
                <p>Open the official source material for this historical row.</p>
              </a>
            ) : (
              <div className="source-link-unavailable">
                <span>Source link unavailable</span>
                <p>This row is not linked because its URL is outside the curated historical-source registry.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="review-panel" id="memory" aria-label="Case-scoped household memory">
          <div className="panel-header">
            <div>
              <p className="signal-label">Household memory</p>
              <h3>Confirm this case lesson</h3>
            </div>
            <span className="feed-pill">{confirmedEvents.length} saved</span>
          </div>
          <article className="failure-card">
            <label className="memory-confirm-label">
              <input
                type="checkbox"
                checked={memory.confirmedIds.includes(activeEvent.id)}
                onChange={(event) => onConfirm(activeEvent.id, event.target.checked)}
              />
              <span className="failure-copy">
                <span className="failure-title">{activeEvent.failureLesson}</span>
                <span className="failure-description">{activeEvent.futureLesson}</span>
              </span>
            </label>
            <label className="memory-edit-label" htmlFor={memoryEditId}>Edit this historical lesson</label>
            <textarea
              id={memoryEditId}
              aria-describedby="memory-storage-note"
              value={memory.edits[activeEvent.id] ?? activeEvent.futureLesson}
              onChange={(event) => onEdit(activeEvent.id, event.target.value)}
              maxLength={MAX_MEMORY_EDIT_LENGTH}
            />
          </article>
          <p className="memory-storage-note" id="memory-storage-note">
            Confirmed lessons and edits are stored unencrypted in this browser on this device. Obvious exact-address, contact, coordinate, and access-code
            patterns are rejected, but do not enter sensitive personal details here.
          </p>
          <p className={memoryPersistenceStatus === "error" ? "memory-persistence error" : "memory-persistence"} role="status" aria-live="polite">
            {persistenceMessage}
          </p>
          <div className="memory-actions">
            <button className="icon-button subtle" type="button" onClick={() => setClearScope("case")}>Clear this case</button>
            <button className="icon-button subtle" type="button" onClick={() => setClearScope("all")}>Clear all device memory</button>
          </div>
          {clearScope ? (
            <DestructiveConfirmation
              title={clearScope === "all" ? "Clear all Afterlight device memory?" : "Clear this case memory?"}
              description={clearScope === "all"
                ? "This deletes every saved historical lesson and the complete household drill from this browser."
                : `This deletes saved lessons and linked drill assignments for ${scenario.name} from this browser.`}
              cancelLabel="Keep memory"
              confirmLabel={clearScope === "all" ? "Delete all device memory" : "Delete case memory"}
              onCancel={() => setClearScope(null)}
              onConfirm={() => {
                if (clearScope === "all") onClearAllMemory();
                else onClearScenarioMemory();
                setClearScope(null);
              }}
            />
          ) : null}
          <div className="memory-cards">
            {judgePhase === "memory_output" ? (
              <article className="memory-card">
                <h4>Judge preview · not saved</h4>
                <p>{activeEvent.futureLesson}</p>
              </article>
            ) : null}
            {confirmedEvents.length ? confirmedEvents.map((event) => (
              <article className="memory-card" key={event.id}>
                <h4>{event.title}</h4>
                <p>{memory.edits[event.id] ?? event.futureLesson}</p>
              </article>
            )) : <article className="memory-card empty">No lesson is pre-confirmed. Confirm an official row to save a case-scoped memory card.</article>}
          </div>
        </aside>
      </div>

      <EvaluationPanel scenarios={scenarios} evaluate={evaluateScenario} />
    </section>
  );
}
