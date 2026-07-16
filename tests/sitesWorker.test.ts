import { describe, expect, test, vi } from "vitest";
import worker, { normalizeCloudflareGeocodeRequest } from "../worker/index";

function makeEnvironment() {
  return {
    ASSETS: {
      fetch: vi.fn(async (request: Request) =>
        new Response(new URL(request.url).pathname, { status: 200 })
      )
    }
  };
}

describe("Sites Worker", () => {
  test("uses only Cloudflare's trusted client address for geocoder quotas", () => {
    const request = normalizeCloudflareGeocodeRequest(new Request("https://afterlight.test/api/geocode", {
      headers: {
        "CF-Connecting-IP": "203.0.113.7",
        "X-Forwarded-For": "198.51.100.3",
        "X-Real-IP": "198.51.100.4",
        "X-Vercel-Forwarded-For": "198.51.100.5"
      }
    }));

    expect(request.headers.get("x-vercel-forwarded-for")).toBe("203.0.113.7");
    expect(request.headers.get("x-forwarded-for")).toBeNull();
    expect(request.headers.get("x-real-ip")).toBeNull();
  });

  test("serves the app with the deployment security headers", async () => {
    const environment = makeEnvironment();
    const response = await worker.fetch(new Request("https://afterlight.test/"), environment);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("/");
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  test("routes geocoding and fails closed without shared Redis", async () => {
    const environment = makeEnvironment();
    const response = await worker.fetch(new Request("https://afterlight.test/api/geocode", {
      method: "POST",
      headers: {
        Origin: "https://afterlight.test",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: "Pasadena" })
    }), environment);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "proxy_unavailable" }
    });
    expect(environment.ASSETS.fetch).not.toHaveBeenCalled();
  });
});
