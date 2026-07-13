import { afterEach, describe, expect, test, vi } from "vitest";
import { geocodeLocation, loadLiveIncidentBundle, validateAreaQuery } from "../src/engine/liveSources";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function geocodeProxyResponse(
  latitude = 34.0480643,
  longitude = -118.5264706,
  label = "Pacific Palisades, Los Angeles, California"
) {
  return {
    success: true,
    data: { label, latitude, longitude },
    meta: { cache: "miss" }
  };
}

describe("live source ingestion", () => {
  afterEach(() => vi.useRealTimers());

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

  test("posts normalized coarse-area queries to the same-origin proxy", async () => {
    const fetcher = vi.fn(async () => jsonResponse({
      success: true,
      data: { label: "Pacific Palisades, Los Angeles, California", latitude: 34.0480643, longitude: -118.5264706 },
      meta: { cache: "miss" }
    }));

    const result = await geocodeLocation(" Pacific   Palisades ", fetcher);
    const [input, init] = fetcher.mock.calls[0] ?? [];

    expect(result.label).toBe("Pacific Palisades, Los Angeles, California");
    expect(String(input)).toBe("/api/geocode");
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(init?.body))).toEqual({ query: "Pacific Palisades" });
    expect(String(input)).not.toContain("nominatim.openstreetmap.org");
  });

  test("keeps the request timeout active while a response body is stalled", async () => {
    vi.useFakeTimers();
    let outcome = "pending";
    let aborted = false;
    const fetcher = vi.fn(async (_input: string | URL, init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: () => new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      })
    }) as Response);

    void geocodeLocation("Pasadena", fetcher).then(
      () => { outcome = "resolved"; },
      () => { outcome = "rejected"; }
    );
    await vi.advanceTimersByTimeAsync(9_000);
    await Promise.resolve();

    expect(aborted).toBe(true);
    expect(outcome).toBe("rejected");
  });

  test("loads a geocoded location with nearby NIFC incidents, NWS alerts, and EONET wildfire records", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse());

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
    const eonetRequest = fetcher.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes("eonet.gsfc.nasa.gov"));
    const [west, north, east, south] = new URL(eonetRequest ?? "https://invalid.test").searchParams
      .get("bbox")
      ?.split(",")
      .map(Number) ?? [];
    expect(west).toBeLessThan(east ?? Number.NEGATIVE_INFINITY);
    expect(north).toBeGreaterThan(south ?? Number.POSITIVE_INFINITY);
  });

  test("leaves missing NWS alert time unavailable instead of fabricating one", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse());
      if (url.includes("WFIGS_Incident_Locations_Current")) return jsonResponse({ features: [] });
      if (url.includes("api.weather.gov/alerts/active")) {
        return jsonResponse({ features: [{ properties: { event: "Fire Weather Watch", headline: "Timing unavailable" } }] });
      }
      if (url.includes("eonet.gsfc.nasa.gov")) return jsonResponse({ events: [] });
      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades, CA", {
      fetcher,
      now: new Date("2026-07-03T15:00:00Z")
    });

    expect(bundle.signals.find((signal) => signal.title === "Fire Weather Watch")?.time).toBe("");
  });

  test("keeps a proxy-rejected precise result out of browser state", async () => {
    const fetcher = vi.fn(async () => jsonResponse({
      success: false,
      error: { code: "not_found", message: "No coarse area match was found. Try a city, ZIP code, or neighborhood." }
    }, 404));

    const bundle = await loadLiveIncidentBundle("Pasadena, CA", { fetcher });
    const serialized = JSON.stringify(bundle);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(bundle.location).toBeNull();
    expect(serialized).not.toContain("Main Street");
    expect(serialized).not.toContain("34.1478123");
    expect(bundle.sourceStates[0]?.detail).toBe("No coarse area match was found. Try a city, ZIP code, or neighborhood.");
  });

  test("keeps source health visible when public feeds are quiet or throttled", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse(34.048, -118.526));

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

      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse());
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

      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse(34.048, -118.526));

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

      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse(34.1478123, -118.1445123, "Pasadena, California"));

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

      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse(34.1478, -118.1445, "Pasadena, California"));

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
      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse());
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

  test("rejects blank feed coordinates and dates instead of coercing them to zero", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url === "/api/geocode") return jsonResponse(geocodeProxyResponse());
      if (url.includes("WFIGS_Incident_Locations_Current")) {
        return jsonResponse({
          features: [{
            geometry: { coordinates: ["", " "] },
            properties: {
              OBJECTID: 11,
              IncidentName: "BLANK COORDINATES",
              FireDiscoveryDateTime: " ",
              ModifiedOnDateTime_dt: ""
            }
          }]
        });
      }
      if (url.includes("api.weather.gov/alerts/active")) return jsonResponse({ features: [] });
      if (url.includes("eonet.gsfc.nasa.gov")) {
        return jsonResponse({
          events: [{
            id: "BLANK_DATE",
            title: "Blank date wildfire",
            geometry: [{ date: " ", coordinates: [-118.2, 34.2] }]
          }]
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const bundle = await loadLiveIncidentBundle("Pacific Palisades, CA", { fetcher });

    expect(bundle.incidents).toEqual([]);
    expect(bundle.sourceStates.find((state) => state.id === "nifc")?.count).toBe(0);
    expect(bundle.sourceStates.find((state) => state.id === "eonet")?.count).toBe(0);
  });
});
