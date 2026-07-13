import { describe, expect, test } from "vitest";
import { GET, POST, maxDuration } from "../api/geocode";

const ORIGIN = "https://afterlight.test";

describe("Vercel geocode route", () => {
  test("exports a bounded Web Handler and denies GET", async () => {
    const response = await GET(new Request(`${ORIGIN}/api/geocode`, { method: "GET" }));

    expect(maxDuration).toBe(10);
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  test("fails closed when deployed storage configuration is absent", async () => {
    const response = await POST(new Request(`${ORIGIN}/api/geocode`, {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Pasadena" })
    }));

    expect(response.status).toBe(503);
  });
});
