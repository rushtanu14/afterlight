import { describe, expect, test } from "vitest";
import { replayEvents } from "../src/data/replay";
import { defaultHouseholdProfile, detectDecision, replayDecisionSeries } from "../src/engine/detector";

describe("Afterlight detector", () => {
  test("keeps the household in prepare mode during an early watch signal", () => {
    const decision = detectDecision(replayEvents[0], defaultHouseholdProfile);

    expect(decision.mode).toBe("prepare");
    expect(decision.routeClosureRisk).toBe("medium");
    expect(decision.backupOverloadRisk).toBe("low");
    expect(decision.leaveBeforeSignal).toContain("route stress reaches");
  });

  test("switches to leave now when route stress and hazard movement stack", () => {
    const decision = detectDecision(replayEvents[2], defaultHouseholdProfile);

    expect(decision.mode).toBe("leave_now");
    expect(decision.routeClosureRisk).toBe("high");
    expect(decision.primaryRoute.status).toBe("degraded");
    expect(decision.recommendedRoute.name).toBe("Valley connector");
  });

  test("flags backup overload when assistance needs arrive during severe route pressure", () => {
    const decision = detectDecision(replayEvents[3], defaultHouseholdProfile);

    expect(decision.backupOverloadRisk).toBe("high");
    expect(decision.detectedFailureIds).toContain("help-need");
    expect(decision.mobilityBufferMinutes).toBe(30);
  });

  test("returns an auditable evidence chain for the active recommendation", () => {
    const decision = detectDecision(replayEvents[2], defaultHouseholdProfile);

    expect(decision.evidenceTrail.map((item) => item.rule)).toEqual(
      expect.arrayContaining(["hazard_movement", "route_stress", "official_source"])
    );
    expect(decision.evidenceTrail[0]).toMatchObject({
      time: "18:42",
      source: "Traffic and agency action log"
    });
  });

  test("replay series finds the first leave-now point in timestamp order", () => {
    const series = replayDecisionSeries(replayEvents, defaultHouseholdProfile);
    const firstLeaveNow = series.find((decision) => decision.mode === "leave_now");

    expect(firstLeaveNow?.time).toBe("18:42");
    expect(series.map((decision) => decision.time)).toEqual(["17:18", "18:07", "18:42", "19:16", "20:03"]);
  });
});
