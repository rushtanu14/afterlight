import { describe, expect, test, vi } from "vitest";
import { geocodeLocation, loadLiveIncidentBundle, validateAreaQuery } from "../src/engine/liveSources";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function areaResult(latitude = "34.0480643", longitude = "-118.5264706") {
  return {
    lat: latitude,
    lon: longitude,
    display_name: "Pacific Palisades, Los Angeles, California, United States — raw provider label",
    addresstype: "suburb",
    type: "suburb",
    address: {
      suburb: "Pacific Palisades",
      city: "Los Angeles",
      state: "California"
    }
  };
}

describe("live source ingestion", () => {
  test("accepts areas but rejects street-address precision", async () => {
    expect(validateAreaQuery(" Pasadena, CA ")).toEqual({ ok: true, query: "Pasadena, CA" });
    expect(validateAreaQuery("91101")).toEqual({ ok: true, query: "91101" });
    expect(validateAreaQuery("123 Main Street, Pasadena")).toMatchObject({ ok: false });

    const fetcher = vi.fn();
    const bundle = await loadLiveIncidentBundle("123 Main Street, Pasadena", { fetcher });

    expect(fetcher).not.toHaveBeenCalled();
    expect(bundle.location).toBeNull();
    expect(JSON.stringify(bundle)).not.toContain("123 Main Street");
  });

  test.each([
    "1 Infinite Loop, Cupertino",
    "221B Baker Street, London",
    "221B Baker, London",
    "123 Main, Pasadena",
    "42 Rue de Rivoli, Paris",
    "Rue de Rivoli 42, Paris",
    "500 El Camino Real, Santa Clara"
  ])("rejects exact address pattern before any network request: %s", async (query) => {
    const fetcher = vi.fn();

    expect(validateAreaQuery(query)).toMatchObject({ ok: false });
    const bundle = await loadLiveIncidentBundle(query, { fetcher });

    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(bundle)).not.toContain(query);
  });

  test("caches normalized coarse-area geocodes for the current browser session", async () => {
    const fetcher = vi.fn(async () => jsonResponse([areaResult()]));

    const first = await geocodeLocation(" Pacific   Palisades ", fetcher);
    const second = await geocodeLocation("pacific palisades", fetcher);

    expect(first).toEqual(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("spaces uncached Nominatim requests at least one second apart", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async () => jsonResponse([areaResult()]));

      await geocodeLocation("Pasadena", fetcher);
      const second = geocodeLocation("Altadena", fetcher);
      await Promise.resolve();
      expect(fetcher).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(999);
      expect(fetcher).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await second;
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test("loads a geocoded location with nearby NIFC incidents, NWS alerts, and EONET wildfire records", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([areaResult()]);
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
      label: "Pacific Palisades, Los Angeles, California",
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

  test("rejects a precise Nominatim result even when the submitted query looks coarse", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse([
        {
          lat: "34.1478123",
          lon: "-118.1445123",
          display_name: "123 Main Street, Pasadena, California",
          addresstype: "building",
          type: "house",
          address: { house_number: "123", road: "Main Street", city: "Pasadena", state: "California" }
        }
      ])
    );

    const bundle = await loadLiveIncidentBundle("Pasadena, CA", { fetcher });
    const serialized = JSON.stringify(bundle);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(bundle.location).toBeNull();
    expect(serialized).not.toContain("123 Main Street");
    expect(serialized).not.toContain("34.1478123");
    expect(bundle.sourceStates[0]?.detail).toBe("No coarse area match was found. Try a city, ZIP code, or neighborhood.");
  });

  test("keeps source health visible when public feeds are quiet or throttled", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([areaResult("34.048", "-118.526")]);
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
    expect(bundle.sourceStates.find((state) => state.id === "firms")?.detail).toContain("server proxy");
  });

  test("marks malformed HTTP-200 source payloads as errors instead of quiet usable feeds", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) return jsonResponse([areaResult()]);
      if (url.includes("WFIGS_Incident_Locations_Current")) {
        return jsonResponse({ error: { code: 400, message: "Invalid query" } });
      }
      if (url.includes("api.weather.gov/alerts/active")) return jsonResponse({ type: "FeatureCollection" });
      if (url.includes("eonet.gsfc.nasa.gov")) return jsonResponse({ events: "temporarily unavailable" });
      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades, CA", { fetcher });

    for (const sourceId of ["nifc", "nws", "eonet"] as const) {
      expect(bundle.sourceStates.find((state) => state.id === sourceId)).toMatchObject({ status: "error", count: 0 });
    }
  });

  test("never calls FIRMS from the browser and marks it as server-proxy only", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([areaResult("34.048", "-118.526")]);
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

      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades", { fetcher });
    const requestedUrls = fetcher.mock.calls.map(([input]) => String(input));

    expect(requestedUrls.some((url) => url.includes("firms.modaps.eosdis.nasa.gov"))).toBe(false);
    expect(bundle.sourceStates.find((state) => state.id === "firms")).toMatchObject({
      status: "optional",
      detail: expect.stringContaining("server proxy")
    });
    expect(bundle.signals.some((signal) => signal.source === "NASA FIRMS")).toBe(false);
  });

  test("redacts request URLs, coordinates, and queries from displayed source errors", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([
          {
            ...areaResult("34.1478123", "-118.1445123"),
            display_name: "Pasadena raw provider label",
            addresstype: "city",
            type: "administrative",
            address: { city: "Pasadena", state: "California" }
          }
        ]);
      }

      if (url.includes("WFIGS_Incident_Locations_Current")) return jsonResponse({ error: "denied" }, 403);
      if (url.includes("api.weather.gov/alerts/active")) return jsonResponse({ error: "denied" }, 403);
      if (url.includes("eonet.gsfc.nasa.gov")) return jsonResponse({ error: "denied" }, 403);
      throw new Error("Unexpected source");
    });

    const bundle = await loadLiveIncidentBundle("Sensitive Area, CA", { fetcher });
    const errorDetails = bundle.sourceStates
      .filter((state) => state.status === "error" || state.status === "limited")
      .map((state) => state.detail)
      .join(" ");

    expect(errorDetails).not.toContain("Sensitive Area");
    expect(errorDetails).not.toContain("34.1478123");
    expect(errorDetails).not.toContain("-118.1445123");
    expect(errorDetails).not.toContain("http");
    expect(errorDetails).not.toContain("?");
  });

  test("does not reflect a failed geocoder request into source health", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ error: "bad request" }, 400));

    const bundle = await loadLiveIncidentBundle("Pasadena, CA", { fetcher });
    const serialized = JSON.stringify(bundle);

    expect(serialized).not.toContain("Pasadena, CA");
    expect(serialized).not.toContain("34.1478");
    expect(serialized).not.toContain("nominatim.openstreetmap.org/search?");
    expect(bundle.sourceStates[0]?.detail).toBe("Location lookup could not be completed.");
  });

  test("selects the newest valid EONET geometry and rejects untrusted source links", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([
          {
            ...areaResult("34.1478", "-118.1445"),
            addresstype: "city",
            type: "administrative",
            address: { city: "Pasadena", state: "California" }
          }
        ]);
      }

      if (url.includes("WFIGS_Incident_Locations_Current")) return jsonResponse({ features: [] });
      if (url.includes("api.weather.gov/alerts/active")) return jsonResponse({ features: [] });
      if (url.includes("eonet.gsfc.nasa.gov")) {
        return jsonResponse({
          events: [
            {
              id: "EONET_NEWEST",
              title: "Example wildfire",
              sources: [
                { id: "UNTRUSTED", url: "https://evil.example/phish" },
                { id: "IRWIN", url: "https://irwin.doi.gov/observer/incidents/example" }
              ],
              geometry: [
                { date: "2026-06-15T18:24:00Z", coordinates: [-117.1, 33.9], magnitudeValue: 20, magnitudeUnit: "acres" },
                { date: "2026-07-09T18:24:00Z", coordinates: ["bad", null], magnitudeValue: 99, magnitudeUnit: "acres" },
                { date: "2026-07-05T18:24:00Z", coordinates: [-118.2, 34.2], magnitudeValue: 45, magnitudeUnit: "acres" }
              ]
            }
          ]
        });
      }

      throw new Error("Unexpected source");
    });

    const bundle = await loadLiveIncidentBundle("Pasadena, CA", { fetcher });
    const incident = bundle.incidents[0];

    expect(incident).toMatchObject({ latitude: 34.2, longitude: -118.2, acres: 45 });
    expect(incident?.lastUpdated).toContain("Jul 5, 2026");
    expect(incident?.feedUrl).toBe("https://irwin.doi.gov/observer/incidents/example");
    expect(incident?.sources[0]?.url).toBe("https://irwin.doi.gov/observer/incidents/example");
  });

  test("drops NIFC incidents whose coordinates are outside geographic bounds", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("nominatim.openstreetmap.org")) return jsonResponse([areaResult()]);
      if (url.includes("WFIGS_Incident_Locations_Current")) {
        return jsonResponse({
          features: [
            {
              geometry: { coordinates: [999, 999] },
              properties: { OBJECTID: 1, IncidentName: "INVALID", UniqueFireIdentifier: "INVALID" }
            }
          ]
        });
      }
      if (url.includes("api.weather.gov/alerts/active")) return jsonResponse({ features: [] });
      if (url.includes("eonet.gsfc.nasa.gov")) return jsonResponse({ events: [] });
      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades, CA", { fetcher });

    expect(bundle.incidents.some((incident) => incident.name === "INVALID")).toBe(false);
    expect(bundle.sourceStates.find((state) => state.id === "nifc")?.count).toBe(0);
  });
});
