import { describe, expect, test, vi } from "vitest";
import { RedisGeocodeStore, type RedisLike } from "../api/_lib/geocodeStore";
import { createLocalGeocodeHandler, createProductionGeocodeHandler, resolveProviderConfig, resolveRedisConfig } from "../api/_lib/geocodeRuntime";

const ORIGIN = "https://afterlight.test";

function post(query = "Pasadena") {
  return new Request(`${ORIGIN}/api/geocode`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
}

describe("geocoder proxy runtime", () => {
  test("fails closed in production when shared Redis is not configured", async () => {
    const fetcher = vi.fn();
    const handler = createProductionGeocodeHandler({ env: { NODE_ENV: "production" }, fetcher });

    const response = await handler(post());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "proxy_unavailable", message: "Location proxy is temporarily unavailable." }
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("uses the fixed official provider host with a configurable identifying User-Agent", () => {
    expect(resolveProviderConfig({})).toEqual({
      url: "https://nominatim.openstreetmap.org/search",
      userAgent: "Afterlight/0.1 (+https://github.com/rushtanu14/afterlight)"
    });
    expect(resolveProviderConfig({
      GEOCODER_PROVIDER_URL: "https://nominatim.openstreetmap.org/search",
      NOMINATIM_USER_AGENT: "Afterlight/0.2 (+https://afterlight.example)"
    })).toEqual({
      url: "https://nominatim.openstreetmap.org/search",
      userAgent: "Afterlight/0.2 (+https://afterlight.example)"
    });
  });

  test.each([
    "http://nominatim.openstreetmap.org/search",
    "https://user:pass@nominatim.openstreetmap.org/search",
    "https://127.0.0.1/search",
    "https://[::1]/search",
    "https://localhost/search",
    "https://foo.localhost/search",
    "https://localhost./search",
    "https://geo.example/search",
    "https://evil.example/search",
    "https://nominatim.openstreetmap.org/search?q=secret"
  ])("rejects unsafe provider configuration: %s", (url) => {
    expect(() => resolveProviderConfig({ GEOCODER_PROVIDER_URL: url })).toThrow();
  });

  test.each([
    "short",
    "Afterlight/0.1\nInjected",
    "curl/8.0 Afterlight",
    "Mozilla/5.0 Afterlight"
  ])("rejects unsafe or non-identifying provider User-Agent: %s", (userAgent) => {
    expect(() => resolveProviderConfig({ NOMINATIM_USER_AGENT: userAgent })).toThrow();
  });

  test.each([
    "http://shared-redis.example",
    "https://user:pass@shared-redis.example",
    "https://127.0.0.1",
    "https://[::1]",
    "https://localhost.",
    "https://shared-redis.example?token=secret"
  ])("rejects unsafe shared Redis configuration: %s", (url) => {
    expect(() => resolveRedisConfig({
      UPSTASH_REDIS_REST_URL: url,
      UPSTASH_REDIS_REST_TOKEN: "test-token"
    })).toThrow();
  });

  test("accepts an HTTPS shared Redis endpoint with a server-only token", () => {
    expect(resolveRedisConfig({
      UPSTASH_REDIS_REST_URL: "https://shared-redis.example",
      UPSTASH_REDIS_REST_TOKEN: " test-token "
    })).toEqual({ url: "https://shared-redis.example/", token: "test-token" });
  });

  test("uses bounded local state and reuses a coarse cache result in development", async () => {
    const fetcher = vi.fn(async () => Response.json([{
      lat: "34.1478",
      lon: "-118.1445",
      addresstype: "city",
      type: "administrative",
      address: { city: "Pasadena", county: "Los Angeles County", state: "California" }
    }]));
    const handler = createLocalGeocodeHandler({ env: {}, fetcher });

    const first = await handler(post());
    const second = await handler(post());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("parses the atomic Redis provider-slot result", async () => {
    const redis: RedisLike = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => "OK"),
      eval: vi.fn(async () => [0, 750])
    };
    const store = new RedisGeocodeStore(redis);

    expect(await store.reserveProviderSlot(1_000)).toEqual({ allowed: false, retryAfterMs: 750 });
  });

  test("parses separate Redis client and provider quota results under minimized keys", async () => {
    const redis: RedisLike = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => "OK"),
      eval: vi.fn()
        .mockResolvedValueOnce([0, 37])
        .mockResolvedValueOnce([1, 0])
    };
    const store = new RedisGeocodeStore(redis);

    expect(await store.reserveClientQuota("abc123", 20, 60)).toEqual({
      allowed: false,
      retryAfterSeconds: 37
    });
    expect(await store.reserveProviderQuota(2_000, 86_400)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(redis.eval).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      ["afterlight:geocode:v1:quota:client:abc123"],
      [20, 60]
    );
    expect(redis.eval).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      ["afterlight:geocode:v1:quota:provider"],
      [2_000, 86_400]
    );
  });

  test("fails closed on an internally inconsistent provider-slot response", async () => {
    const redis: RedisLike = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => "OK"),
      eval: vi.fn(async () => [0, 0])
    };
    const store = new RedisGeocodeStore(redis);

    await expect(store.reserveProviderSlot(1_000)).rejects.toThrow("Invalid provider slot response");
  });
});
