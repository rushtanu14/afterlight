import { describe, expect, test } from "vitest";
import { normalizeOfficialRows } from "../src/engine/replayImport";
import type { LiveSourceState } from "../src/engine/liveSources";
import { sourceConnectors, summarizeSourceHealth } from "../src/engine/sourceConnectors";

describe("source connector normalization", () => {
  test("preserves official rows as categorical references without derived scores", () => {
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
        sourceText: "Primary ridge road slowing; smoke column moving toward corridor; evacuation warning remains active.",
        sourceUrl: "https://www.fire.ca.gov/incidents",
        categories: ["route_reference", "hazard_reference", "official_notice_reference"]
      }
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/routeStress|spread|officialConfidence|confidence|score/i);
  });

  test("keeps connector descriptions descriptive instead of producing action guidance", () => {
    const copy = sourceConnectors.map((connector) => `${connector.detail} ${connector.proof}`).join(" ");

    expect(copy).not.toMatch(/leave-before|leave now|route recommendation|evacuation timing/i);
  });

  test("summarizes runtime source health without counting optional sources", () => {
    const states: LiveSourceState[] = [
      { id: "nominatim", name: "Geocoder", status: "live", detail: "ok", checkedAt: "2026-07-11T00:00:00Z", count: 1, url: "https://example.test" },
      { id: "nifc", name: "NIFC", status: "quiet", detail: "none", checkedAt: "2026-07-11T00:00:00Z", count: 0, url: "https://example.test" },
      { id: "nws", name: "NWS", status: "limited", detail: "limited", checkedAt: "2026-07-11T00:00:00Z", count: 0, url: "https://example.test" },
      { id: "eonet", name: "EONET", status: "error", detail: "error", checkedAt: "2026-07-11T00:00:00Z", count: 0, url: "https://example.test" },
      { id: "firms", name: "FIRMS", status: "optional", detail: "optional", checkedAt: "2026-07-11T00:00:00Z", count: 0, url: "https://example.test" }
    ];

    expect(summarizeSourceHealth(states)).toEqual({ checked: 4, usable: 2, degraded: 2 });
  });
});
