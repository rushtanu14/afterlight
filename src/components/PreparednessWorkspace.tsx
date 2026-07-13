import { useState } from "react";
import {
  CONSTRAINT_OPTIONS,
  buildDrillTasks,
  isDrillAssignmentComplete,
  sanitizeRoleLabel,
  summarizeDrill,
  type ConstraintId,
  type DrillAssignment,
  type DrillState,
  type HistoricalLessonInput
} from "../engine/drillPlan";
import { DestructiveConfirmation } from "./DestructiveConfirmation";

type PreparednessWorkspaceProps = {
  state: DrillState;
  historicalLessons: HistoricalLessonInput[];
  ephemeral: boolean;
  judgePreview: boolean;
  persistenceStatus: "idle" | "saved" | "error";
  onClear: () => void;
  onPrint: () => void;
  onRecordPractice: () => void;
  onToggleConstraint: (constraintId: ConstraintId, selected: boolean) => void;
  onUpdateAssignment: (taskId: string, update: Partial<DrillAssignment>) => void;
};

export function PreparednessWorkspace({
  state,
  historicalLessons,
  ephemeral,
  judgePreview,
  persistenceStatus,
  onClear,
  onPrint,
  onRecordPractice,
  onToggleConstraint,
  onUpdateAssignment
}: PreparednessWorkspaceProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const tasks = buildDrillTasks(state, historicalLessons);
  const summary = summarizeDrill(tasks, state);
  const previewAssignments: DrillState["assignments"] = {
    "base:official-sources": {
      ownerRole: "Alert checker",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    },
    "base:contact-fallback": {
      ownerRole: "Check-in lead",
      backupRole: "Out-of-area contact",
      actionNote: "Group message plus out-of-area check-in",
      practiced: true
    },
    "base:kit-location": {
      ownerRole: "Supply checker",
      backupRole: "Backup adult",
      actionNote: "Visible indoor kit plus seasonal check",
      practiced: false
    }
  };
  const cardState = judgePreview ? { ...state, assignments: { ...state.assignments, ...previewAssignments } } : state;
  const cardSummary = summarizeDrill(tasks, cardState);
  const practiceMessage = state.lastPracticedOn
    ? `Practice recorded ${state.lastPracticedOn} · ${summary.unassigned} unresolved task${summary.unassigned === 1 ? "" : "s"}.`
    : `No household practice date recorded · ${summary.unassigned} unresolved task${summary.unassigned === 1 ? "" : "s"}.`;
  const persistenceMessage = ephemeral
    ? " Judge mode is ephemeral; changes do not read or write saved device data."
    : persistenceStatus === "error"
      ? " The latest change is visible but could not be saved in this browser."
      : persistenceStatus === "saved"
        ? " Saved on this device."
        : "";

  return (
    <section className="preparedness-workspace" id="practice" aria-labelledby="practice-title">
      <div className="practice-heading">
        <div>
          <p className="signal-label">Household drill builder</p>
          <h2 id="practice-title">Build the drill your household can actually practice.</h2>
        </div>
        <p>
          Turn non-sensitive household constraints and confirmed historical lessons into assigned practice. This creates a drill artifact, not an
          evacuation plan or safety certification.
        </p>
      </div>

      <div className="practice-boundary" role="note" aria-label="Preparedness drill boundary">
        <strong>Before an incident only.</strong>
        <span>During an active fire, stop using this card for decisions and follow current local authorities and official alerts.</span>
      </div>

      <nav className="preparedness-references" aria-label="Official preparedness references">
        <span>Use alongside official preparation guidance</span>
        <a href="https://plan.readyforwildfire.org/" target="_blank" rel="noreferrer">CAL FIRE firePLANNER</a>
        <a href="https://www.ready.gov/plan" target="_blank" rel="noreferrer">Ready.gov Make a Plan</a>
        <a
          href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html"
          target="_blank"
          rel="noreferrer"
        >
          Red Cross wildfire preparedness
        </a>
      </nav>

      <div className="drill-layout">
        <aside className="drill-setup" aria-label="Household drill setup">
          <div className="drill-section-heading">
            <span>01</span>
            <div>
              <p className="signal-label">Non-sensitive constraints</p>
              <h3>Add only what changes the practice.</h3>
            </div>
          </div>
          <fieldset className="constraint-list">
            <legend>Select household constraints</legend>
            {CONSTRAINT_OPTIONS.map((constraint) => (
              <label key={constraint.id}>
                <input
                  type="checkbox"
                  checked={state.constraints.includes(constraint.id)}
                  onChange={(event) => onToggleConstraint(constraint.id, event.target.checked)}
                />
                <span>
                  <strong>{constraint.label}</strong>
                  <small>{constraint.description}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="drill-evidence-count">
            <strong>{summary.historicalLessons}</strong>
            <span>evidence-linked historical lesson{summary.historicalLessons === 1 ? "" : "s"} carried into this drill</span>
            {summary.historicalLessons === 0 ? <a href="#memory">Confirm an attributable lesson in the historical replay.</a> : null}
          </div>

        </aside>

        <div className="drill-workbench">
          <section className="drill-task-panel" aria-labelledby="drill-task-title">
            <div className="drill-section-heading">
              <span>02</span>
              <div>
                <p className="signal-label">Assignment ledger</p>
                <h3 id="drill-task-title">Name the owner, backup, and practiced handoff.</h3>
              </div>
            </div>
            <div className="drill-task-list">
              {tasks.map((task, index) => {
                const assignment = state.assignments[task.id] ?? { ownerRole: "", backupRole: "", actionNote: "", practiced: false };
                const assignmentComplete = isDrillAssignmentComplete(assignment);
                return (
                  <article className="drill-task" key={task.id}>
                    <div className="drill-task-copy">
                      <span>{String(index + 1).padStart(2, "0")} · {task.sourceLabel}</span>
                      <h3>{task.title}</h3>
                      <p>{task.detail}</p>
                    </div>
                    <div className="drill-assignment-grid">
                      <label>
                        Primary owner role
                        <input
                          type="text"
                          aria-label={`Primary owner role for ${task.title}`}
                          value={assignment.ownerRole}
                          onChange={(event) => onUpdateAssignment(task.id, { ownerRole: event.target.value })}
                          onBlur={(event) => onUpdateAssignment(task.id, { ownerRole: sanitizeRoleLabel(event.target.value) })}
                          maxLength={48}
                          placeholder="Example: Alert checker"
                          autoComplete="off"
                        />
                      </label>
                      <label>
                        Backup owner role
                        <input
                          type="text"
                          aria-label={`Backup owner role for ${task.title}`}
                          value={assignment.backupRole}
                          onChange={(event) => onUpdateAssignment(task.id, { backupRole: event.target.value })}
                          onBlur={(event) => onUpdateAssignment(task.id, { backupRole: sanitizeRoleLabel(event.target.value) })}
                          maxLength={48}
                          placeholder="Example: Neighbor contact"
                          autoComplete="off"
                        />
                      </label>
                      <label className="drill-action-note">
                        Coarse household drill decision
                        <small>{task.actionPrompt}</small>
                        <select
                          aria-label={`Household decision for ${task.title}`}
                          value={assignment.actionNote}
                          onChange={(event) => onUpdateAssignment(task.id, { actionNote: event.target.value })}
                        >
                          <option value="">Choose a coarse pattern</option>
                          {task.actionOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                        </select>
                      </label>
                      <label className="drill-practiced-check">
                        <input
                          type="checkbox"
                          aria-label={`Mark ${task.title} as practiced`}
                          checked={assignment.practiced}
                          disabled={!assignmentComplete}
                          onChange={(event) => onUpdateAssignment(task.id, { practiced: event.target.checked })}
                        />
                        <span>{assignmentComplete ? "Handoff practiced" : "Complete the decision, primary, and backup first"}</span>
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className={`practice-card${judgePreview ? " judge-preview-card" : ""}`} aria-label="Printable household practice card">
            <div className="practice-card-kicker">Practice card · not emergency guidance</div>
            {judgePreview ? <div className="practice-card-preview">Judge preview · not saved</div> : null}
            <div className="practice-card-header">
              <div>
                <span>Afterlight household drill</span>
                <h3>{state.lastPracticedOn ? `Practiced ${state.lastPracticedOn}` : "Practice date not recorded"}</h3>
              </div>
              <strong>{cardSummary.unassigned} unresolved</strong>
            </div>
            <dl className="practice-card-summary">
              <div><dt>Tasks</dt><dd>{cardSummary.total}</dd></div>
              <div><dt>Assigned</dt><dd>{cardSummary.assigned}</dd></div>
              <div><dt>Practiced</dt><dd>{cardSummary.practiced}</dd></div>
              <div><dt>Evidence-linked lessons</dt><dd>{cardSummary.historicalLessons}</dd></div>
            </dl>
            <div className="practice-card-rows">
              {tasks.map((task) => {
                const assignment = cardState.assignments[task.id];
                const assignmentComplete = isDrillAssignmentComplete(assignment);
                return (
                  <div key={task.id}>
                    <span>{assignment?.practiced ? "Practiced" : assignmentComplete ? "Assigned" : "Unresolved"}</span>
                    <strong>{task.title}</strong>
                    <small>Structured decision: {assignment?.actionNote.trim() || "Unresolved"}</small>
                    <small>Primary: {assignment?.ownerRole.trim() || "Unassigned"} · Backup: {assignment?.backupRole.trim() || "Unassigned"}</small>
                  </div>
                );
              })}
            </div>
            <p>
              Practice before an incident. This card does not provide current routes, leave times, hazard predictions, or official alerts. During an
              emergency, follow current local authorities.
            </p>
          </aside>
        </div>

        <aside className="drill-control-panel" aria-label="Drill actions and storage status">
          <p className="drill-record-hint" id="drillRecordHint">
            {summary.practiced > 0
              ? `${summary.practiced} complete handoff${summary.practiced === 1 ? "" : "s"} can be recorded.`
              : "Complete and practice at least one handoff before recording a date."}
          </p>
          <div className="drill-actions">
            <button
              className="primary-cta"
              type="button"
              onClick={onRecordPractice}
              disabled={summary.practiced === 0}
              aria-describedby="drillRecordHint"
            >
              Record practice today
            </button>
            <button className="icon-button" type="button" onClick={onPrint} disabled={judgePreview}>
              {judgePreview ? "Preview cannot be printed" : "Print practice card"}
            </button>
            <button className="icon-button subtle" type="button" onClick={() => setConfirmingClear(true)}>Clear drill data</button>
          </div>
          {confirmingClear ? (
            <DestructiveConfirmation
              title="Clear household drill?"
              description="This deletes this device's constraints, decisions, roles, handoffs, and practice date. Historical source rows stay intact."
              cancelLabel="Keep drill"
              confirmLabel="Delete drill data"
              onCancel={() => setConfirmingClear(false)}
              onConfirm={() => {
                setConfirmingClear(false);
                onClear();
              }}
            />
          ) : null}
          <p className="drill-persistence" role="status" aria-live="polite">
            {practiceMessage}{persistenceMessage}
          </p>
          <p className="drill-privacy-note">
            Stored unencrypted in this browser. Decisions are limited to structured coarse patterns; keep names, contacts, routes, exact locations,
            access codes, and medical details in an official household plan instead.
          </p>
        </aside>
      </div>
    </section>
  );
}
