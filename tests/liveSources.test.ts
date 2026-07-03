import { describe, expect, test, vi } from "vitest";
import { loadLiveIncidentBundle } from "../src/engine/liveSources";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" }
  });
}

describe("live source ingestion", () => {
  test("loads a geocoded location with nearby NIFC incidents, NWS alerts, and EONET wildfire records", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([
          {
            lat: "34.0480643",
            lon: "-118.5264706",
            display_name: "Pacific Palisades, Los Angeles, California, United States"
          }
        ]);
      }

      if (url.includes("WFIGS_Incident_Locations_Current")) {
        return jsonResponse({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [-118.56095, 34.45412] },
              properties: {
                OBJECTID: 9,
                IncidentName: "MASON",
                UniqueFireIdentifier: "2026-CALAC-228186",
                IncidentSize: 24,
                PercentContained: 15,
                FireDiscoveryDateTime: Date.UTC(2026, 5, 30, 9, 33),
                ModifiedOnDateTime_dt: Date.UTC(2026, 5, 30, 10, 4),
                POOCounty: "Los Angeles",
                POOState: "US-CA",
                POOProtectingAgency: "CAL FIRE"
              }
            }
          ]
        });
      }

      if (url.includes("api.weather.gov/alerts/active")) {
        return jsonResponse({
          type: "FeatureCollection",
          features: [
            {
              properties: {
                event: "Red Flag Warning",
                headline: "Red Flag Warning issued for Los Angeles County",
                severity: "Severe",
                effective: "2026-07-03T18:00:00Z",
                areaDesc: "Los Angeles County"
              }
            }
          ]
        });
      }

      if (url.includes("eonet.gsfc.nasa.gov")) {
        return jsonResponse({
          events: [
            {
              id: "EONET_20564",
              title: "SHORE Wildfire, Riverside, California",
              link: "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_20564",
              sources: [{ id: "IRWIN", url: "https://irwin.doi.gov/observer/incidents/example" }],
              geometry: [
                {
                  magnitudeValue: 3085,
                  magnitudeUnit: "acres",
                  date: "2026-06-15T18:24:00Z",
                  coordinates: [-117.103582, 33.976656]
                }
              ]
            }
          ]
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades, CA", {
      fetcher,
      now: new Date("2026-07-03T15:00:00Z")
    });

    expect(bundle.location).toMatchObject({
      label: "Pacific Palisades, Los Angeles, California, United States",
      latitude: 34.0480643,
      longitude: -118.5264706
    });
    expect(bundle.incidents[0]).toMatchObject({
      id: "nifc-2026-CALAC-228186",
      name: "MASON",
      confidence: "NIFC live incident",
      sourceId: "nifc",
      latitude: 34.45412,
      longitude: -118.56095
    });
    expect(bundle.incidents.some((incident) => incident.id === "eonet-EONET_20564")).toBe(true);
    expect(bundle.sourceStates.find((state) => state.id === "nws")?.status).toBe("live");
    expect(bundle.sourceStates.find((state) => state.id === "firms")?.status).toBe("optional");
    expect(bundle.signals.some((signal) => signal.source === "NWS" && signal.title === "Red Flag Warning")).toBe(true);
  });

  test("keeps source health visible when public feeds are quiet or throttled", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([{ lat: "34.048", lon: "-118.526", display_name: "Pacific Palisades" }]);
      }

      if (url.includes("WFIGS_Incident_Locations_Current")) {
        return jsonResponse({ type: "FeatureCollection", features: [] });
      }

      if (url.includes("api.weather.gov/alerts/active")) {
        return jsonResponse({ type: "FeatureCollection", features: [] });
      }

      if (url.includes("eonet.gsfc.nasa.gov")) {
        return jsonResponse({ message: "Service is experiencing high demand." }, 503);
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades", { fetcher });

    expect(bundle.incidents).toEqual([]);
    expect(bundle.sourceStates.find((state) => state.id === "nifc")?.status).toBe("quiet");
    expect(bundle.sourceStates.find((state) => state.id === "nws")?.status).toBe("quiet");
    expect(bundle.sourceStates.find((state) => state.id === "eonet")?.status).toBe("limited");
    expect(bundle.sourceStates.find((state) => state.id === "firms")?.detail).toContain("free MAP_KEY");
  });

  test("parses optional FIRMS CSV detections when a free map key is provided", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([{ lat: "34.048", lon: "-118.526", display_name: "Pacific Palisades" }]);
      }

      if (url.includes("WFIGS_Incident_Locations_Current")) {
        return jsonResponse({ type: "FeatureCollection", features: [] });
      }

      if (url.includes("api.weather.gov/alerts/active")) {
        return jsonResponse({ type: "FeatureCollection", features: [] });
      }

      if (url.includes("eonet.gsfc.nasa.gov")) {
        return jsonResponse({ events: [] });
      }

      if (url.includes("firms.modaps.eosdis.nasa.gov")) {
        return textResponse("latitude,longitude,acq_date,acq_time,confidence\n34.10,-118.40,2026-07-03,1912,h\n");
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades", {
      fetcher,
      firmsMapKey: "free-test-key"
    });

    expect(bundle.sourceStates.find((state) => state.id === "firms")?.status).toBe("live");
    expect(bundle.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "NASA FIRMS",
          title: "Thermal detection",
          severity: "watch"
        })
      ])
    );
  });
});
