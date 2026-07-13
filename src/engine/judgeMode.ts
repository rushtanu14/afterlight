import { historicalScenarios } from "../data/historicalScenarios";
import type { HistoricalScenario, HistoricalScenarioId } from "../data/replay";

export type JudgePhase = "thesis" | "official_rows" | "memory_output" | "evaluation" | "drill_output" | "safety_boundary";

export type JudgeStep = {
  scenarioId: HistoricalScenarioId;
  phase: JudgePhase;
  eventIndex: number;
  elapsedMs: number;
  progressPercent: number;
};

export const JUDGE_RUN_DURATION_MS = 90_000;
const SCENARIO_DURATION_MS = JUDGE_RUN_DURATION_MS / 2;
const THESIS_END_MS = 6_000;
const OFFICIAL_ROWS_END_MS = 27_000;
const MEMORY_OUTPUT_END_MS = 33_000;
const EVALUATION_END_MS = 37_000;
const DRILL_OUTPUT_END_MS = 41_000;

function scenarioAt(index: number) {
  const scenario = historicalScenarios[index];
  if (!scenario) throw new Error(`Missing judge scenario at index ${index}.`);
  return scenario;
}

function officialActionIndex(scenario: HistoricalScenario) {
  const index = scenario.events.findIndex(
    (event) => event.officialSignal === "evacuation_warning" || event.officialSignal === "evacuation_order"
  );
  return index >= 0 ? index : Math.max(0, scenario.events.length - 1);
}

function eventIndexForPhase(scenario: HistoricalScenario, phase: JudgePhase, scenarioElapsedMs: number) {
  const lastIndex = Math.max(0, scenario.events.length - 1);
  if (phase === "thesis") return 0;
  if (phase === "official_rows") {
    const phaseProgress = (scenarioElapsedMs - THESIS_END_MS) / (OFFICIAL_ROWS_END_MS - THESIS_END_MS);
    return Math.min(lastIndex, Math.floor(phaseProgress * scenario.events.length));
  }
  if (phase === "memory_output") return officialActionIndex(scenario);
  return lastIndex;
}

export function getJudgeStep(elapsedMs: number): JudgeStep | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= JUDGE_RUN_DURATION_MS) return null;

  const scenarioIndex = elapsedMs < SCENARIO_DURATION_MS ? 0 : 1;
  const scenario = scenarioAt(scenarioIndex);
  const scenarioElapsedMs = elapsedMs - scenarioIndex * SCENARIO_DURATION_MS;
  const phase: JudgePhase =
    scenarioElapsedMs < THESIS_END_MS
      ? "thesis"
      : scenarioElapsedMs < OFFICIAL_ROWS_END_MS
        ? "official_rows"
        : scenarioElapsedMs < MEMORY_OUTPUT_END_MS
          ? "memory_output"
          : scenarioElapsedMs < EVALUATION_END_MS
            ? "evaluation"
            : scenarioElapsedMs < DRILL_OUTPUT_END_MS
              ? "drill_output"
              : "safety_boundary";

  return {
    scenarioId: scenario.id,
    phase,
    eventIndex: eventIndexForPhase(scenario, phase, scenarioElapsedMs),
    elapsedMs,
    progressPercent: Math.min(100, Math.floor((elapsedMs / JUDGE_RUN_DURATION_MS) * 100))
  };
}

export function isJudgeMode(search: string) {
  return new URLSearchParams(search).get("judge") === "1";
}
