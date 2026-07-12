import type { HistoricalScenario } from "../data/replay";
import type { HistoricalDecision } from "../engine/detector";
import { archiveReferences } from "../data/historicalScenarios";

type EvaluateScenario = (events: HistoricalScenario["events"]) => HistoricalDecision[];

type EvaluationPanelProps = {
  scenarios: HistoricalScenario[];
  evaluate: EvaluateScenario;
};

export type ScenarioEvaluationRow = {
  scenarioId: HistoricalScenario["id"];
  scenarioName: string;
  rowCount: number;
  expectedActionRows: number;
  detectedActionRows: number;
  firstExpectedActionRow: string | null;
  firstDetectedActionRow: string | null;
  attributableRows: number;
};

function isExpectedAction(signal: HistoricalScenario["events"][number]["officialSignal"]) {
  return signal === "evacuation_warning" || signal === "evacuation_order";
}

export function buildEvaluationRows(
  scenarios: HistoricalScenario[],
  evaluate: EvaluateScenario
): ScenarioEvaluationRow[] {
  return scenarios.map((scenario) => {
    const decisions = evaluate(scenario.events);
    const expectedEvents = scenario.events.filter((event) => isExpectedAction(event.officialSignal));
    const detectedIds = new Set(
      decisions.filter((decision) => decision.mode === "official_action").map((decision) => decision.eventId)
    );
    const detectedEvents = scenario.events.filter((event) => detectedIds.has(event.id));
    const attributableRows = scenario.events.filter(
      (event) => event.sourceUrl.startsWith("https://") && event.sourceLabel.length > 0 && event.officialRecord.eventDescription.length > 0
    ).length;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      rowCount: scenario.events.length,
      expectedActionRows: expectedEvents.length,
      detectedActionRows: detectedEvents.length,
      firstExpectedActionRow: expectedEvents[0]?.title ?? null,
      firstDetectedActionRow: detectedEvents[0]?.title ?? null,
      attributableRows
    };
  });
}

export function EvaluationPanel({ scenarios, evaluate }: EvaluationPanelProps) {
  const rows = buildEvaluationRows(scenarios, evaluate);

  return (
    <section className="evaluation-panel" id="evaluation-preview" aria-labelledby="evaluation-title">
      <div className="panel-header">
        <div>
          <p className="signal-label">Multi-fire evaluation</p>
          <h3 id="evaluation-title">Expected versus detected official-action rows</h3>
        </div>
        <span className="feed-pill">Categorical replay check</span>
      </div>
      <p className="evaluation-intro">
        Expected means the stored source row is categorized as an official evacuation warning or order. Detected means the historical detector verified that same attributable row. This is not a model-accuracy or live-incident claim.
      </p>

      <div className="evaluation-table-wrap">
        <table className="evaluation-table">
          <thead>
            <tr>
              <th scope="col">Loaded case</th>
              <th scope="col">Source coverage</th>
              <th scope="col">Action rows</th>
              <th scope="col">First expected</th>
              <th scope="col">First detected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scenarioId}>
                <th scope="row">{row.scenarioName}<span>{row.rowCount} loaded rows</span></th>
                <td>{row.attributableRows}/{row.rowCount} attributable</td>
                <td>{row.expectedActionRows} expected / {row.detectedActionRows} detected</td>
                <td>{row.firstExpectedActionRow ?? "None"}</td>
                <td>{row.firstDetectedActionRow ?? "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {archiveReferences.map((archive) => (
        <article className="negative-control" key={archive.id}>
          <div>
            <span>Archive-only negative control</span>
            <strong>{archive.name} · not scored</strong>
          </div>
          <p>
            Granular replay is blocked because official source rows are not loaded. An incident archive alone is insufficient for expected-versus-detected evaluation.
          </p>
          <a href={archive.sourceUrl} target="_blank" rel="noreferrer">Open incident archive</a>
        </article>
      ))}
    </section>
  );
}
