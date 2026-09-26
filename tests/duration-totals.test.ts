import { describe, expect, it } from "vitest";

import { cumulativeDurationSeconds } from "../src/domain";
import { makeEvent } from "./fixtures";

describe("cumulativeDurationSeconds", () => {
  const habitId = "habit_duration";

  it("sums a task's saved seconds across dates without including other tasks or event types", () => {
    const events = [
      makeEvent("add", { id: "event_monday", habitId, occurredOn: "2024-03-04", value: 1_800 }),
      makeEvent("add", { id: "event_tuesday", habitId, occurredOn: "2024-03-05", value: 2_700 }),
      makeEvent("add", { id: "event_other_task", habitId: "habit_running", value: 3_600 }),
      makeEvent("note", { id: "event_note", habitId, value: "专注阅读" }),
      makeEvent("set", { id: "event_set", habitId, value: true }),
    ];

    expect(cumulativeDurationSeconds(habitId, events)).toBe(4_500);
  });

  it("removes an earlier day's contribution when undone later and does not double count sync copies", () => {
    const monday = makeEvent("add", {
      id: "event_monday",
      habitId,
      occurredOn: "2024-03-04",
      recordedAt: "2024-03-04T08:00:00.000Z",
      value: 1_800,
    });
    const tuesday = makeEvent("add", {
      id: "event_tuesday",
      habitId,
      occurredOn: "2024-03-05",
      recordedAt: "2024-03-05T08:00:00.000Z",
      value: 900,
    });
    const undoMonday = makeEvent("retract", {
      id: "event_undo_monday",
      habitId,
      occurredOn: monday.occurredOn,
      recordedAt: "2024-03-06T08:00:00.000Z",
      targetEventId: monday.id,
    });
    const syncedEvents = [tuesday, monday, { ...monday }, { ...tuesday }];

    expect(cumulativeDurationSeconds(habitId, syncedEvents)).toBe(2_700);
    expect(cumulativeDurationSeconds(habitId, [...syncedEvents, undoMonday, { ...undoMonday }])).toBe(900);
  });

  it("uses the same deterministic duplicate resolution as daily projections", () => {
    const earlier = makeEvent("add", {
      id: "event_same_id",
      habitId,
      recordedAt: "2024-03-05T08:00:00.000Z",
      value: 1_200,
    });
    const later = { ...earlier, value: 7_200, recordedAt: "2024-03-05T09:00:00.000Z" };

    expect(cumulativeDurationSeconds(habitId, [later, earlier])).toBe(1_200);
    expect(cumulativeDurationSeconds(habitId, [earlier, later])).toBe(1_200);
  });

  it("returns zero for missing tasks and excludes invalid numeric contributions", () => {
    const invalidValues = [Number.NaN, Number.POSITIVE_INFINITY, -60, 0, "60", true, undefined];
    const events = invalidValues.map((value, index) =>
      makeEvent("add", { id: `event_invalid_${index}`, habitId, value }),
    );
    events.push(makeEvent("add", { id: "event_valid", habitId, value: 75 }));

    expect(cumulativeDurationSeconds(habitId, [])).toBe(0);
    expect(cumulativeDurationSeconds("habit_missing", events)).toBe(0);
    expect(cumulativeDurationSeconds(habitId, events)).toBe(75);
  });
});
