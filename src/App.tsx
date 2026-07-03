import { useEffect, useMemo, useState } from "react";
import { getAllFailures, incidentOptions, replayEvents } from "./data/replay";
import { Hero } from "./components/Hero";
import { OfflineSection } from "./components/OfflineSection";
import { ReplayWorkspace } from "./components/ReplayWorkspace";
import { defaultHouseholdProfile, replayDecisionSeries } from "./engine/detector";

const firstFailureId = replayEvents[0]?.failures[0]?.id ?? "";

export function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmedFailures, setConfirmedFailures] = useState<Set<string>>(() => new Set(firstFailureId ? [firstFailureId] : []));
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1700);
  const [locationInput, setLocationInput] = useState("Pacific Palisades, CA");
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "ready">("ready");
  const [selectedIncidentId, setSelectedIncidentId] = useState(incidentOptions[0]?.id ?? "");

  const activeEvent = replayEvents[activeIndex];
  const decisionSeries = useMemo(() => replayDecisionSeries(replayEvents, defaultHouseholdProfile), []);
  const activeDecision = decisionSeries[activeIndex];
  const selectedIncident = incidentOptions.find((incident) => incident.id === selectedIncidentId) ?? incidentOptions[0];
  const allFailures = useMemo(() => getAllFailures(), []);
  const memoryCards = useMemo(() => allFailures.filter((failure) => confirmedFailures.has(failure.id)), [allFailures, confirmedFailures]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        if (currentIndex >= replayEvents.length - 1) {
          window.clearInterval(timer);
          setIsPlaying(false);
          return currentIndex;
        }
        return currentIndex + 1;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [isPlaying, speed]);

  function handleReplayStart() {
    setSearchStatus("ready");
    document.querySelector("#replay")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsPlaying(true);
  }

  function handleLocationSearch() {
    setSearchStatus("loading");
    window.setTimeout(() => {
      setSearchStatus("ready");
      setSelectedIncidentId(incidentOptions[0]?.id ?? "");
    }, 520);
  }

  function handleSelectEvent(index: number) {
    setIsPlaying(false);
    setActiveIndex(index);
  }

  function handleRestart() {
    setIsPlaying(false);
    setActiveIndex(0);
  }

  function handleConfirmFailure(id: string, checked: boolean) {
    setConfirmedFailures((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleEditFailure(id: string, value: string) {
    setEdits((current) => ({ ...current, [id]: value.trim() }));
  }

  return (
    <main>
      <Hero
        incidentCount={incidentOptions.length}
        locationInput={locationInput}
        searchStatus={searchStatus}
        onLocationChange={setLocationInput}
        onLocationSearch={handleLocationSearch}
        onReplayStart={handleReplayStart}
      />
      <ReplayWorkspace
        activeDecision={activeDecision}
        activeEvent={activeEvent}
        activeIndex={activeIndex}
        confirmedFailures={confirmedFailures}
        edits={edits}
        events={replayEvents}
        decisionSeries={decisionSeries}
        incidents={incidentOptions}
        isPlaying={isPlaying}
        locationInput={locationInput}
        memoryCards={memoryCards}
        searchStatus={searchStatus}
        selectedIncident={selectedIncident}
        selectedIncidentId={selectedIncidentId}
        speed={speed}
        onConfirmFailure={handleConfirmFailure}
        onEditFailure={handleEditFailure}
        onRestart={handleRestart}
        onSelectEvent={handleSelectEvent}
        onSelectIncident={setSelectedIncidentId}
        onSpeedChange={setSpeed}
        onTogglePlay={() => setIsPlaying((playing) => !playing)}
      />
      <OfflineSection />
    </main>
  );
}
