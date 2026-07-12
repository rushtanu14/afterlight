import { describe, expect, test } from "vitest";
import { trustedHistoricalSourceUrl } from "../src/engine/trustedHistoricalSources";

describe("historical source links", () => {
  test("allows only exact curated HTTPS sources", () => {
    const source = "https://docs.google.com/spreadsheets/d/1Xna6okyL59bk3m6oHphZrN-RWWxOtnBIL0R5EpaZ__4/edit";

    expect(trustedHistoricalSourceUrl(source)).toBe(source);
    expect(trustedHistoricalSourceUrl("http://docs.google.com/spreadsheets/example")).toBeNull();
    expect(trustedHistoricalSourceUrl("javascript:alert(1)")).toBeNull();
    expect(trustedHistoricalSourceUrl("https://evil.example/phish")).toBeNull();
    expect(trustedHistoricalSourceUrl("https://docs.google.com.evil.example/spoof")).toBeNull();
  });
});
