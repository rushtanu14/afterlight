import { useEffect, useMemo, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { OfflineSection } from "./components/OfflineSection";
import { ReplayWorkspace } from "./components/ReplayWorkspace";
import { SafetyBoundary } from "./components/SafetyBoundary";
import { getHistoricalScenario, historicalScenarios } from "./data/historicalScenarios";
import type { HistoricalScenarioId } from "./data/replay";
import { evaluateScenario } from "./engine/detector";
import { getJudgeStep, isJudgeMode, JUDGE_RUN_DURATION_MS, type JudgePhase } from "./engine/judgeMode";
import { loadLiveIncidentBundle, type LiveIncidentBundle } from "./engine/liveSources";
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

const REDUCED_MOTION_JUDGE_STEPS = [0, 7_500, 30_000, 37_500, 41_250, 45_000, 52_500, 75_000, 82_500, 86_250, 90_000];

function browserPrefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function browserJudgeMode() {
  return typeof window !== "undefined" && isJudgeMode(window.location.search);
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
  const [memoryState, setMemoryState] = useState<MemoryState>(loadMemoryState);
  const [memoryPersistenceStatus, setMemoryPersistenceStatus] = useState<MemoryPersistenceStatus>("idle");
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
    if (!judgeRunning || !judgePhase || reducedMotion) return;
    const targetByPhase: Record<JudgePhase, string> = {
      thesis: "#historical-thesis",
      official_rows: "#official-rows",
      memory_output: "#memory",
      evaluation: "#evaluation-preview",
      safety_boundary: "#historical-safety-boundary"
    };
    document.querySelector(targetByPhase[judgePhase])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [judgePhase, judgeRunning, reducedMotion, selectedScenarioId]);

  function commitMemory(nextState: MemoryState) {
    setMemoryState(nextState);
    setMemoryPersistenceStatus(saveMemoryState(nextState) ? "saved" : "error");
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
  }

  function handleEdit(eventId: string, value: string) {
    const current: ScenarioMemory = memoryState.scenarios[selectedScenarioId] ?? EMPTY_SCENARIO_MEMORY;
    commitMemory(
      updateScenarioMemory(memoryState, selectedScenarioId, {
        ...current,
        edits: { ...current.edits, [eventId]: value }
      })
    );
  }

  function handleClearScenarioMemory() {
    commitMemory(clearScenarioMemory(memoryState, selectedScenarioId));
  }

  function handleClearAllMemory() {
    setMemoryState({ ...EMPTY_MEMORY_STATE, scenarios: {} });
    setMemoryPersistenceStatus(clearSavedMemory() ? "saved" : "error");
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
      <OfflineSection />
    </main>
  );
}
