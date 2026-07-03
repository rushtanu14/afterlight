import { useEffect, useMemo, useState } from "react";
import { getAllFailures, incidentOptions, replayEvents } from "./data/replay";
import { Hero } from "./components/Hero";
import { OfflineSection } from "./components/OfflineSection";
import { ReplayWorkspace } from "./components/ReplayWorkspace";
import { defaultHouseholdProfile, replayDecisionSeries } from "./engine/detector";
import { loadLiveIncidentBundle, type LiveIncidentBundle } from "./engine/liveSources";

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
  const [liveBundle, setLiveBundle] = useState<LiveIncidentBundle | null>(null);
  const [liveError, setLiveError] = useState("");

  const activeEvent = replayEvents[activeIndex];
  const decisionSeries = useMemo(() => replayDecisionSeries(replayEvents, defaultHouseholdProfile), []);
  const activeDecision = decisionSeries[activeIndex];
  const rankedIncidents = liveBundle?.incidents.length ? liveBundle.incidents : incidentOptions;
  const selectedIncident = rankedIncidents.find((incident) => incident.id === selectedIncidentId) ?? rankedIncidents[0] ?? incidentOptions[0];
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

  async function handleLocationSearch() {
    const query = locationInput.trim();
    if (!query) return;

    setSearchStatus("loading");
    setLiveError("");

    try {
      const bundle = await loadLiveIncidentBundle(query, {
        firmsMapKey: import.meta.env.VITE_FIRMS_MAP_KEY
      });
      const geocoderError = bundle.sourceStates.find((state) => state.id === "nominatim" && state.status === "error");
      setLiveBundle(bundle);
      setLiveError(geocoderError?.detail ?? "");
      setSelectedIncidentId(bundle.incidents[0]?.id ?? incidentOptions[0]?.id ?? "");
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "Live sources could not be reached.");
      setSelectedIncidentId(incidentOptions[0]?.id ?? "");
    } finally {
      setSearchStatus("ready");
    }
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
        incidentCount={rankedIncidents.length}
        locationInput={locationInput}
        searchStatus={searchStatus}
        liveSourceCount={liveBundle?.sourceStates.length ?? 6}
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
        incidents={rankedIncidents}
        isPlaying={isPlaying}
        liveError={liveError}
        liveLocation={liveBundle?.location ?? null}
        liveSignals={liveBundle?.signals ?? []}
        liveSourceStates={liveBundle?.sourceStates ?? []}
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
