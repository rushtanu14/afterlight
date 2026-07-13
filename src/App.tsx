import { useEffect, useMemo, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { OfflineSection } from "./components/OfflineSection";
import { PreparednessWorkspace } from "./components/PreparednessWorkspace";
import { ReplayWorkspace } from "./components/ReplayWorkspace";
import { SafetyBoundary } from "./components/SafetyBoundary";
import { getHistoricalScenario, historicalScenarios } from "./data/historicalScenarios";
import type { HistoricalScenarioId } from "./data/replay";
import { evaluateScenario } from "./engine/detector";
import { getJudgeStep, isJudgeMode, JUDGE_RUN_DURATION_MS, type JudgePhase } from "./engine/judgeMode";
import { loadLiveIncidentBundle, type LiveIncidentBundle } from "./engine/liveSources";
import {
  EMPTY_DRILL_STATE,
  buildDrillTasks,
  invalidateDrillPractice,
  reconcileDrillAssignments,
  recordDrillPractice,
  removeDrillAssignments,
  summarizeDrill,
  toggleDrillConstraint,
  updateDrillAssignment,
  type ConstraintId,
  type DrillAssignment,
  type DrillState,
  type HistoricalLessonInput
} from "./engine/drillPlan";
import { clearSavedDrill, loadDrillState, saveDrillState } from "./engine/drillStorage";
import { summarizeSourceHealth } from "./engine/sourceConnectors";
import {
  clearSavedMemory,
  clearScenarioMemory,
  EMPTY_MEMORY_STATE,
  EMPTY_SCENARIO_MEMORY,
  loadMemoryState,
  saveMemoryState,
  updateScenarioMemory,
  type MemoryState,
  type ScenarioMemory
} from "./engine/memoryStorage";

type SearchStatus = "idle" | "loading" | "ready" | "error";
type MemoryPersistenceStatus = "idle" | "saved" | "error";
type DrillPersistenceStatus = "idle" | "saved" | "error";

const REDUCED_MOTION_JUDGE_STEPS = [0, 6_000, 27_000, 33_000, 37_000, 41_000, 45_000, 51_000, 72_000, 78_000, 82_000, 86_000, 90_000];

function browserPrefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function browserJudgeMode() {
  return typeof window !== "undefined" && isJudgeMode(window.location.search);
}

function emptyMemoryState(): MemoryState {
  return { ...EMPTY_MEMORY_STATE, scenarios: {} };
}

function emptyDrillState(): DrillState {
  return { ...EMPTY_DRILL_STATE, constraints: [], assignments: {} };
}

function historicalLessonsFromMemory(memoryState: MemoryState): HistoricalLessonInput[] {
  return historicalScenarios.flatMap((scenario) => {
    const scenarioMemory = memoryState.scenarios[scenario.id];
    if (!scenarioMemory) return [];
    return scenario.events.flatMap((event) => scenarioMemory.confirmedIds.includes(event.id) ? [{
      id: event.id,
      scenarioName: scenario.name,
      eventTitle: event.title,
      lesson: scenarioMemory.edits[event.id] ?? event.futureLesson,
      sourceLabel: event.sourceLabel,
      adapted: Object.prototype.hasOwnProperty.call(scenarioMemory.edits, event.id)
    }] : []);
  });
}

export function App() {
  const [judgeMode] = useState(browserJudgeMode);
  const [reducedMotion, setReducedMotion] = useState(browserPrefersReducedMotion);
  const [selectedScenarioId, setSelectedScenarioId] = useState<HistoricalScenarioId>("palisades-2025");
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualPlaying, setManualPlaying] = useState(false);
  const [judgeRunning, setJudgeRunning] = useState(() => browserJudgeMode() && !browserPrefersReducedMotion());
  const [judgePhase, setJudgePhase] = useState<JudgePhase | null>(() => (browserJudgeMode() ? "thesis" : null));
  const [judgeProgress, setJudgeProgress] = useState(0);
  const [memoryState, setMemoryState] = useState<MemoryState>(() => judgeMode ? emptyMemoryState() : loadMemoryState());
  const [memoryPersistenceStatus, setMemoryPersistenceStatus] = useState<MemoryPersistenceStatus>("idle");
  const [drillState, setDrillState] = useState<DrillState>(() => judgeMode ? emptyDrillState() : loadDrillState());
  const [drillPersistenceStatus, setDrillPersistenceStatus] = useState<DrillPersistenceStatus>("idle");
  const [locationInput, setLocationInput] = useState("Pacific Palisades, CA");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [resultQuery, setResultQuery] = useState("");
  const [liveBundle, setLiveBundle] = useState<LiveIncidentBundle | null>(null);
  const [liveError, setLiveError] = useState("");
  const requestIdRef = useRef(0);
  const judgeStartedAtRef = useRef<number | null>(null);
  const judgeElapsedRef = useRef(0);

  const selectedScenario = useMemo(() => getHistoricalScenario(selectedScenarioId), [selectedScenarioId]);
  const decisions = useMemo(() => evaluateScenario(selectedScenario.events), [selectedScenario]);
  const scenarioMemory = memoryState.scenarios[selectedScenarioId] ?? EMPTY_SCENARIO_MEMORY;
  const historicalRowCount = historicalScenarios.reduce((total, scenario) => total + scenario.events.length, 0);
  const usableLiveSourceCount = liveBundle ? summarizeSourceHealth(liveBundle.sourceStates).usable : 0;
  const historicalLessons = useMemo<HistoricalLessonInput[]>(() => historicalLessonsFromMemory(memoryState), [memoryState]);

  useEffect(() => {
    if (judgeMode) return;
    const currentTaskIds = buildDrillTasks(drillState, historicalLessons).map((task) => task.id);
    const reconciled = reconcileDrillAssignments(drillState, currentTaskIds);
    if (reconciled !== drillState) commitDrill(reconciled);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setReducedMotion(media.matches);
      if (media.matches) {
        setJudgeRunning(false);
        setManualPlaying(false);
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!manualPlaying || judgeRunning) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        if (currentIndex >= selectedScenario.events.length - 1) {
          setManualPlaying(false);
          return currentIndex;
        }
        return currentIndex + 1;
      });
    }, 2_400);
    return () => window.clearInterval(timer);
  }, [judgeRunning, manualPlaying, selectedScenario.events.length]);

  useEffect(() => {
    if (!judgeRunning) return undefined;
    if (judgeStartedAtRef.current === null) judgeStartedAtRef.current = Date.now() - judgeElapsedRef.current;

    const updateJudgeRun = () => {
      const elapsedMs = Date.now() - (judgeStartedAtRef.current ?? Date.now());
      judgeElapsedRef.current = elapsedMs;
      const step = getJudgeStep(elapsedMs);

      if (!step) {
        const eaton = getHistoricalScenario("eaton-2025");
        setSelectedScenarioId("eaton-2025");
        setActiveIndex(Math.max(0, eaton.events.length - 1));
        setJudgePhase("safety_boundary");
        setJudgeProgress(100);
        setJudgeRunning(false);
        return;
      }

      setSelectedScenarioId(step.scenarioId);
      setActiveIndex(step.eventIndex);
      setJudgePhase(step.phase);
      setJudgeProgress(step.progressPercent);
    };

    updateJudgeRun();
    const timer = window.setInterval(updateJudgeRun, 250);
    return () => window.clearInterval(timer);
  }, [judgeRunning]);

  useEffect(() => {
    if (!judgeMode || !judgePhase) return;
    const targetByPhase: Record<JudgePhase, string> = {
      thesis: "#historical-thesis",
      official_rows: "#official-rows",
      memory_output: "#memory",
      evaluation: "#evaluation-preview",
      drill_output: "#practice",
      safety_boundary: "#historical-safety-boundary"
    };
    document.querySelector(targetByPhase[judgePhase])?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [judgeMode, judgePhase, reducedMotion, selectedScenarioId]);

  function commitMemory(nextState: MemoryState) {
    setMemoryState(nextState);
    if (judgeMode) {
      setMemoryPersistenceStatus("idle");
      return;
    }
    setMemoryPersistenceStatus(saveMemoryState(nextState) ? "saved" : "error");
  }

  function commitDrill(nextState: DrillState) {
    setDrillState(nextState);
    if (judgeMode) {
      setDrillPersistenceStatus("idle");
      return;
    }
    setDrillPersistenceStatus(saveDrillState(nextState) ? "saved" : "error");
  }

  function finishJudgeRun() {
    const eaton = getHistoricalScenario("eaton-2025");
    judgeElapsedRef.current = JUDGE_RUN_DURATION_MS;
    judgeStartedAtRef.current = null;
    setSelectedScenarioId("eaton-2025");
    setActiveIndex(Math.max(0, eaton.events.length - 1));
    setJudgePhase("safety_boundary");
    setJudgeProgress(100);
    setJudgeRunning(false);
  }

  function applyJudgeStep(elapsedMs: number) {
    const step = getJudgeStep(elapsedMs);
    if (!step) {
      finishJudgeRun();
      return;
    }
    judgeElapsedRef.current = elapsedMs;
    setSelectedScenarioId(step.scenarioId);
    setActiveIndex(step.eventIndex);
    setJudgePhase(step.phase);
    setJudgeProgress(step.progressPercent);
  }

  function stopPlayback() {
    setManualPlaying(false);
    setJudgeRunning(false);
  }

  function resetJudgeRun(start: boolean) {
    judgeElapsedRef.current = 0;
    judgeStartedAtRef.current = start ? Date.now() : null;
    setSelectedScenarioId("palisades-2025");
    setActiveIndex(0);
    setJudgePhase("thesis");
    setJudgeProgress(0);
    setManualPlaying(false);
    setJudgeRunning(start);
  }

  function handleReplayStart() {
    document.querySelector("#replay")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#historical-replay-title")?.focus({ preventScroll: true });
    });
    if (judgeMode) {
      resetJudgeRun(!reducedMotion);
      return;
    }

    setActiveIndex(0);
    setManualPlaying(!reducedMotion);
  }

  async function handleLocationSearch() {
    const query = locationInput.trim();
    if (!query) {
      setLiveBundle(null);
      setResultQuery("");
      setLiveError("Enter a city, ZIP code, or neighborhood.");
      setSearchStatus("error");
      return;
    }

    const requestId = ++requestIdRef.current;
    setSubmittedQuery(query);
    setResultQuery("");
    setLiveBundle(null);
    setSearchStatus("loading");
    setLiveError("");

    try {
      const bundle = await loadLiveIncidentBundle(query);
      if (requestId !== requestIdRef.current) return;
      const geocoderError = bundle.sourceStates.find((state) => state.id === "nominatim" && state.status === "error");
      setLiveBundle(bundle);
      setLiveError(geocoderError?.detail ?? "");
      setResultQuery(bundle.location?.label ?? "");
      setSearchStatus(geocoderError ? "error" : "ready");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLiveBundle(null);
      setResultQuery("");
      setLiveError("Current public sources could not be reached.");
      setSearchStatus("error");
    }
  }

  function handleSelectScenario(scenarioId: HistoricalScenarioId) {
    stopPlayback();
    judgeElapsedRef.current = 0;
    judgeStartedAtRef.current = null;
    setJudgePhase(judgeMode ? "official_rows" : null);
    setJudgeProgress(0);
    setSelectedScenarioId(scenarioId);
    setActiveIndex(0);
  }

  function handleSelectEvent(index: number) {
    stopPlayback();
    setJudgePhase(judgeMode ? "official_rows" : null);
    setActiveIndex(index);
  }

  function handleTogglePlay() {
    if (reducedMotion) {
      if (!judgeMode) return;
      const nextElapsed = REDUCED_MOTION_JUDGE_STEPS.find((elapsedMs) => elapsedMs > judgeElapsedRef.current);
      applyJudgeStep(nextElapsed ?? JUDGE_RUN_DURATION_MS);
      return;
    }

    if (judgeMode) {
      if (judgeRunning) {
        setJudgeRunning(false);
        return;
      }
      if (judgeElapsedRef.current >= JUDGE_RUN_DURATION_MS) resetJudgeRun(true);
      else {
        judgeStartedAtRef.current = Date.now() - judgeElapsedRef.current;
        setJudgeRunning(true);
      }
      return;
    }

    if (!manualPlaying && activeIndex >= selectedScenario.events.length - 1) setActiveIndex(0);
    setManualPlaying((playing) => !playing);
  }

  function handleRestart() {
    if (judgeMode) {
      resetJudgeRun(!reducedMotion);
      return;
    }
    setManualPlaying(false);
    setActiveIndex(0);
  }

  function handlePrevious() {
    stopPlayback();
    setActiveIndex((index) => Math.max(0, index - 1));
  }

  function handleNext() {
    stopPlayback();
    setActiveIndex((index) => Math.min(selectedScenario.events.length - 1, index + 1));
  }

  function handleConfirm(eventId: string, checked: boolean) {
    const current = memoryState.scenarios[selectedScenarioId] ?? EMPTY_SCENARIO_MEMORY;
    const confirmedIds = checked
      ? Array.from(new Set([...current.confirmedIds, eventId]))
      : current.confirmedIds.filter((id) => id !== eventId);
    commitMemory(updateScenarioMemory(memoryState, selectedScenarioId, { ...current, confirmedIds }));
    const nextDrillState = checked
      ? invalidateDrillPractice(drillState)
      : removeDrillAssignments(drillState, [`lesson:${eventId}`]);
    if (nextDrillState !== drillState) commitDrill(nextDrillState);
  }

  function handleEdit(eventId: string, value: string) {
    const current: ScenarioMemory = memoryState.scenarios[selectedScenarioId] ?? EMPTY_SCENARIO_MEMORY;
    commitMemory(
      updateScenarioMemory(memoryState, selectedScenarioId, {
        ...current,
        edits: { ...current.edits, [eventId]: value }
      })
    );
    if (current.confirmedIds.includes(eventId)) {
      const nextDrillState = invalidateDrillPractice(drillState, [`lesson:${eventId}`]);
      if (nextDrillState !== drillState) commitDrill(nextDrillState);
    }
  }

  function handleClearScenarioMemory() {
    const current = memoryState.scenarios[selectedScenarioId] ?? EMPTY_SCENARIO_MEMORY;
    const scenarioTaskIds = selectedScenario.events.map((event) => `lesson:${event.id}`);
    const hasStoredScenarioAssignment = scenarioTaskIds.some((taskId) =>
      Object.prototype.hasOwnProperty.call(drillState.assignments, taskId)
    );
    commitMemory(clearScenarioMemory(memoryState, selectedScenarioId));
    if (current.confirmedIds.length > 0 || hasStoredScenarioAssignment) {
      const nextDrillState = removeDrillAssignments(drillState, scenarioTaskIds);
      if (nextDrillState !== drillState) commitDrill(nextDrillState);
    }
  }

  function handleClearAllMemory() {
    setMemoryState(emptyMemoryState());
    setDrillState(emptyDrillState());
    if (judgeMode) {
      setMemoryPersistenceStatus("idle");
      setDrillPersistenceStatus("idle");
      return;
    }
    const memoryCleared = clearSavedMemory();
    const drillCleared = clearSavedDrill();
    setMemoryPersistenceStatus(memoryCleared ? "saved" : "error");
    setDrillPersistenceStatus(drillCleared ? "saved" : "error");
  }

  function handleToggleDrillConstraint(constraintId: ConstraintId, selected: boolean) {
    commitDrill(toggleDrillConstraint(drillState, constraintId, selected));
  }

  function handleUpdateDrillAssignment(taskId: string, update: Partial<DrillAssignment>) {
    commitDrill(updateDrillAssignment(drillState, taskId, update));
  }

  function handleRecordDrillPractice() {
    const tasks = buildDrillTasks(drillState, historicalLessons);
    if (summarizeDrill(tasks, drillState).practiced === 0) return;
    const today = new Date();
    const date = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
    commitDrill(recordDrillPractice(drillState, date));
  }

  function handleClearDrill() {
    setDrillState(emptyDrillState());
    if (judgeMode) {
      setDrillPersistenceStatus("idle");
      return;
    }
    setDrillPersistenceStatus(clearSavedDrill() ? "saved" : "error");
  }

  return (
    <main>
      <Hero
        historicalRowCount={historicalRowCount}
        incidentCount={liveBundle?.incidents.length ?? 0}
        error={liveError}
        locationInput={locationInput}
        searchStatus={searchStatus}
        liveSourceCount={usableLiveSourceCount}
        onLocationChange={setLocationInput}
        onLocationSearch={handleLocationSearch}
        onReplayStart={handleReplayStart}
      />
      <SafetyBoundary />
      <ReplayWorkspace
        activeIndex={activeIndex}
        autoPlayDisabled={reducedMotion}
        decisions={decisions}
        isPlaying={judgeRunning || manualPlaying}
        judgeMode={judgeMode}
        judgePhase={judgePhase}
        judgeProgress={judgeProgress}
        liveBundle={liveBundle}
        liveError={liveError}
        submittedQuery={submittedQuery}
        resultQuery={resultQuery}
        memory={scenarioMemory}
        memoryPersistenceStatus={memoryPersistenceStatus}
        scenario={selectedScenario}
        scenarios={historicalScenarios}
        searchStatus={searchStatus}
        onConfirm={handleConfirm}
        onClearAllMemory={handleClearAllMemory}
        onClearScenarioMemory={handleClearScenarioMemory}
        onEdit={handleEdit}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onRestart={handleRestart}
        onSelectEvent={handleSelectEvent}
        onSelectScenario={handleSelectScenario}
        onTogglePlay={handleTogglePlay}
      />
      <PreparednessWorkspace
        state={drillState}
        historicalLessons={historicalLessons}
        ephemeral={judgeMode}
        judgePreview={judgePhase === "drill_output"}
        persistenceStatus={drillPersistenceStatus}
        onClear={handleClearDrill}
        onPrint={() => window.print()}
        onRecordPractice={handleRecordDrillPractice}
        onToggleConstraint={handleToggleDrillConstraint}
        onUpdateAssignment={handleUpdateDrillAssignment}
      />
      <OfflineSection />
    </main>
  );
}
