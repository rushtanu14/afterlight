import type { HistoricalScenarioId } from "../data/replay";
import { historicalScenarios } from "../data/historicalScenarios";
import { sanitizeHouseholdText } from "./privacyText";

export type ScenarioMemory = {
  confirmedIds: string[];
  edits: Record<string, string>;
};

export type MemoryState = {
  version: 1;
  scenarios: Partial<Record<HistoricalScenarioId, ScenarioMemory>>;
};

export type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export const MEMORY_STORAGE_KEY = "afterlight.household-memory.v1";
export const EMPTY_MEMORY_STATE: MemoryState = { version: 1, scenarios: {} };
export const EMPTY_SCENARIO_MEMORY: ScenarioMemory = { confirmedIds: [], edits: {} };
export const MAX_MEMORY_EDIT_LENGTH = 600;
export const MAX_MEMORY_PAYLOAD_LENGTH = 12_000;

const scenarioIds = new Set<HistoricalScenarioId>(["palisades-2025", "eaton-2025"]);
const eventIdsByScenario = new Map(
  historicalScenarios.map((scenario) => [scenario.id, new Set(scenario.events.map((event) => event.id))])
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeScenarioMemory(value: unknown, scenarioId: HistoricalScenarioId): ScenarioMemory | null {
  if (!isRecord(value)) return null;
  const allowedEventIds = eventIdsByScenario.get(scenarioId) ?? new Set<string>();

  const confirmedIds = Array.isArray(value.confirmedIds)
    ? Array.from(new Set(value.confirmedIds.filter((id): id is string => typeof id === "string" && allowedEventIds.has(id))))
    : [];
  const edits = isRecord(value.edits)
    ? Object.fromEntries(
        Object.entries(value.edits)
          .filter((entry): entry is [string, string] => allowedEventIds.has(entry[0]) && typeof entry[1] === "string")
          .map(([eventId, edit]) => [eventId, sanitizeHouseholdText(edit, MAX_MEMORY_EDIT_LENGTH, { trim: false })])
          .filter(([, edit]) => edit.length > 0)
      )
    : {};

  return { confirmedIds, edits };
}

export function sanitizeMemoryState(value: unknown): MemoryState {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.scenarios)) return { version: 1, scenarios: {} };

  const scenarios: MemoryState["scenarios"] = {};
  for (const [scenarioId, scenarioValue] of Object.entries(value.scenarios)) {
    if (!scenarioIds.has(scenarioId as HistoricalScenarioId)) continue;
    const scenario = sanitizeScenarioMemory(scenarioValue, scenarioId as HistoricalScenarioId);
    if (scenario) scenarios[scenarioId as HistoricalScenarioId] = scenario;
  }

  return { version: 1, scenarios };
}

function browserStorage(): MemoryStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadMemoryState(storage: MemoryStorage | null = browserStorage()): MemoryState {
  if (!storage) return { version: 1, scenarios: {} };

  let saved: string | null;
  try {
    saved = storage.getItem(MEMORY_STORAGE_KEY);
  } catch {
    return { version: 1, scenarios: {} };
  }
  if (!saved) return { version: 1, scenarios: {} };
  if (saved.length > MAX_MEMORY_PAYLOAD_LENGTH) {
    try { storage.removeItem(MEMORY_STORAGE_KEY); } catch { /* Best-effort cleanup. */ }
    return { version: 1, scenarios: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved) as unknown;
  } catch {
    try { storage.removeItem(MEMORY_STORAGE_KEY); } catch { /* Best-effort cleanup. */ }
    return { version: 1, scenarios: {} };
  }

  const sanitized = sanitizeMemoryState(parsed);
  const serialized = JSON.stringify(sanitized);
  if (serialized !== saved) {
    try { storage.setItem(MEMORY_STORAGE_KEY, serialized); } catch { /* State remains sanitized in memory. */ }
  }
  return sanitized;
}

export function saveMemoryState(state: MemoryState, storage: MemoryStorage | null = browserStorage()) {
  if (!storage) return false;

  try {
    const serialized = JSON.stringify(sanitizeMemoryState(state));
    if (serialized.length > MAX_MEMORY_PAYLOAD_LENGTH) return false;
    storage.setItem(MEMORY_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function updateScenarioMemory(state: MemoryState, scenarioId: HistoricalScenarioId, update: ScenarioMemory): MemoryState {
  const scenario = sanitizeScenarioMemory(update, scenarioId) ?? { confirmedIds: [], edits: {} };
  return {
    version: 1,
    scenarios: {
      ...state.scenarios,
      [scenarioId]: scenario
    }
  };
}

export function clearScenarioMemory(state: MemoryState, scenarioId: HistoricalScenarioId): MemoryState {
  const { [scenarioId]: _removed, ...scenarios } = state.scenarios;
  return { version: 1, scenarios };
}

export function clearSavedMemory(storage: MemoryStorage | null = browserStorage()) {
  if (!storage) return false;

  try {
    storage.removeItem(MEMORY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
