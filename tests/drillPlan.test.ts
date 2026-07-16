import { describe, expect, test } from "vitest";
import {
  EMPTY_DRILL_STATE,
  buildDrillTasks,
  invalidateDrillPractice,
  isAllowedDrillActionNote,
  reconcileDrillAssignments,
  recordDrillPractice,
  removeDrillAssignments,
  summarizeDrill,
  toggleDrillConstraint,
  updateDrillAssignment,
  type HistoricalLessonInput
} from "../src/engine/drillPlan";

const historicalLessons: HistoricalLessonInput[] = [
  {
    id: "palisades-warning-zones",
    scenarioName: "Palisades Fire",
    eventTitle: "Evacuation warning zones expanded",
    lesson: "Decide who checks on the mobility-limited household member.",
    sourceLabel: "FSRI timeline workbook",
    adapted: true
  },
  {
    id: "palisades-warning-zones",
    scenarioName: "Palisades Fire",
    eventTitle: "Duplicate should be ignored",
    lesson: "Duplicate",
    sourceLabel: "Duplicate",
    adapted: false
  }
];

describe("household drill plan", () => {
  test("builds deterministic base, constraint, and attributable historical tasks", () => {
    const state = toggleDrillConstraint(
      toggleDrillConstraint(EMPTY_DRILL_STATE, "mobility", true),
      "pets",
      true
    );

    const tasks = buildDrillTasks(state, historicalLessons);

    expect(tasks.map((task) => task.id)).toEqual([
      "base:official-sources",
      "base:contact-fallback",
      "base:kit-location",
      "constraint:mobility",
      "constraint:pets",
      "lesson:palisades-warning-zones"
    ]);
    expect(tasks.find((task) => task.id === "constraint:mobility")).toMatchObject({
      kind: "constraint",
      sourceLabel: "Household constraint · mobility support"
    });
    expect(tasks.find((task) => task.id === "lesson:palisades-warning-zones")).toMatchObject({
      kind: "historical_lesson",
      sourceLabel: "Palisades Fire · Household adaptation based on FSRI timeline workbook",
      detail: "Decide who checks on the mobility-limited household member.",
      actionPrompt: "Choose the observable handoff or check the household will rehearse from this lesson."
    });
  });

  test("labels built-in interpretations as Afterlight takeaways rather than official source text", () => {
    const tasks = buildDrillTasks(EMPTY_DRILL_STATE, [{
      id: "eaton-default-takeaway",
      scenarioName: "Eaton Fire",
      eventTitle: "Official warning row",
      lesson: "Preserve the warning-zone sequence.",
      sourceLabel: "LA County timeline",
      adapted: false
    }]);

    expect(tasks.at(-1)?.sourceLabel).toBe("Eaton Fire · Afterlight takeaway based on LA County timeline");
  });

  test("updates assignments immutably and requires a decision plus primary and backup before practice", () => {
    const withoutOwner = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    });
    const assigned = updateDrillAssignment(withoutOwner, "base:official-sources", {
      ownerRole: "Alert checker",
      practiced: true
    });
    const changed = updateDrillAssignment(assigned, "base:official-sources", { backupRole: "Neighbor contact" });

    expect(withoutOwner.assignments["base:official-sources"]?.practiced).toBe(false);
    expect(assigned.assignments["base:official-sources"]).toEqual({
      ownerRole: "Alert checker",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    });
    expect(changed.assignments["base:official-sources"]?.practiced).toBe(false);
    expect(EMPTY_DRILL_STATE.assignments).toEqual({});
  });

  test("removes a constraint assignment when that constraint is removed", () => {
    const selected = toggleDrillConstraint(EMPTY_DRILL_STATE, "pets", true);
    const assigned = updateDrillAssignment(selected, "constraint:pets", {
      ownerRole: "Pet carrier lead",
      backupRole: "Backup handler",
      actionNote: "Carrier and leash handoff"
    });
    const removed = toggleDrillConstraint(assigned, "pets", false);

    expect(removed.constraints).toEqual([]);
    expect(removed.assignments["constraint:pets"]).toBeUndefined();
    expect(assigned.assignments["constraint:pets"]?.ownerRole).toBe("Pet carrier lead");
  });

  test("normalizes role labels to a bounded single line", () => {
    const state = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      ownerRole: `  Alert\nchecker ${"x".repeat(80)}  `
    });

    expect(state.assignments["base:official-sources"]?.ownerRole).toHaveLength(48);
    expect(state.assignments["base:official-sources"]?.ownerRole).not.toMatch(/[\r\n]/);
  });

  test("rejects private household details from persisted role labels", () => {
    const withPhone = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      ownerRole: "Alert checker 555-123-4567",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    });
    const withAddress = updateDrillAssignment(EMPTY_DRILL_STATE, "base:contact-fallback", {
      ownerRole: "Check-in lead",
      backupRole: "Meet at 123 Main Street",
      actionNote: "Group message plus out-of-area check-in",
      practiced: true
    });

    expect(withPhone.assignments["base:official-sources"]).toEqual({
      ownerRole: "",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: false
    });
    expect(withAddress.assignments["base:contact-fallback"]).toEqual({
      ownerRole: "Check-in lead",
      backupRole: "",
      actionNote: "Group message plus out-of-area check-in",
      practiced: false
    });
  });

  test("accepts only task-specific structured decisions", () => {
    expect(isAllowedDrillActionNote("base:official-sources", "County alerts plus local fire agency")).toBe(true);
    expect(isAllowedDrillActionNote("base:official-sources", "")).toBe(true);
    expect(isAllowedDrillActionNote("base:official-sources", "Meet at 123 Main Street")).toBe(false);
    expect(isAllowedDrillActionNote("constraint:transport", "Take Sunset Way north")).toBe(false);
    expect(isAllowedDrillActionNote("constraint:medications", "EpiPen in upstairs dresser")).toBe(false);
    expect(isAllowedDrillActionNote("lesson:palisades-warning-zones", "Practice a communication handoff")).toBe(true);
  });

  test("preserves a typed trailing space until blur or storage normalization", () => {
    const firstWord = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", { ownerRole: "Mobility " });
    const secondWord = updateDrillAssignment(firstWord, "base:official-sources", { ownerRole: "Mobility helper" });

    expect(firstWord.assignments["base:official-sources"]?.ownerRole).toBe("Mobility ");
    expect(secondWord.assignments["base:official-sources"]?.ownerRole).toBe("Mobility helper");
  });

  test("summarizes practice without manufacturing a readiness or safety score", () => {
    const tasks = buildDrillTasks(EMPTY_DRILL_STATE, historicalLessons);
    const assigned = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      ownerRole: "Alert checker",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency"
    });
    const practiced = updateDrillAssignment(assigned, "base:contact-fallback", {
      ownerRole: "Check-in lead",
      backupRole: "Out-of-area contact",
      actionNote: "Group message plus out-of-area check-in",
      practiced: true
    });
    const recorded = recordDrillPractice(practiced, "2026-07-12");
    const summary = summarizeDrill(tasks, recorded);

    expect(summary).toEqual({
      total: 4,
      unassigned: 2,
      assigned: 2,
      practiced: 1,
      historicalLessons: 1,
      lastPracticedOn: "2026-07-12"
    });
    expect(summary).not.toHaveProperty("score");
    expect(summary).not.toHaveProperty("ready");
    expect(summary).not.toHaveProperty("safe");
  });

  test("ignores an invalid practice date", () => {
    const wrongFormat = recordDrillPractice(EMPTY_DRILL_STATE, "07/12/2026");
    const impossibleDate = recordDrillPractice(EMPTY_DRILL_STATE, "2026-02-31");
    const invalidLeapDay = recordDrillPractice(EMPTY_DRILL_STATE, "2025-02-29");
    const noPracticedHandoff = recordDrillPractice(EMPTY_DRILL_STATE, "2026-07-12");

    expect(wrongFormat).toBe(EMPTY_DRILL_STATE);
    expect(impossibleDate).toBe(EMPTY_DRILL_STATE);
    expect(invalidLeapDay).toBe(EMPTY_DRILL_STATE);
    expect(noPracticedHandoff).toBe(EMPTY_DRILL_STATE);
  });

  test("removes hidden assignments without mutating the original state", () => {
    const assigned = updateDrillAssignment(EMPTY_DRILL_STATE, "lesson:palisades-warning-zones", {
      ownerRole: "Lesson lead",
      backupRole: "Backup adult",
      actionNote: "Practice a communication handoff"
    });
    const removed = removeDrillAssignments(assigned, ["lesson:palisades-warning-zones"]);

    expect(removed.assignments).toEqual({});
    expect(assigned.assignments["lesson:palisades-warning-zones"]).toBeDefined();
  });

  test("reconciles persisted assignments against the current visible task set", () => {
    const base = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      ownerRole: "Alert checker",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    });
    const withHiddenLesson = updateDrillAssignment(base, "lesson:palisades-warning-zones", {
      ownerRole: "Hidden lesson lead",
      backupRole: "Hidden backup",
      actionNote: "Practice a communication handoff",
      practiced: true
    });
    const recorded = recordDrillPractice(withHiddenLesson, "2026-07-12");

    const reconciled = reconcileDrillAssignments(recorded, ["base:official-sources"]);

    expect(reconciled.assignments["base:official-sources"]).toBeDefined();
    expect(reconciled.assignments["lesson:palisades-warning-zones"]).toBeUndefined();
    expect(reconciled.lastPracticedOn).toBeNull();
    expect(recorded.assignments["lesson:palisades-warning-zones"]).toBeDefined();
  });

  test("keeps immutable no-op transitions referentially stable", () => {
    const selected = toggleDrillConstraint(EMPTY_DRILL_STATE, "pets", true);
    const unpracticed = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      ownerRole: "Alert checker"
    });

    expect(toggleDrillConstraint(selected, "pets", true)).toBe(selected);
    expect(updateDrillAssignment(EMPTY_DRILL_STATE, "not-a-task", { ownerRole: "Ignore" })).toBe(EMPTY_DRILL_STATE);
    expect(removeDrillAssignments(EMPTY_DRILL_STATE, ["lesson:not-present"])).toBe(EMPTY_DRILL_STATE);
    expect(reconcileDrillAssignments(unpracticed, ["base:official-sources"])).toBe(unpracticed);
    expect(invalidateDrillPractice(unpracticed, ["base:official-sources"])).toBe(unpracticed);
  });

  test("rejects an invalid structured decision without invalidating unchanged practice", () => {
    const assigned = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      ownerRole: "Alert checker",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    });
    const recorded = recordDrillPractice(assigned, "2026-07-12");
    const rejected = updateDrillAssignment(recorded, "base:official-sources", {
      actionNote: "Meet at a private street address"
    });
    const unchanged = updateDrillAssignment(recorded, "base:official-sources", {
      ownerRole: "Alert checker",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    });

    expect(rejected).toEqual(recorded);
    expect(unchanged).toEqual(recorded);
    expect(unchanged.lastPracticedOn).toBe("2026-07-12");
  });

  test("invalidates the recorded date when the current plan changes", () => {
    const assigned = updateDrillAssignment(EMPTY_DRILL_STATE, "base:official-sources", {
      ownerRole: "Alert checker",
      backupRole: "Backup adult",
      actionNote: "County alerts plus local fire agency",
      practiced: true
    });
    const recorded = recordDrillPractice(assigned, "2026-07-12");
    const edited = updateDrillAssignment(recorded, "base:official-sources", { backupRole: "Neighbor contact" });
    const expanded = toggleDrillConstraint(recorded, "pets", true);
    const removed = removeDrillAssignments(recorded, ["base:official-sources"]);
    const removedUnassignedLesson = removeDrillAssignments(recorded, ["lesson:unassigned-row"]);
    const lessonChanged = invalidateDrillPractice(recorded, ["base:official-sources"]);

    expect(edited.lastPracticedOn).toBeNull();
    expect(expanded.lastPracticedOn).toBeNull();
    expect(removed.lastPracticedOn).toBeNull();
    expect(removedUnassignedLesson.lastPracticedOn).toBeNull();
    expect(lessonChanged.lastPracticedOn).toBeNull();
    expect(lessonChanged.assignments["base:official-sources"]?.practiced).toBe(false);
  });
});
