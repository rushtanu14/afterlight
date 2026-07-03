import { describe, expect, test } from "vitest";
import { normalizeOfficialRows } from "../src/engine/replayImport";
import { connectorReadinessScore, sourceConnectors } from "../src/engine/sourceConnectors";

describe("source connector normalization", () => {
  test("converts official timeline rows into detector-ready signal rows", () => {
    const rows = normalizeOfficialRows([
      {
        time: "18:42",
        source: "Agency action log",
        text: "Primary ridge road slowing; smoke column moving toward corridor; evacuation warning remains active.",
        url: "https://www.fire.ca.gov/incidents"
      }
    ]);

    expect(rows).toEqual([
      {
        time: "18:42",
        source: "Agency action log",
        routeStress: 78,
        spread: 66,
        officialConfidence: 88,
        tags: ["route", "smoke", "warning"]
      }
    ]);
  });

  test("scores connector readiness from live, public, curated, and household sources", () => {
    expect(connectorReadinessScore(sourceConnectors)).toBeGreaterThanOrEqual(78);
  });
});
