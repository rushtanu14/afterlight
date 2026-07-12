import { describe, expect, test } from "vitest";
import { getJudgeStep, isJudgeMode } from "../src/engine/judgeMode";

describe("deterministic judge mode", () => {
  test("covers Palisades then Eaton in exactly 90 seconds", () => {
    expect(getJudgeStep(0)).toMatchObject({ scenarioId: "palisades-2025", phase: "thesis" });
    expect(getJudgeStep(44_999)).toMatchObject({ scenarioId: "palisades-2025", phase: "safety_boundary" });
    expect(getJudgeStep(45_000)).toMatchObject({ scenarioId: "eaton-2025", phase: "thesis" });
    expect(getJudgeStep(89_999)).toMatchObject({ scenarioId: "eaton-2025", phase: "safety_boundary" });
    expect(getJudgeStep(90_000)).toBeNull();
    expect(getJudgeStep(-1)).toBeNull();
  });

  test("visits every judge phase for both scenarios", () => {
    const samples = [0, 8_000, 31_000, 39_000, 43_000, 45_000, 53_000, 76_000, 84_000, 88_000]
      .map((elapsedMs) => getJudgeStep(elapsedMs))
      .filter((step) => step !== null);

    for (const scenarioId of ["palisades-2025", "eaton-2025"] as const) {
      expect(samples.filter((step) => step.scenarioId === scenarioId).map((step) => step.phase)).toEqual([
        "thesis",
        "official_rows",
        "memory_output",
        "evaluation",
        "safety_boundary"
      ]);
    }
  });

  test("maps the official-row phase onto valid case event indexes", () => {
    const earlyPalisades = getJudgeStep(8_000);
    const latePalisades = getJudgeStep(29_999);
    const earlyEaton = getJudgeStep(53_000);
    const lateEaton = getJudgeStep(74_999);

    expect(earlyPalisades?.eventIndex).toBe(0);
    expect(latePalisades?.eventIndex).toBeGreaterThan(earlyPalisades?.eventIndex ?? -1);
    expect(earlyEaton?.eventIndex).toBe(0);
    expect(lateEaton?.eventIndex).toBeGreaterThan(earlyEaton?.eventIndex ?? -1);
  });

  test("activates only for the explicit judge query flag", () => {
    expect(isJudgeMode("?judge=1")).toBe(true);
    expect(isJudgeMode("?mode=demo&judge=1")).toBe(true);
    expect(isJudgeMode("?judge=0")).toBe(false);
    expect(isJudgeMode("?judge=true")).toBe(false);
    expect(isJudgeMode("")).toBe(false);
  });
});
