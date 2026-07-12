import type { HistoricalScenario, HistoricalScenarioId } from "../data/replay";
import type { HistoricalDecision } from "../engine/detector";
import type { JudgePhase } from "../engine/judgeMode";
import type { LiveIncidentBundle } from "../engine/liveSources";
import type { ScenarioMemory } from "../engine/memoryStorage";
import { HistoricalReplay } from "./HistoricalReplay";
import { LiveMonitor } from "./LiveMonitor";

type ReplayWorkspaceProps = {
  activeIndex: number;
  autoPlayDisabled: boolean;
  decisions: HistoricalDecision[];
  isPlaying: boolean;
  judgeMode: boolean;
  judgePhase: JudgePhase | null;
  judgeProgress: number;
  liveBundle: LiveIncidentBundle | null;
  liveError: string;
  submittedQuery: string;
  resultQuery: string;
  memory: ScenarioMemory;
  memoryPersistenceStatus: "idle" | "saved" | "error";
  scenario: HistoricalScenario;
  scenarios: HistoricalScenario[];
  searchStatus: "idle" | "loading" | "ready" | "error";
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

export function ReplayWorkspace(props: ReplayWorkspaceProps) {
  return (
    <>
      <LiveMonitor
        bundle={props.liveBundle}
        error={props.liveError}
        submittedQuery={props.submittedQuery}
        resultQuery={props.resultQuery}
        searchStatus={props.searchStatus}
      />
      <HistoricalReplay
        activeIndex={props.activeIndex}
        autoPlayDisabled={props.autoPlayDisabled}
        decisions={props.decisions}
        isPlaying={props.isPlaying}
        judgeMode={props.judgeMode}
        judgePhase={props.judgePhase}
        judgeProgress={props.judgeProgress}
        memory={props.memory}
        memoryPersistenceStatus={props.memoryPersistenceStatus}
        scenario={props.scenario}
        scenarios={props.scenarios}
        onConfirm={props.onConfirm}
        onClearAllMemory={props.onClearAllMemory}
        onClearScenarioMemory={props.onClearScenarioMemory}
        onEdit={props.onEdit}
        onNext={props.onNext}
        onPrevious={props.onPrevious}
        onRestart={props.onRestart}
        onSelectEvent={props.onSelectEvent}
        onSelectScenario={props.onSelectScenario}
        onTogglePlay={props.onTogglePlay}
      />
    </>
  );
}
