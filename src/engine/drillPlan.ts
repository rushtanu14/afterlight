import { containsPrivateHouseholdDetail, normalizeSingleLineText, sanitizeHouseholdText } from "./privacyText";

export type ConstraintId = "mobility" | "medications" | "pets" | "power" | "transport";

export type DrillAssignment = {
  ownerRole: string;
  backupRole: string;
  actionNote: string;
  practiced: boolean;
};

export type DrillState = {
  version: 1;
  constraints: ConstraintId[];
  assignments: Record<string, DrillAssignment>;
  lastPracticedOn: string | null;
};

export type HistoricalLessonInput = {
  id: string;
  scenarioName: string;
  eventTitle: string;
  lesson: string;
  sourceLabel: string;
  adapted: boolean;
};

export type DrillTask = {
  id: string;
  kind: "base" | "constraint" | "historical_lesson";
  title: string;
  detail: string;
  sourceLabel: string;
  actionPrompt: string;
  actionOptions: readonly string[];
};

export type DrillSummary = {
  total: number;
  unassigned: number;
  assigned: number;
  practiced: number;
  historicalLessons: number;
  lastPracticedOn: string | null;
};

export const MAX_DRILL_ROLE_LENGTH = 48;
export const MAX_DRILL_ACTION_LENGTH = 120;
const HISTORICAL_ACTION_OPTIONS = [
  "Practice a communication handoff",
  "Practice an equipment handoff",
  "Practice a timing or access check",
  "Practice a backup-role handoff"
] as const;
export const EMPTY_DRILL_STATE: DrillState = {
  version: 1,
  constraints: [],
  assignments: {},
  lastPracticedOn: null
};

export const CONSTRAINT_OPTIONS: ReadonlyArray<{ id: ConstraintId; label: string; description: string }> = [
  { id: "mobility", label: "Mobility support", description: "Someone may need physical assistance or extra loading time during a drill." },
  { id: "medications", label: "Medication continuity", description: "The household needs a non-sensitive refill and packing routine." },
  { id: "pets", label: "Pets or service animals", description: "Carriers, leashes, records, and a responsible handler need practice." },
  { id: "power", label: "Essential power", description: "A device or mobility aid needs a tested charging fallback." },
  { id: "transport", label: "Transportation backup", description: "The household needs more than one transportation option or contact." }
];

const baseTasks: DrillTask[] = [
  {
    id: "base:official-sources",
    kind: "base",
    title: "Choose official information channels",
    detail: "Write down which local agency and alert channel the household will verify during an incident. Do not rely on Afterlight as an alert service.",
    sourceLabel: "Preparedness baseline",
    actionPrompt: "Choose the official-channel pattern the household will complete in its official plan.",
    actionOptions: ["County alerts plus local fire agency", "Local alerts plus battery radio"]
  },
  {
    id: "base:contact-fallback",
    kind: "base",
    title: "Assign the household check-in",
    detail: "Choose a primary and backup role for confirming who has checked in, including an out-of-area fallback method.",
    sourceLabel: "Preparedness baseline",
    actionPrompt: "Choose a check-in pattern without storing names or contact details.",
    actionOptions: ["Group message plus out-of-area check-in", "Call tree plus out-of-area check-in"]
  },
  {
    id: "base:kit-location",
    kind: "base",
    title: "Inspect the grab-and-go kit",
    detail: "Agree on a visible kit location and practice who inspects documents, water, lights, and charging supplies before fire season.",
    sourceLabel: "Preparedness baseline",
    actionPrompt: "Choose a coarse kit pattern; keep exact locations in the household's official plan.",
    actionOptions: ["Visible indoor kit plus seasonal check", "Vehicle kit plus seasonal check", "Split indoor and vehicle kits"]
  }
];

const constraintTasks: Record<ConstraintId, DrillTask> = {
  mobility: {
    id: "constraint:mobility",
    kind: "constraint",
    title: "Practice the mobility-assistance handoff",
    detail: "Assign a primary helper and a backup role, then rehearse the non-medical physical steps that take extra time.",
    sourceLabel: "Household constraint · mobility support",
    actionPrompt: "Choose the non-medical handoff pattern to rehearse.",
    actionOptions: ["Equipment handoff plus loading rehearsal", "Helper handoff plus extra-time rehearsal"]
  },
  medications: {
    id: "constraint:medications",
    kind: "constraint",
    title: "Rehearse the medication packing check",
    detail: "Assign who checks the non-sensitive medication list and refill status. Follow clinician and pharmacy guidance for storage and supply questions.",
    sourceLabel: "Household constraint · medication continuity",
    actionPrompt: "Choose a continuity pattern without storing medication names or doses.",
    actionOptions: ["Refill-status check plus packing handoff", "List check plus pharmacy follow-up role"]
  },
  pets: {
    id: "constraint:pets",
    kind: "constraint",
    title: "Practice the animal handoff",
    detail: "Assign who gathers carriers, leashes, food, and records, plus a backup role if the primary handler is away.",
    sourceLabel: "Household constraint · pets or service animals",
    actionPrompt: "Choose the animal handoff pattern; keep exact locations outside Afterlight.",
    actionOptions: ["Carrier and leash handoff", "Animal supplies and records handoff"]
  },
  power: {
    id: "constraint:power",
    kind: "constraint",
    title: "Test the essential-device power fallback",
    detail: "Assign who checks approved chargers and backup power for essential devices without storing device or medical details here.",
    sourceLabel: "Household constraint · essential power",
    actionPrompt: "Choose a power-check pattern without storing device details.",
    actionOptions: ["Approved charger plus backup-power check", "Charging handoff plus seasonal battery check"]
  },
  transport: {
    id: "constraint:transport",
    kind: "constraint",
    title: "Confirm two transportation options",
    detail: "Assign who verifies a primary and backup transportation contact before an incident. This is not a route recommendation.",
    sourceLabel: "Household constraint · transportation backup",
    actionPrompt: "Choose a transportation pattern without storing routes, names, or contact details.",
    actionOptions: ["Household ride plus outside backup role", "Two outside transportation roles"]
  }
};

export function sanitizeRoleLabel(value: string) {
  return sanitizeHouseholdText(value, MAX_DRILL_ROLE_LENGTH);
}

export function getDrillActionOptions(taskId: string): readonly string[] {
  if (taskId.startsWith("lesson:")) return HISTORICAL_ACTION_OPTIONS;
  const task = [...baseTasks, ...Object.values(constraintTasks)].find((candidate) => candidate.id === taskId);
  return task?.actionOptions ?? [];
}

export function isAllowedDrillActionNote(taskId: string, value: string) {
  const normalized = normalizeSingleLineText(value, MAX_DRILL_ACTION_LENGTH).trim();
  return normalized === "" || getDrillActionOptions(taskId).includes(normalized);
}

export function sanitizeActionNote(taskId: string, value: string) {
  const sanitized = normalizeSingleLineText(value, MAX_DRILL_ACTION_LENGTH).trim();
  return isAllowedDrillActionNote(taskId, sanitized) ? sanitized : "";
}

export function isConstraintId(value: unknown): value is ConstraintId {
  return typeof value === "string" && CONSTRAINT_OPTIONS.some((constraint) => constraint.id === value);
}

export function isDrillTaskId(value: unknown): value is string {
  return typeof value === "string" && /^(?:base|constraint|lesson):[a-z0-9][a-z0-9-]{0,95}$/.test(value);
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function isDrillAssignmentComplete(assignment: DrillAssignment | undefined) {
  return Boolean(
    assignment?.ownerRole.trim() &&
    assignment.backupRole.trim() &&
    assignment.actionNote.trim()
  );
}

export function toggleDrillConstraint(state: DrillState, constraintId: ConstraintId, selected: boolean): DrillState {
  if (state.constraints.includes(constraintId) === selected) return state;
  const constraints = selected
    ? CONSTRAINT_OPTIONS.map((constraint) => constraint.id).filter((id) => id === constraintId || state.constraints.includes(id))
    : state.constraints.filter((id) => id !== constraintId);
  const taskId = `constraint:${constraintId}`;
  const assignments = selected
    ? { ...state.assignments }
    : Object.fromEntries(Object.entries(state.assignments).filter(([id]) => id !== taskId));
  return { ...state, constraints, assignments, lastPracticedOn: null };
}

export function updateDrillAssignment(
  state: DrillState,
  taskId: string,
  update: Partial<DrillAssignment>
): DrillState {
  if (!isDrillTaskId(taskId)) return state;
  const current = state.assignments[taskId] ?? { ownerRole: "", backupRole: "", actionNote: "", practiced: false };
  const ownerRoleDraft = normalizeSingleLineText(update.ownerRole ?? current.ownerRole, MAX_DRILL_ROLE_LENGTH);
  const backupRoleDraft = normalizeSingleLineText(update.backupRole ?? current.backupRole, MAX_DRILL_ROLE_LENGTH);
  const ownerRole = containsPrivateHouseholdDetail(ownerRoleDraft) ? "" : ownerRoleDraft;
  const backupRole = containsPrivateHouseholdDetail(backupRoleDraft) ? "" : backupRoleDraft;
  const requestedActionNote = normalizeSingleLineText(update.actionNote ?? current.actionNote, MAX_DRILL_ACTION_LENGTH).trim();
  const actionNote = update.actionNote === undefined || isAllowedDrillActionNote(taskId, requestedActionNote)
    ? requestedActionNote
    : current.actionNote;
  const detailsChanged = ownerRole !== current.ownerRole || backupRole !== current.backupRole || actionNote !== current.actionNote;
  const candidate = { ownerRole, backupRole, actionNote, practiced: false };
  const practiced = isDrillAssignmentComplete(candidate)
    ? (update.practiced ?? (detailsChanged ? false : current.practiced))
    : false;
  const practiceChanged = practiced !== current.practiced;
  return {
    ...state,
    lastPracticedOn: detailsChanged || practiceChanged ? null : state.lastPracticedOn,
    assignments: {
      ...state.assignments,
      [taskId]: { ownerRole, backupRole, actionNote, practiced }
    }
  };
}

export function removeDrillAssignments(state: DrillState, taskIds: string[]): DrillState {
  const removals = new Set(taskIds);
  const hasStoredAssignment = Object.keys(state.assignments).some((taskId) => removals.has(taskId));
  if (!hasStoredAssignment && state.lastPracticedOn === null) return state;
  return {
    ...state,
    lastPracticedOn: null,
    assignments: hasStoredAssignment
      ? Object.fromEntries(Object.entries(state.assignments).filter(([taskId]) => !removals.has(taskId)))
      : state.assignments
  };
}

export function reconcileDrillAssignments(state: DrillState, currentTaskIds: Iterable<string>): DrillState {
  const currentIds = new Set(currentTaskIds);
  const entries = Object.entries(state.assignments);
  const currentEntries = entries.filter(([taskId]) => currentIds.has(taskId));
  if (currentEntries.length === entries.length) return state;
  return {
    ...state,
    assignments: Object.fromEntries(currentEntries),
    lastPracticedOn: null
  };
}

export function invalidateDrillPractice(state: DrillState, taskIds: string[] = []): DrillState {
  const invalidatedIds = new Set(taskIds);
  let assignmentChanged = false;
  const assignments = Object.fromEntries(Object.entries(state.assignments).map(([taskId, assignment]) => {
    if (!invalidatedIds.has(taskId) || !assignment.practiced) return [taskId, assignment];
    assignmentChanged = true;
    return [taskId, { ...assignment, practiced: false }];
  }));
  if (!assignmentChanged && state.lastPracticedOn === null) return state;
  return { ...state, assignments, lastPracticedOn: null };
}

export function buildDrillTasks(state: DrillState, historicalLessons: HistoricalLessonInput[]): DrillTask[] {
  const constraints = CONSTRAINT_OPTIONS
    .filter((constraint) => state.constraints.includes(constraint.id))
    .map((constraint) => constraintTasks[constraint.id]);
  const seenLessons = new Set<string>();
  const lessons = historicalLessons.flatMap((lesson) => {
    if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(lesson.id) || seenLessons.has(lesson.id)) return [];
    seenLessons.add(lesson.id);
    return [{
      id: `lesson:${lesson.id}`,
      kind: "historical_lesson" as const,
      title: `Practice lesson: ${lesson.eventTitle}`,
      detail: lesson.lesson,
      sourceLabel: lesson.adapted
        ? `${lesson.scenarioName} · Household adaptation based on ${lesson.sourceLabel}`
        : `${lesson.scenarioName} · Afterlight takeaway based on ${lesson.sourceLabel}`,
      actionPrompt: "Choose the observable handoff or check the household will rehearse from this lesson.",
      actionOptions: HISTORICAL_ACTION_OPTIONS
    }];
  });
  return [...baseTasks, ...constraints, ...lessons];
}

export function summarizeDrill(tasks: DrillTask[], state: DrillState): DrillSummary {
  let unassigned = 0;
  let assigned = 0;
  let practiced = 0;
  for (const task of tasks) {
    const assignment = state.assignments[task.id];
    if (!isDrillAssignmentComplete(assignment)) unassigned += 1;
    else {
      assigned += 1;
      if (assignment?.practiced) practiced += 1;
    }
  }
  return {
    total: tasks.length,
    unassigned,
    assigned,
    practiced,
    historicalLessons: tasks.filter((task) => task.kind === "historical_lesson").length,
    lastPracticedOn: state.lastPracticedOn
  };
}

export function recordDrillPractice(state: DrillState, date: string): DrillState {
  if (!isValidIsoDate(date) || !Object.values(state.assignments).some((assignment) => assignment.practiced)) return state;
  return { ...state, lastPracticedOn: date };
}
