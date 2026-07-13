import { describe, expect, test, vi } from "vitest";
import { MemoryGeocodeStore, RedisGeocodeStore, type RedisLike } from "../api/_lib/geocodeStore";

describe("geocoder stores", () => {
  test("bounds, expires, and defensively copies local cache entries", async () => {
    let now = 1_000;
    const store = new MemoryGeocodeStore({ now: () => now, maxEntries: 2 });
    const first = { kind: "location" as const, location: { label: "Pasadena", latitude: 34.1, longitude: -118.1 } };

    await store.set("first", first, 10);
    await store.set("second", { kind: "not_found" }, 10);
    const copy = await store.get("first");
    expect(copy).toEqual(first);
    if (copy?.kind === "location") copy.location.label = "changed";
    expect(await store.get("first")).toEqual(first);

    await store.set("third", { kind: "not_found" }, 10);
    expect(await store.get("first")).toBeNull();
    now += 10_000;
    expect(await store.get("second")).toBeNull();
  });

  test("validates Redis cache values before returning them", async () => {
    const redis: RedisLike = {
      get: vi.fn()
        .mockResolvedValueOnce({ kind: "location", location: { label: " Pasadena ", latitude: 34.1, longitude: -118.1 } })
        .mockResolvedValueOnce({ kind: "location", location: { label: "", latitude: 999, longitude: 0 } })
        .mockResolvedValueOnce({ kind: "unknown" }),
      set: vi.fn(async () => "OK"),
      eval: vi.fn(async () => [1, 0])
    };
    const store = new RedisGeocodeStore(redis);

    expect(await store.get("valid")).toEqual({ kind: "location", location: { label: "Pasadena", latitude: 34.1, longitude: -118.1 } });
    expect(await store.get("invalid-location")).toBeNull();
    expect(await store.get("invalid-kind")).toBeNull();
    await store.set("missing", { kind: "not_found" }, 300);
    expect(redis.set).toHaveBeenCalledWith("missing", { kind: "not_found" }, { ex: 300 });
    expect(await store.reserveProviderSlot(1_000)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  test("enforces independent client and provider quotas without storing raw client identifiers", async () => {
    let now = 0;
    const store = new MemoryGeocodeStore({ now: () => now });
    const clientQuota = (clientKey: string) => store.reserveClientQuota(clientKey, 2, 60);
    const providerQuota = () => store.reserveProviderQuota(3, 86_400);

    expect(await clientQuota("hashed-a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await clientQuota("hashed-a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await clientQuota("hashed-a")).toMatchObject({ allowed: false });
    expect(await clientQuota("hashed-b")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await providerQuota()).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await providerQuota()).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await providerQuota()).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await providerQuota()).toMatchObject({ allowed: false });

    now += 60_000;
    expect(await clientQuota("hashed-a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await providerQuota()).toMatchObject({ allowed: false });
    now += 86_400_000;
    expect(await providerQuota()).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});
