import { describe, expect, test } from "vitest";
import { getHistoricalScenario } from "../src/data/historicalScenarios";
import { evaluateHistoricalEvent, evaluateScenario } from "../src/engine/detector";

const palisades = getHistoricalScenario("palisades-2025");
const eaton = getHistoricalScenario("eaton-2025");

describe("historical decision safety gate", () => {
  test("never emits an official action without a warning or order row", () => {
    const decision = evaluateHistoricalEvent({ ...palisades.events[3], officialSignal: "awareness_alert" });

    expect(decision.mode).toBe("prepare");
    expect(decision.triggerSummary).toContain("not an evacuation instruction");
  });

  test("uses official warning and order rows as the historical action gate", () => {
    expect(evaluateHistoricalEvent(palisades.events[3]).mode).toBe("official_action");
    expect(evaluateHistoricalEvent(palisades.events[4]).mode).toBe("official_action");
    expect(evaluateHistoricalEvent(eaton.events[4]).mode).toBe("official_action");
    expect(evaluateHistoricalEvent(eaton.events[5]).mode).toBe("official_action");
  });

  test("fails closed when warning attribution is unrecognized or not HTTPS", () => {
    const warning = palisades.events[3];

    expect(evaluateHistoricalEvent({ ...warning, sourceUrl: "https://example.com/spoof" }).mode).toBe("prepare");
    expect(evaluateHistoricalEvent({ ...warning, sourceUrl: warning.sourceUrl.replace("https://", "http://") }).mode).toBe("prepare");
    expect(evaluateHistoricalEvent({ ...warning, sourceLabel: "Unverified mirror" }).mode).toBe("prepare");
  });

  test("fails closed when official timestamp or source text does not match the record", () => {
    const warning = palisades.events[3];

    expect(evaluateHistoricalEvent({ ...warning, timestamp: "2025-01-07T11:18:00-08:00" }).mode).toBe("prepare");
    expect(evaluateHistoricalEvent({ ...warning, displayTime: "11:18 AM" }).mode).toBe("prepare");
    expect(evaluateHistoricalEvent({ ...warning, sourceText: "Evacuation warning" }).mode).toBe("prepare");
    expect(
      evaluateHistoricalEvent({
        ...warning,
        officialRecord: { ...warning.officialRecord, eventDescription: "" }
      }).mode
    ).toBe("prepare");
  });

  test("fails closed when the record text does not support the claimed warning category", () => {
    const awareness = eaton.events[2];
    const spoofedWarning = { ...awareness, officialSignal: "evacuation_warning" as const };

    expect(evaluateHistoricalEvent(spoofedWarning).mode).toBe("prepare");
  });

  test("does not treat a road-closure row as an evacuation warning or order", () => {
    const roadClosure = palisades.events.find((event) => event.officialSignal === "road_closure");

    expect(roadClosure).toBeDefined();
    expect(evaluateHistoricalEvent(roadClosure!).mode).toBe("prepare");
  });

  test("evaluates a scenario in source-row order without changing its evidence", () => {
    const decisions = evaluateScenario(palisades.events);

    expect(decisions.map((decision) => decision.eventId)).toEqual(palisades.events.map((event) => event.id));
    expect(decisions.map((decision) => decision.officialSignal)).toEqual(palisades.events.map((event) => event.officialSignal));
  });

  test("returns route memory without presenting a live recommendation", () => {
    const decision = evaluateHistoricalEvent(palisades.events[3]);

    expect(decision.primaryRouteMemory.name).toBe("Palisades Drive");
    expect(decision.alternateRouteMemory.name).toBe("Pacific Coast Highway");
    expect(decision.primaryRouteMemory.state).toBe("not_stated_in_row");
    expect(Object.keys(decision.primaryRouteMemory)).not.toEqual(
      expect.arrayContaining(["trafficDensity", "closureEtaMinutes", "officialConfidence", "smokeExposure", "capacity"])
    );
    expect(decision.triggerSummary).toContain("not current guidance");
  });
});
