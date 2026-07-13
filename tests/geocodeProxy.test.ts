import { describe, expect, test, vi } from "vitest";
import { createGeocodeHandler } from "../api/_lib/geocodeService";
import { MemoryGeocodeStore, type GeocodeCacheEntry, type GeocodeStore } from "../api/_lib/geocodeStore";

const APP_ORIGIN = "https://afterlight.test";
const PROVIDER_URL = "https://nominatim.openstreetmap.org/search";
const PROVIDER_USER_AGENT = "Afterlight/0.1 (+https://github.com/rushtanu14/afterlight)";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function coarseProviderResult() {
  return [{
    lat: "34.1478",
    lon: "-118.1445",
    display_name: "Pasadena, Los Angeles County, California, United States",
    addresstype: "city",
    type: "administrative",
    address: { city: "Pasadena", county: "Los Angeles County", state: "California" }
  }];
}

function post(query: string, options: { origin?: string; contentType?: string; body?: string } = {}) {
  const headers = new Headers();
  if (options.origin !== "") headers.set("Origin", options.origin ?? APP_ORIGIN);
  if (options.contentType !== "") headers.set("Content-Type", options.contentType ?? "application/json");

  return new Request(`${APP_ORIGIN}/api/geocode`, {
    method: "POST",
    headers,
    body: options.body ?? JSON.stringify({ query })
  });
}

class RecordingStore implements GeocodeStore {
  readonly getKeys: string[] = [];
  readonly setCalls: Array<{ key: string; value: GeocodeCacheEntry; ttlSeconds: number }> = [];
  readonly slotCalls: number[] = [];

  constructor(
    private readonly cached: GeocodeCacheEntry | null = null,
    private readonly slot: { allowed: boolean; retryAfterMs: number } = { allowed: true, retryAfterMs: 0 },
    private readonly clientQuota: { allowed: boolean; retryAfterSeconds: number } = {
      allowed: true,
      retryAfterSeconds: 0
    },
    private readonly providerQuota: { allowed: boolean; retryAfterSeconds: number } = {
      allowed: true,
      retryAfterSeconds: 0
    }
  ) {}

  async get(key: string) {
    this.getKeys.push(key);
    return this.cached ? structuredClone(this.cached) : null;
  }

  async set(key: string, value: GeocodeCacheEntry, ttlSeconds: number) {
    this.setCalls.push({ key, value: structuredClone(value), ttlSeconds });
  }

  async reserveProviderSlot(minimumIntervalMs: number) {
    this.slotCalls.push(minimumIntervalMs);
    return { ...this.slot };
  }

  async reserveClientQuota() {
    return { ...this.clientQuota };
  }

  async reserveProviderQuota() {
    return { ...this.providerQuota };
  }
}

function handler(
  store: GeocodeStore,
  fetcher = vi.fn(async () => jsonResponse(coarseProviderResult())),
  overrides: Partial<Parameters<typeof createGeocodeHandler>[0]> = {}
) {
  return {
    fetcher,
    handle: createGeocodeHandler({
      store,
      fetcher,
      provider: { url: PROVIDER_URL, userAgent: PROVIDER_USER_AGENT },
      ...overrides
    })
  };
}

describe("geocoder proxy", () => {
  test.each([
    "123 Main, Pasadena",
    "Pennsylvania Avenue 1600",
    "Main Street 123",
    "Baker Street 221B",
    "Main St Pasadena",
    "5th Ave 350 New York",
    "12345 Broadway, New York",
    "Broadway 10001",
    "Highway 12345",
    "St Louis, 63101",
    "１２３４５ Broadway, New York",
    "١٢٣٤٥ Broadway, New York",
    "¹²³ Main, Pasadena"
  ])("rejects address-like input before cache or upstream access: %s", async (query) => {
    const store = new RecordingStore();
    const { handle, fetcher } = handler(store);

    const response = await handle(post(query));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "invalid_query", message: "Enter a city, ZIP code, or neighborhood, not a street address." }
    });
    expect(store.getKeys).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("keeps Saint-prefixed cities and standalone ZIP codes usable", async () => {
    const store = new RecordingStore();
    const { handle, fetcher } = handler(store);

    await handle(post("St Louis"));
    await handle(post("63101"));

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("rejects street-name queries without a house number before upstream access", async () => {
    const store = new RecordingStore();
    const { handle, fetcher } = handler(store);

    const response = await handle(post("Baker Street, London"));

    expect(response.status).toBe(400);
    expect(store.getKeys).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("enforces method, same-origin, content-type, body-size, and JSON boundaries", async () => {
    const { handle } = handler(new RecordingStore());

    expect((await handle(new Request(`${APP_ORIGIN}/api/geocode`, { method: "GET" }))).status).toBe(405);
    expect((await handle(post("Pasadena", { origin: "" }))).status).toBe(403);
    expect((await handle(post("Pasadena", { origin: "https://evil.example" }))).status).toBe(403);
    expect((await handle(post("Pasadena", { contentType: "text/plain" }))).status).toBe(415);
    expect((await handle(post("Pasadena", { body: "{" }))).status).toBe(400);
    expect((await handle(post("Pasadena", { body: JSON.stringify({ query: "x".repeat(1_100) }) }))).status).toBe(413);
  });

  test("returns a shared cache hit without contacting Nominatim", async () => {
    const store = new RecordingStore({
      kind: "location",
      location: { label: "Pasadena, Los Angeles County, California", latitude: 34.1478, longitude: -118.1445 }
    });
    const { handle, fetcher } = handler(store);

    const response = await handle(post(" Pasadena "));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, meta: { cache: "hit" } });
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.getKeys[0]).toMatch(/^afterlight:geocode:v1:[a-f0-9]{64}$/);
    expect(store.getKeys[0]).not.toContain("pasadena");
  });

  test("applies the client quota but does not consume provider capacity for a cache hit", async () => {
    const cached: GeocodeCacheEntry = {
      kind: "location",
      location: { label: "Pasadena, Los Angeles County, California", latitude: 34.1478, longitude: -118.1445 }
    };
    const reserveClientQuota = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 }));
    const reserveProviderQuota = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 }));
    const store = {
      get: vi.fn(async () => cached),
      set: vi.fn(async () => undefined),
      reserveClientQuota,
      reserveProviderQuota,
      reserveProviderSlot: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 }))
    } as unknown as GeocodeStore;
    const { handle, fetcher } = handler(store);

    const response = await handle(post("Pasadena"));

    expect(response.status).toBe(200);
    expect(reserveClientQuota).toHaveBeenCalledTimes(1);
    expect(reserveProviderQuota).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("fetches one coarse result with an identifying User-Agent and caches only minimized data", async () => {
    const store = new RecordingStore();
    const { handle, fetcher } = handler(store);

    const response = await handle(post("Pasadena"));
    const upstream = new Request(String(fetcher.mock.calls[0]?.[0]), fetcher.mock.calls[0]?.[1]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { label: "Pasadena, Los Angeles County, California", latitude: 34.1478, longitude: -118.1445 },
      meta: { cache: "miss" }
    });
    expect(upstream.url).toContain("q=Pasadena");
    expect(upstream.headers.get("user-agent")).toBe(PROVIDER_USER_AGENT);
    expect(upstream.redirect).toBe("error");
    expect(store.slotCalls).toEqual([1_000]);
    expect(store.setCalls).toHaveLength(1);
    expect(store.setCalls[0]?.key).not.toContain("Pasadena");
    expect(JSON.stringify(store.setCalls[0]?.value)).not.toContain("display_name");
    expect(store.setCalls[0]?.ttlSeconds).toBe(2_592_000);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  test("skips malformed or precise provider rows and minimizes a valid postcode result", async () => {
    const fetcher = vi.fn(async () => jsonResponse([
      "not a record",
      { lat: "34.1", lon: "-118.1", addresstype: "city", type: "administrative" },
      { lat: "34.1", lon: "-118.1", addresstype: "building", type: "house", address: { road: "Private Road" } },
      { lat: "999", lon: "-118.1", addresstype: "city", type: "administrative", address: { city: "Invalid" } },
      {
        lat: 34.1478,
        lon: -118.1445,
        addresstype: "postcode",
        type: "postcode",
        address: { postcode: "91101", city: "Pasadena", state: "California" },
        display_name: "91101, Pasadena, California, United States"
      }
    ]));
    const store = new RecordingStore();
    const { handle } = handler(store, fetcher);

    const response = await handle(post("91101"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { label: "91101, Pasadena, California", latitude: 34.1478, longitude: -118.1445 },
      meta: { cache: "miss" }
    });
    expect(JSON.stringify(store.setCalls[0]?.value)).not.toContain("display_name");
    expect(JSON.stringify(store.setCalls[0]?.value)).not.toContain("Private Road");
  });

  test("negative-caches precise or missing provider results without reflecting provider data", async () => {
    const providerPayload = [{
      lat: "34.1478",
      lon: "-118.1445",
      display_name: "123 Main Street, Pasadena, California",
      addresstype: "building",
      type: "house",
      address: { house_number: "123", road: "Main Street", city: "Pasadena" }
    }];
    const fetcher = vi.fn(async () => jsonResponse(providerPayload));
    const store = new RecordingStore();
    const { handle } = handler(store, fetcher);

    const response = await handle(post("Pasadena"));
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(404);
    expect(serialized).not.toContain("123 Main Street");
    expect(serialized).not.toContain("34.1478");
    expect(store.setCalls[0]).toMatchObject({ value: { kind: "not_found" }, ttlSeconds: 300 });
  });

  test("rejects blank provider coordinates instead of coercing them to zero", async () => {
    const fetcher = vi.fn(async () => jsonResponse([{
      lat: " ",
      lon: "",
      addresstype: "city",
      type: "administrative",
      address: { city: "Pasadena", state: "California" }
    }]));
    const store = new RecordingStore();
    const { handle } = handler(store, fetcher);

    const response = await handle(post("Pasadena"));

    expect(response.status).toBe(404);
    expect(store.setCalls[0]?.value).toEqual({ kind: "not_found" });
  });

  test("redacts upstream failures", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ error: "query Pasadena denied at https://provider.example?q=Pasadena" }, 429));
    const { handle } = handler(new RecordingStore(), fetcher);

    const response = await handle(post("Pasadena"));
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(502);
    expect(serialized).toContain("Location provider is temporarily unavailable");
    expect(serialized).not.toContain("Pasadena");
    expect(serialized).not.toContain("http");
  });

  test("fails closed when the shared store is unavailable", async () => {
    const store: GeocodeStore = {
      get: vi.fn(async () => { throw new Error("redis token and query leaked"); }),
      set: vi.fn(async () => undefined),
      reserveClientQuota: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
      reserveProviderQuota: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
      reserveProviderSlot: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 }))
    };
    const { handle, fetcher } = handler(store);

    const response = await handle(post("Pasadena"));
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(503);
    expect(serialized).toContain("Location proxy is temporarily unavailable");
    expect(serialized).not.toContain("redis");
    expect(serialized).not.toContain("Pasadena");
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("bounds stalled Redis work under the total request deadline", async () => {
    const never = new Promise<never>(() => undefined);
    const store: GeocodeStore = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      reserveClientQuota: vi.fn(() => never),
      reserveProviderQuota: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
      reserveProviderSlot: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 }))
    };
    const { handle } = handler(store, undefined, { totalDeadlineMs: 20 });

    const outcome = await Promise.race([
      handle(post("Pasadena")),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 150))
    ]);

    expect(outcome).toBeInstanceOf(Response);
    expect((outcome as Response).status).toBe(503);
  });

  test("rejects exhausted per-client quota before cache or upstream work", async () => {
    const store = new RecordingStore(null, { allowed: true, retryAfterMs: 0 }, {
      allowed: false,
      retryAfterSeconds: 42
    });
    const { handle, fetcher } = handler(store);

    const response = await handle(post("Pasadena"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(store.getKeys).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("rejects exhausted provider capacity only after a cache miss", async () => {
    const store = new RecordingStore(
      null,
      { allowed: true, retryAfterMs: 0 },
      { allowed: true, retryAfterSeconds: 0 },
      { allowed: false, retryAfterSeconds: 3_600 }
    );
    const { handle, fetcher } = handler(store);

    const response = await handle(post("Pasadena"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(store.getKeys).toHaveLength(2);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("fails fast with Retry-After when the shared provider queue is saturated", async () => {
    let now = 0;
    const sleep = vi.fn(async (milliseconds: number) => {
      now += milliseconds;
    });
    const store = new RecordingStore(null, { allowed: false, retryAfterMs: 1_000 });
    const { handle, fetcher } = handler(store, undefined, {
      now: () => now,
      sleep,
      queueLimitMs: 2_000
    });

    const response = await handle(post("Pasadena"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1");
    expect(fetcher).not.toHaveBeenCalled();
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  test("uses one total deadline across queueing and the provider request", async () => {
    let now = 0;
    const sleep = vi.fn(async (milliseconds: number) => {
      now += milliseconds;
    });
    const store = new RecordingStore(null, { allowed: false, retryAfterMs: 1_000 });
    const { handle, fetcher } = handler(store, undefined, {
      now: () => now,
      sleep,
      queueLimitMs: 3_000,
      totalDeadlineMs: 1_500
    });

    const response = await handle(post("Pasadena"));

    expect(response.status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  test("memory store enforces the same minimum interval for local development", async () => {
    let now = 10_000;
    const store = new MemoryGeocodeStore({ now: () => now });

    expect(await store.reserveProviderSlot(1_000)).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(await store.reserveProviderSlot(1_000)).toEqual({ allowed: false, retryAfterMs: 1_000 });
    now += 1_000;
    expect(await store.reserveProviderSlot(1_000)).toEqual({ allowed: true, retryAfterMs: 0 });
  });
});
