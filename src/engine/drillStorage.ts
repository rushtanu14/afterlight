import { historicalScenarios } from "../data/historicalScenarios";
import {
  CONSTRAINT_OPTIONS,
  EMPTY_DRILL_STATE,
  isConstraintId,
  isDrillAssignmentComplete,
  isValidIsoDate,
  sanitizeActionNote,
  sanitizeRoleLabel,
  type DrillAssignment,
  type DrillState
} from "./drillPlan";

export type DrillStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export const DRILL_STORAGE_KEY = "afterlight.household-drill.v1";
export const MAX_DRILL_PAYLOAD_LENGTH = 20_000;

const knownTaskIds = new Set([
  "base:official-sources",
  "base:contact-fallback",
  "base:kit-location",
  ...CONSTRAINT_OPTIONS.map((constraint) => `constraint:${constraint.id}`),
  ...historicalScenarios.flatMap((scenario) => scenario.events.map((event) => `lesson:${event.id}`))
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeAssignment(taskId: string, value: unknown): DrillAssignment | null {
  if (!isRecord(value)) return null;
  const ownerRole = sanitizeRoleLabel(typeof value.ownerRole === "string" ? value.ownerRole : "");
  const backupRole = sanitizeRoleLabel(typeof value.backupRole === "string" ? value.backupRole : "");
  const actionNote = sanitizeActionNote(taskId, typeof value.actionNote === "string" ? value.actionNote : "");
  const assignment = { ownerRole, backupRole, actionNote, practiced: false };
  return { ...assignment, practiced: isDrillAssignmentComplete(assignment) && value.practiced === true };
}

export function sanitizeDrillState(value: unknown): DrillState {
  if (!isRecord(value) || value.version !== 1) return { ...EMPTY_DRILL_STATE, constraints: [], assignments: {} };
  const requestedConstraints = Array.isArray(value.constraints) ? value.constraints.filter(isConstraintId) : [];
  const constraints = CONSTRAINT_OPTIONS
    .map((constraint) => constraint.id)
    .filter((constraintId) => requestedConstraints.includes(constraintId));
  const assignments: Record<string, DrillAssignment> = {};
  if (isRecord(value.assignments)) {
    for (const [taskId, assignmentValue] of Object.entries(value.assignments)) {
      if (!knownTaskIds.has(taskId)) continue;
      const assignment = sanitizeAssignment(taskId, assignmentValue);
      if (assignment) assignments[taskId] = assignment;
    }
  }
  return {
    version: 1,
    constraints,
    assignments,
    lastPracticedOn: isValidIsoDate(value.lastPracticedOn) && Object.values(assignments).some((assignment) => assignment.practiced)
      ? value.lastPracticedOn
      : null
  };
}

function browserStorage(): DrillStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadDrillState(storage: DrillStorage | null = browserStorage()): DrillState {
  if (!storage) return { ...EMPTY_DRILL_STATE, constraints: [], assignments: {} };
  let saved: string | null;
  try {
    saved = storage.getItem(DRILL_STORAGE_KEY);
  } catch {
    return { ...EMPTY_DRILL_STATE, constraints: [], assignments: {} };
  }
  if (!saved) return { ...EMPTY_DRILL_STATE, constraints: [], assignments: {} };
  if (saved.length > MAX_DRILL_PAYLOAD_LENGTH) {
    try { storage.removeItem(DRILL_STORAGE_KEY); } catch { /* Best-effort cleanup. */ }
    return { ...EMPTY_DRILL_STATE, constraints: [], assignments: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved) as unknown;
  } catch {
    try { storage.removeItem(DRILL_STORAGE_KEY); } catch { /* Best-effort cleanup. */ }
    return { ...EMPTY_DRILL_STATE, constraints: [], assignments: {} };
  }

  const sanitized = sanitizeDrillState(parsed);
  const serialized = JSON.stringify(sanitized);
  if (serialized !== saved) {
    try { storage.setItem(DRILL_STORAGE_KEY, serialized); } catch { /* State remains sanitized in memory. */ }
  }
  return sanitized;
}

export function saveDrillState(state: DrillState, storage: DrillStorage | null = browserStorage()) {
  if (!storage) return false;
  try {
    const serialized = JSON.stringify(sanitizeDrillState(state));
    if (serialized.length > MAX_DRILL_PAYLOAD_LENGTH) return false;
    storage.setItem(DRILL_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearSavedDrill(storage: DrillStorage | null = browserStorage()) {
  if (!storage) return false;
  try {
    storage.removeItem(DRILL_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
