import { describe, expect, test } from "vitest";
import { buildEvaluationRows } from "../src/components/EvaluationPanel";
import { historicalAnchorLabel, historicalRoadLabel } from "../src/components/HistoricalIncidentMap";
import { archiveReferences, getHistoricalScenario, historicalScenarios } from "../src/data/historicalScenarios";
import { evaluateScenario } from "../src/engine/detector";

describe("official historical scenarios", () => {
  const expectedManifest = [
    ["palisades-resident-only-closure", "2025-01-07T09:42:00-08:00", "road_closure", "LA County Sheriffs", "1/7/2025", "09:42", "Resident Only Closure in effect for Topanga Canyon Boulevard due to anticipated extreme weather and wind conditions; closures listed at Topanga Canyon Blvd / Mulholland Dr, Old Topanga Canyon Rd / Mulholland Hwy, and Topanga Canyon Blvd / Pacific Coast Hwy."],
    ["palisades-fire-reported", "2025-01-07T10:30:00-08:00", "incident_report", "LA County CEOC 214", "1/7/2025", "10:30", "2 fires reported - The vegetation Fire on Palisades Dr & Calle Victoria, Pacific Palisades and the Sunset Fire on West Sunset Bl, Los Angeles."],
    ["palisades-wind-alignment", "2025-01-07T10:46:00-08:00", "incident_report", "LFD Tac-5", "1/7/2025", "10:46", "This thing is already at two acres. It's 100% in alignment with the wind. It started at a ridge top and pushing directly towards the Palisades. This has the potential for 200 acres in the next 20 minutes. Will probably have an impact time into structures being threatened under 20 minutes."],
    ["palisades-warning-zones", "2025-01-07T11:17:00-08:00", "evacuation_warning", "LA County CEOC 214", "1/7/2025", "11:17", "Evacuation warnings for TOP-U007, TOP-U009, SSM-U010 for Palisades Fire, including Topanga Elementary School surroundings, Fernwood and Wildwood communities, and Coastline Drive up to West Clifftop Way."],
    ["palisades-order-to-pch", "2025-01-07T11:29:00-08:00", "evacuation_order", "LFD Tac-5", "1/7/2025", "11:29", "We're deputy IC on the Palisades incident. We're going to need an evacuation order all the way to PCH. Metro confirms: evacuation order all the way down to PCH."],
    ["palisades-drive-blocked", "2025-01-07T11:42:00-08:00", "road_closure", "LAC V-1", "1/7/2025", "11:42", "All companies at the bottom of Palisades Drive are unable to come up. Traffic has completely blocked all four lanes. We need to start getting some cars off this hill so we can get companies up."],
    ["eaton-ready-to-evacuate-notice", "2025-01-07T15:34:00-08:00", "readiness_notice", "LA County high winds, fire and power outages notice", "1/7/2025", "3:34 PM", "LA County high winds, fire and power outages notice encouraging residents to be ready to evacuate."],
    ["eaton-fire-starts", "2025-01-07T18:17:00-08:00", "incident_report", "Eaton fire starts", "1/7/2025", "6:17 PM", "Eaton fire starts."],
    ["eaton-first-aware-alert", "2025-01-07T18:48:00-08:00", "awareness_alert", "PBS warn alert", "1/7/2025", "18:48", "LA County Office of Emergency Management: Fast moving wildfire in your area. BE AWARE of your surroundings and MONITOR the situation closely. Follow all instructions from first responders in the field. More information will be posted on alertla.org when available."],
    ["eaton-order-prep", "2025-01-07T19:00:00-08:00", "alert_preparation", "LA County CEOC 214", "1/7/2025", "19:00", "Received call that Eaton Fire was growing and that orders needed to be sent out. Relieving Alert and warning individual sat with me while building out alert. Once accurate zone was received - WEA was launched at 1920 hours."],
    ["eaton-first-order", "2025-01-07T19:26:00-08:00", "evacuation_order", "PBS warn alert", "1/7/2025", "19:26", "LA County Office of Emergency Management: FAST MOVING WILDFIRE IN YOUR AREA. AN EVACUATION ORDER HAS BEEN ISSUED FOR YOUR AREA. LEAVE NOW. More info at alertla.org."],
    ["eaton-warning-expansion", "2025-01-07T19:55:00-08:00", "evacuation_warning", "PBS warn alert", "1/7/2025", "19:55", "LA County Office of Emergency Management: FAST MOVING WILDFIRE IN THE AREA. AN EVACUATION WARNING HAS BEEN ISSUED. PREPARE TO LEAVE. More information at alertla.org."]
  ];
  const expectedRecordDetails = [
    ["palisades-resident-only-closure", "Palisades", "Topanga Canyon Boulevard access points", ""],
    ["palisades-fire-reported", "Palisades", "Palisades Dr & Calle Victoria, Pacific Palisades", ""],
    ["palisades-wind-alignment", "Palisades", "", "HLCO to Metro"],
    ["palisades-warning-zones", "Palisades", "TOP-U007, TOP-U009, SSM-U010", ""],
    ["palisades-order-to-pch", "Palisades", "Palisades to PCH", "LFD CM to Metro"],
    ["palisades-drive-blocked", "Palisades", "Palisades Drive", "TF1041 to OSC"],
    ["eaton-ready-to-evacuate-notice", "Eaton", "Los Angeles County", ""],
    ["eaton-fire-starts", "Eaton", "Eaton Canyon / Altadena", ""],
    ["eaton-first-aware-alert", "Eaton", "PAS-E014 to ALD-MENDOCINO-D zones", ""],
    ["eaton-order-prep", "Eaton", "", ""],
    ["eaton-first-order", "Eaton", "KIN-KINNELOA-A/B, PAS-E019, ALD-EATONCANYON, ALD-MIDLOTHIAN, ALD-GARFIAS, ALD-EASTLOMA, ALD-MENDOCINO-A-D", ""],
    ["eaton-warning-expansion", "Eaton", "PAS-E014 to ALD-MOUNTLOWE zones", ""]
  ];

  test("ships exactly the two scenarios with loaded official source rows", () => {
    expect(historicalScenarios.map((scenario) => scenario.id)).toEqual(["palisades-2025", "eaton-2025"]);
    expect(getHistoricalScenario("palisades-2025").events).toHaveLength(6);
    expect(getHistoricalScenario("eaton-2025").events).toHaveLength(6);
  });

  test.each(historicalScenarios)("keeps $name rows chronological and attributable", (scenario) => {
    const timestamps = scenario.events.map((event) => event.timestamp);

    expect(timestamps).toEqual([...timestamps].sort());
    expect(scenario.sourceUrl).toMatch(/^https:\/\//);
    expect(scenario.events.every((event) => event.sourceUrl.startsWith("https://"))).toBe(true);
    expect(scenario.events.every((event) => event.officialRecord.eventDescription.length > 0)).toBe(true);
  });

  test("matches the exact per-row identifier, timestamp, category, and official record manifest", () => {
    const manifest = historicalScenarios.flatMap((scenario) =>
      scenario.events.map((event) => [
        event.id,
        event.timestamp,
        event.officialSignal,
        event.officialRecord.sourceDescription,
        event.officialRecord.eventDate,
        event.officialRecord.eventTime,
        event.sourceText
      ])
    );

    expect(manifest).toEqual(expectedManifest);
    expect(
      historicalScenarios.flatMap((scenario) =>
        scenario.events.map((event) => [
          event.id,
          event.officialRecord.incidentName,
          event.officialRecord.eventLocation,
          event.officialRecord.eventUnits
        ])
      )
    ).toEqual(expectedRecordDetails);
    expect(historicalScenarios.flatMap((scenario) => scenario.events).every((event) => event.sourceText === event.officialRecord.eventDescription)).toBe(true);
  });

  test("uses categorical route history without numeric estimates or derived confidence", () => {
    const routes = historicalScenarios.flatMap((scenario) => scenario.events.flatMap((event) => event.routePlan.routes));

    expect(routes.every((route) => ["not_stated_in_row", "access_restricted", "blocked"].includes(route.state))).toBe(true);
    expect(routes.every((route) => !["trafficDensity", "closureEtaMinutes", "officialConfidence", "smokeExposure", "capacity"].some((key) => key in route))).toBe(true);
  });

  test("keeps pre-action rows descriptive instead of adding movement guidance", () => {
    const preActionEvents = historicalScenarios.flatMap((scenario) =>
      scenario.events.filter((event) => event.officialSignal !== "evacuation_warning" && event.officialSignal !== "evacuation_order")
    );

    expect(
      preActionEvents.every((event) =>
        !/\b(?:leave|moving|move|stage|staging|transport|accelerate|wait|waiting)\b/i.test(
          [event.narrative, event.failureLesson, event.futureLesson].join(" ")
        )
      )
    ).toBe(true);
  });

  test("marks map readings unavailable when the active source row does not state them", () => {
    const expectedUnavailableReadings = [
      ["palisades-fire-reported", "windLabel"],
      ["palisades-fire-reported", "alertLabel"],
      ["palisades-warning-zones", "windLabel"],
      ["palisades-order-to-pch", "windLabel"],
      ["palisades-drive-blocked", "spreadLabel"],
      ["palisades-drive-blocked", "windLabel"],
      ["eaton-ready-to-evacuate-notice", "spreadLabel"],
      ["eaton-ready-to-evacuate-notice", "roadLabel"],
      ["eaton-fire-starts", "windLabel"],
      ["eaton-first-aware-alert", "windLabel"],
      ["eaton-order-prep", "windLabel"]
    ] as const;

    for (const [eventId, reading] of expectedUnavailableReadings) {
      const event = historicalScenarios.flatMap((scenario) => scenario.events).find((candidate) => candidate.id === eventId);
      expect(event?.mapReadings[reading], `${eventId}.${reading}`).toBe("Not stated in this row");
    }
  });

  test.each(historicalScenarios)("links every $name row to stored incident map geometry", (scenario) => {
    const pointIds = new Set(scenario.mapGeometry.points.map((point) => point.id));

    expect(scenario.events.every((event) => pointIds.has(event.mapPointId))).toBe(true);
    expect(scenario.mapGeometry.points.every((point) => point.provenance === "illustrative_anchor")).toBe(true);
  });

  test.each(historicalScenarios)("records OSM way, capture, attribution, and license provenance for $name", (scenario) => {
    for (const snapshot of scenario.mapGeometry.roadSnapshots) {
      expect(snapshot.wayUrls).toEqual(snapshot.wayIds.map((wayId) => `https://www.openstreetmap.org/way/${wayId}`));
      expect(snapshot.capturedOn).toBe("2026-06-30");
      expect(snapshot.attribution).toBe("© OpenStreetMap contributors");
      expect(snapshot.licenseUrl).toBe("https://opendatacommons.org/licenses/odbl/1-0/");
    }
  });

  test("ships incident-specific perimeter and road provenance", () => {
    const palisades = getHistoricalScenario("palisades-2025");
    const eaton = getHistoricalScenario("eaton-2025");

    expect(palisades.mapGeometry.perimeterLayer?.sourceUrl).toMatch(/^https:\/\//);
    expect(palisades.mapGeometry.perimeterLayer?.serviceUrl).toMatch(/^https:\/\//);
    expect(eaton.mapGeometry.roadSnapshots.length).toBeGreaterThan(0);
    expect(eaton.mapGeometry.roadSnapshots.every((road) => road.source === "OpenStreetMap API 0.6 way/full")).toBe(true);
  });

  test("labels map evidence without implying current route status", () => {
    const palisades = getHistoricalScenario("palisades-2025");
    const anchor = palisades.mapGeometry.points[0];
    const road = palisades.mapGeometry.roadSnapshots[0];

    expect(historicalAnchorLabel(anchor)).toContain("illustrative anchor");
    expect(historicalRoadLabel(road)).toContain("historical OSM road snapshot");
    expect(historicalRoadLabel(road)).not.toMatch(/\b(?:open|closed|recommended|avoid)\b/i);
  });

  test("compares expected and detected categorical action rows across both loaded fires", () => {
    expect(buildEvaluationRows(historicalScenarios, evaluateScenario)).toEqual([
      {
        scenarioId: "palisades-2025",
        scenarioName: "Palisades Fire",
        rowCount: 6,
        expectedActionRows: 2,
        detectedActionRows: 2,
        firstExpectedActionRow: "Evacuation warnings issued for Topanga zones",
        firstDetectedActionRow: "Evacuation warnings issued for Topanga zones",
        attributableRows: 6
      },
      {
        scenarioId: "eaton-2025",
        scenarioName: "Eaton Fire",
        rowCount: 6,
        expectedActionRows: 2,
        detectedActionRows: 2,
        firstExpectedActionRow: "First evacuation order: leave now",
        firstDetectedActionRow: "First evacuation order: leave now",
        attributableRows: 6
      }
    ]);
  });

  test("keeps Camp Fire archive-only instead of fabricating a granular replay", () => {
    expect(archiveReferences).toEqual([
      {
        id: "camp-2018",
        name: "Camp Fire",
        sourceUrl: "https://www.fire.ca.gov/incidents/2018/11/8/camp-fire",
        evaluationStatus: "insufficient_official_rows"
      }
    ]);
    expect(historicalScenarios.some((scenario) => scenario.id === "camp-2018")).toBe(false);
  });

  test("refuses to score an archive-only incident", () => {
    expect(archiveReferences[0].evaluationStatus).toBe("insufficient_official_rows");
  });

  test("rejects unknown scenario identifiers", () => {
    expect(() => getHistoricalScenario("camp-2018")).toThrow("Unknown historical scenario: camp-2018");
  });
});
