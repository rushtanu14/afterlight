import { afterEach, describe, expect, test, vi } from "vitest";
import {
  clearSavedMemory,
  clearScenarioMemory,
  EMPTY_MEMORY_STATE,
  loadMemoryState,
  MAX_MEMORY_EDIT_LENGTH,
  MAX_MEMORY_PAYLOAD_LENGTH,
  sanitizeMemoryState,
  saveMemoryState,
  updateScenarioMemory,
  type MemoryStorage
} from "../src/engine/memoryStorage";

function createStorage(initialValue: string | null = null): MemoryStorage & { value: string | null } {
  return {
    value: initialValue,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
    removeItem() {
      this.value = null;
    }
  };
}

describe("case-scoped household memory", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("starts with no confirmed failures", () => {
    expect(EMPTY_MEMORY_STATE).toEqual({ version: 1, scenarios: {} });
    expect(loadMemoryState(createStorage())).toEqual(EMPTY_MEMORY_STATE);
  });

  test("keeps confirmations and raw edits scoped to one historical scenario", () => {
    const next = updateScenarioMemory(EMPTY_MEMORY_STATE, "palisades-2025", {
      confirmedIds: ["palisades-warning-zones"],
      edits: { "palisades-warning-zones": "Keep the mobility kit checklist with this historical lesson. " }
    });

    expect(next.scenarios["palisades-2025"]).toEqual({
      confirmedIds: ["palisades-warning-zones"],
      edits: { "palisades-warning-zones": "Keep the mobility kit checklist with this historical lesson. " }
    });
    expect(next.scenarios["eaton-2025"]).toBeUndefined();
    expect(EMPTY_MEMORY_STATE).toEqual({ version: 1, scenarios: {} });
  });

  test("sanitizes malformed persisted data without inventing confirmations", () => {
    expect(
      sanitizeMemoryState({
        version: 1,
        scenarios: {
          "palisades-2025": {
            confirmedIds: ["palisades-warning-zones", "palisades-warning-zones", "unknown-row", 42],
            edits: { "palisades-warning-zones": "raw edit ", "unknown-row": "ignore", bad: 42 }
          },
          unknown: { confirmedIds: ["x"], edits: { x: "ignore" } }
        }
      })
    ).toEqual({
      version: 1,
      scenarios: {
        "palisades-2025": {
          confirmedIds: ["palisades-warning-zones"],
          edits: { "palisades-warning-zones": "raw edit " }
        }
      }
    });
    expect(sanitizeMemoryState({ version: 2, scenarios: {} })).toEqual(EMPTY_MEMORY_STATE);
  });

  test("caps persisted text and drops IDs that do not belong to the scenario", () => {
    const state = sanitizeMemoryState({
      version: 1,
      scenarios: {
        "eaton-2025": {
          confirmedIds: ["eaton-first-order", "palisades-warning-zones", "invented"],
          edits: {
            "eaton-first-order": "x".repeat(MAX_MEMORY_EDIT_LENGTH + 25),
            "palisades-warning-zones": "wrong case",
            invented: "not a real row"
          }
        }
      }
    });

    expect(state.scenarios["eaton-2025"]?.confirmedIds).toEqual(["eaton-first-order"]);
    expect(state.scenarios["eaton-2025"]?.edits).toEqual({
      "eaton-first-order": "x".repeat(MAX_MEMORY_EDIT_LENGTH)
    });
  });

  test("drops private household details from memory edits before persistence", () => {
    const state = sanitizeMemoryState({
      version: 1,
      scenarios: {
        "palisades-2025": {
          confirmedIds: ["palisades-warning-zones"],
          edits: {
            "palisades-warning-zones": "Meet at 123 Main Street after calling 555-123-4567",
            "palisades-order-to-pch": "Use the same out-of-area check-in role."
          }
        }
      }
    });

    expect(state.scenarios["palisades-2025"]?.edits).toEqual({
      "palisades-order-to-pch": "Use the same out-of-area check-in role."
    });
  });

  test("rewrites legacy memory after removing private details", () => {
    const storage = createStorage(JSON.stringify({
      version: 1,
      scenarios: {
        "palisades-2025": {
          confirmedIds: ["palisades-warning-zones"],
          edits: {
            "palisades-warning-zones": "Call +44 20 7946 0958 with PIN 1234",
            "palisades-order-to-pch": "Use the out-of-area check-in role."
          }
        }
      }
    }));

    expect(loadMemoryState(storage).scenarios["palisades-2025"]?.edits).toEqual({
      "palisades-order-to-pch": "Use the out-of-area check-in role."
    });
    expect(storage.value).not.toContain("+44 20 7946 0958");
    expect(storage.value).not.toContain("PIN 1234");
  });

  test("keeps ordinary numbered instructions while rejecting broader obvious secrets", () => {
    const state = sanitizeMemoryState({
      version: 1,
      scenarios: {
        "palisades-2025": {
          confirmedIds: [],
          edits: {
            "palisades-warning-zones": "Bring 2, 3 backup batteries and 2.5, 3.5 gallon water containers. Pin alerts to the home screen.",
            "palisades-order-to-pch": "Call 555-1234; door password sunset",
            "palisades-fire-reported": "Location 34, -118"
          }
        }
      }
    });

    expect(state.scenarios["palisades-2025"]?.edits).toEqual({
      "palisades-warning-zones": "Bring 2, 3 backup batteries and 2.5, 3.5 gallon water containers. Pin alerts to the home screen."
    });
  });

  test("rejects integer and short-decimal coordinate pairs when they are coordinate-like", () => {
    const state = sanitizeMemoryState({
      version: 1,
      scenarios: {
        "palisades-2025": {
          confirmedIds: [],
          edits: {
            "palisades-warning-zones": "Meet near 34, -118",
            "palisades-order-to-pch": "Meet near 34.05, -118.24",
            "palisades-fire-reported": "Coordinates: 34.05, 118.24"
          }
        }
      }
    });

    expect(state.scenarios["palisades-2025"]?.edits).toEqual({});
  });

  test("rejects an oversized persisted payload before parsing it", () => {
    const oversized = createStorage("x".repeat(MAX_MEMORY_PAYLOAD_LENGTH + 1));

    expect(loadMemoryState(oversized)).toEqual(EMPTY_MEMORY_STATE);
    expect(oversized.value).toBeNull();
  });

  test("clears one case immutably and can remove all persisted memory", () => {
    const bothCases = sanitizeMemoryState({
      version: 1,
      scenarios: {
        "palisades-2025": { confirmedIds: ["palisades-warning-zones"], edits: {} },
        "eaton-2025": { confirmedIds: ["eaton-first-order"], edits: {} }
      }
    });
    const withoutPalisades = clearScenarioMemory(bothCases, "palisades-2025");

    expect(withoutPalisades.scenarios["palisades-2025"]).toBeUndefined();
    expect(withoutPalisades.scenarios["eaton-2025"]).toBeDefined();
    expect(bothCases.scenarios["palisades-2025"]).toBeDefined();

    const storage = createStorage(JSON.stringify(bothCases));
    expect(clearSavedMemory(storage)).toBe(true);
    expect(storage.value).toBeNull();
  });

  test("round-trips the versioned payload and survives unavailable storage", () => {
    const storage = createStorage();
    const state = updateScenarioMemory(EMPTY_MEMORY_STATE, "eaton-2025", {
      confirmedIds: ["eaton-first-order"],
      edits: { "eaton-first-order": "Keep the pickup-partner checklist with this source row." }
    });

    expect(saveMemoryState(state, storage)).toBe(true);
    expect(loadMemoryState(storage)).toEqual(state);

    const unavailable: MemoryStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      }
    };
    expect(loadMemoryState(unavailable)).toEqual(EMPTY_MEMORY_STATE);
    expect(saveMemoryState(state, unavailable)).toBe(false);
  });

  test("survives a browser that blocks access to the localStorage property", () => {
    const blockedWindow = {};
    Object.defineProperty(blockedWindow, "localStorage", {
      get() {
        throw new Error("blocked");
      }
    });
    vi.stubGlobal("window", blockedWindow);

    expect(() => loadMemoryState()).not.toThrow();
    expect(loadMemoryState()).toEqual(EMPTY_MEMORY_STATE);
  });
});
