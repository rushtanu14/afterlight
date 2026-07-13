import { afterEach, describe, expect, test, vi } from "vitest";
import { EMPTY_DRILL_STATE, MAX_DRILL_ROLE_LENGTH, type DrillState } from "../src/engine/drillPlan";
import {
  DRILL_STORAGE_KEY,
  MAX_DRILL_PAYLOAD_LENGTH,
  clearSavedDrill,
  loadDrillState,
  sanitizeDrillState,
  saveDrillState,
  type DrillStorage
} from "../src/engine/drillStorage";

function createStorage(initialValue: string | null = null): DrillStorage & { value: string | null; lastKey: string | null } {
  return {
    value: initialValue,
    lastKey: null,
    getItem(key) {
      this.lastKey = key;
      return this.value;
    },
    setItem(key, value) {
      this.lastKey = key;
      this.value = value;
    },
    removeItem(key) {
      this.lastKey = key;
      this.value = null;
    }
  };
}

describe("household drill storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("starts empty under a separate versioned key", () => {
    const storage = createStorage();

    expect(loadDrillState(storage)).toEqual(EMPTY_DRILL_STATE);
    expect(storage.lastKey).toBe(DRILL_STORAGE_KEY);
    expect(DRILL_STORAGE_KEY).toBe("afterlight.household-drill.v1");
  });

  test("sanitizes constraints, assignments, role labels, and practice dates", () => {
    const state = sanitizeDrillState({
      version: 1,
      constraints: ["pets", "pets", "unknown", "mobility"],
      assignments: {
        "base:official-sources": {
          ownerRole: `  Alert\nchecker ${"x".repeat(80)} `,
          backupRole: " Backup role ",
          actionNote: "County alerts plus local fire agency",
          practiced: true
        },
        "constraint:pets": { ownerRole: "", backupRole: "Pet backup", actionNote: "Carrier and leash handoff", practiced: true },
        "base:contact-fallback": { ownerRole: "Check-in lead", backupRole: "Backup", actionNote: "Call 555-123-4567", practiced: true },
        "base:invented": { ownerRole: "Ignore", backupRole: "", actionNote: "Ignore", practiced: true },
        "lesson:palisades-warning-zones": { ownerRole: "Lesson lead", backupRole: "", actionNote: "Practice a communication handoff", practiced: false }
      },
      lastPracticedOn: "07/12/2026"
    });

    expect(state.constraints).toEqual(["mobility", "pets"]);
    expect(state.assignments["base:official-sources"]?.ownerRole.length).toBeLessThanOrEqual(MAX_DRILL_ROLE_LENGTH);
    expect(state.assignments["base:official-sources"]?.actionNote).toBe("County alerts plus local fire agency");
    expect(state.assignments["base:official-sources"]?.ownerRole).not.toMatch(/[\r\n]/);
    expect(state.assignments["constraint:pets"]?.practiced).toBe(false);
    expect(state.assignments["base:contact-fallback"]?.actionNote).toBe("");
    expect(state.assignments["base:contact-fallback"]?.practiced).toBe(false);
    expect(state.assignments["base:invented"]).toBeUndefined();
    expect(state.assignments["lesson:palisades-warning-zones"]?.ownerRole).toBe("Lesson lead");
    expect(state.lastPracticedOn).toBeNull();
  });

  test("round-trips bounded drill state", () => {
    const storage = createStorage();
    const state: DrillState = {
      version: 1,
      constraints: ["power"],
      assignments: {
        "constraint:power": {
          ownerRole: "Power lead",
          backupRole: "Backup lead",
          actionNote: "Approved charger plus backup-power check",
          practiced: true
        }
      },
      lastPracticedOn: "2026-07-12"
    };

    expect(saveDrillState(state, storage)).toBe(true);
    expect(storage.lastKey).toBe(DRILL_STORAGE_KEY);
    expect(loadDrillState(storage)).toEqual(state);
  });

  test("rejects oversized or malformed payloads", () => {
    expect(loadDrillState(createStorage("x".repeat(MAX_DRILL_PAYLOAD_LENGTH + 1)))).toEqual(EMPTY_DRILL_STATE);
    expect(loadDrillState(createStorage("{"))).toEqual(EMPTY_DRILL_STATE);
    expect(sanitizeDrillState({ version: 2, constraints: [], assignments: {} })).toEqual(EMPTY_DRILL_STATE);
  });

  test("drops a date when sanitization leaves no practiced handoff", () => {
    const sanitized = sanitizeDrillState({
      version: 1,
      constraints: [],
      assignments: {
        "base:official-sources": {
          ownerRole: "Alert checker",
          backupRole: "Backup adult",
          actionNote: "Meet at 123 Main Street",
          practiced: true
        }
      },
      lastPracticedOn: "2026-07-12"
    });

    expect(sanitized.assignments["base:official-sources"]?.practiced).toBe(false);
    expect(sanitized.lastPracticedOn).toBeNull();
  });

  test("drops malformed assignment shapes and non-array constraints", () => {
    const sanitized = sanitizeDrillState({
      version: 1,
      constraints: "pets",
      assignments: {
        "base:official-sources": "not an assignment",
        "base:contact-fallback": {
          ownerRole: 42,
          backupRole: null,
          actionNote: ["not", "text"],
          practiced: true
        }
      },
      lastPracticedOn: null
    });

    expect(sanitized.constraints).toEqual([]);
    expect(sanitized.assignments["base:official-sources"]).toBeUndefined();
    expect(sanitized.assignments["base:contact-fallback"]).toEqual({
      ownerRole: "",
      backupRole: "",
      actionNote: "",
      practiced: false
    });
  });

  test("handles explicit null storage and blocked browser storage access", () => {
    expect(loadDrillState(null)).toEqual(EMPTY_DRILL_STATE);
    expect(saveDrillState(EMPTY_DRILL_STATE, null)).toBe(false);
    expect(clearSavedDrill(null)).toBe(false);

    const blockedWindow = {};
    Object.defineProperty(blockedWindow, "localStorage", {
      get() {
        throw new Error("blocked");
      }
    });
    vi.stubGlobal("window", blockedWindow);

    expect(loadDrillState()).toEqual(EMPTY_DRILL_STATE);
  });

  test("survives unavailable storage and clears only the drill key", () => {
    const unavailable: DrillStorage = {
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
    const storage = createStorage(JSON.stringify({ version: 1, constraints: [], assignments: {}, lastPracticedOn: null }));

    expect(loadDrillState(unavailable)).toEqual(EMPTY_DRILL_STATE);
    expect(saveDrillState(EMPTY_DRILL_STATE, unavailable)).toBe(false);
    expect(clearSavedDrill(unavailable)).toBe(false);
    expect(clearSavedDrill(storage)).toBe(true);
    expect(storage.lastKey).toBe(DRILL_STORAGE_KEY);
    expect(storage.value).toBeNull();
  });
});
