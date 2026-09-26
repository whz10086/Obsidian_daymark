import { describe, expect, it } from "vitest";

import {
  bestActivityStreak,
  currentActivityStreak,
  deduplicateEvents,
  projectHabitDay,
} from "../src/domain";
import type { TrackerEvent } from "../src/types";
import { makeEvent, makeHabit } from "./fixtures";

describe("projectHabitDay", () => {
  it("uses the latest active set event for checkbox habits", () => {
    const habit = makeHabit("checkbox");
    const checked = makeEvent("set", {
      id: "event_checked",
      value: true,
      recordedAt: "2024-03-05T08:00:00.000Z",
    });
    const unchecked = makeEvent("set", {
      id: "event_unchecked",
      value: false,
      recordedAt: "2024-03-05T09:00:00.000Z",
    });

    expect(projectHabitDay(habit, "2024-03-05", [unchecked, checked])).toMatchObject({
      completed: false,
      value: false,
      latestEvent: unchecked,
    });

    const retract = makeEvent("retract", {
      id: "event_retract_unchecked",
      targetEventId: unchecked.id,
      recordedAt: "2024-03-05T10:00:00.000Z",
    });
    expect(projectHabitDay(habit, "2024-03-05", [checked, unchecked, retract])).toMatchObject({
      completed: true,
      value: true,
      latestEvent: checked,
    });
  });

  it("sums count events once, applies the target, and honors retractions", () => {
    const habit = makeHabit("count");
    const first = makeEvent("add", {
      id: "event_count_first",
      habitId: habit.id,
      value: 1,
    });
    const second = makeEvent("add", {
      id: "event_count_second",
      habitId: habit.id,
      value: 2,
      recordedAt: "2024-03-05T09:00:00.000Z",
    });
    const duplicateFromSync = { ...second };

    expect(projectHabitDay(habit, "2024-03-05", [first, second, duplicateFromSync])).toMatchObject({
      completed: true,
      value: 3,
    });

    const retract = makeEvent("retract", {
      id: "event_count_retract",
      habitId: habit.id,
      targetEventId: second.id,
      recordedAt: "2024-03-05T10:00:00.000Z",
    });
    expect(projectHabitDay(habit, "2024-03-05", [first, second, retract])).toMatchObject({
      completed: false,
      value: 1,
    });
  });

  it("projects duration events independently from count events", () => {
    const habit = makeHabit("duration");
    const events = [
      makeEvent("add", {
        id: "event_duration_10",
        habitId: habit.id,
        value: 10,
      }),
      makeEvent("add", {
        id: "event_duration_20",
        habitId: habit.id,
        value: 20,
        recordedAt: "2024-03-05T09:00:00.000Z",
      }),
    ];

    expect(projectHabitDay(habit, "2024-03-05", events)).toMatchObject({
      completed: true,
      value: 30,
    });
  });

  it("joins active text entries in stable order and ignores retracted notes", () => {
    const habit = makeHabit("text");
    const first = makeEvent("note", {
      id: "event_text_first",
      habitId: habit.id,
      value: "晨间复盘 🌅",
    });
    const second = makeEvent("note", {
      id: "event_text_second",
      habitId: habit.id,
      value: "晚间复盘 🌙",
      recordedAt: "2024-03-05T09:00:00.000Z",
    });
    const retract = makeEvent("retract", {
      id: "event_text_retract",
      habitId: habit.id,
      targetEventId: second.id,
      recordedAt: "2024-03-05T10:00:00.000Z",
    });

    const projection = projectHabitDay(habit, "2024-03-05", [second, retract, first]);
    expect(projection.completed).toBe(true);
    expect(projection.value).toBe("晨间复盘 🌅");
    expect(projection.notes).toEqual([first]);
  });

  it("deduplicates an event id deterministically before projection", () => {
    const earlier = makeEvent("add", {
      id: "event_same_id",
      value: 1,
      recordedAt: "2024-03-05T08:00:00.000Z",
    });
    const laterCopy = { ...earlier, value: 99, recordedAt: "2024-03-05T09:00:00.000Z" };

    expect(deduplicateEvents([laterCopy, earlier])).toEqual([earlier]);
  });
});

describe("activity streaks", () => {
  const habit = makeHabit("checkbox");

  function activity(date: string, suffix: string): TrackerEvent {
    return makeEvent("set", {
      id: `event_streak_${suffix}`,
      occurredOn: date,
      recordedAt: `${date}T08:00:00.000Z`,
    });
  }

  it("allows an unfinished current day and counts back from yesterday", () => {
    const events = [activity("2024-03-02", "02"), activity("2024-03-03", "03"), activity("2024-03-04", "04")];
    const now = new Date("2024-03-05T12:00:00.000Z");

    expect(currentActivityStreak([habit], events, "UTC", now)).toBe(3);
  });

  it("uses the requested timezone to choose the streak's current day", () => {
    const events = [activity("2024-03-01", "tz01")];
    const instant = new Date("2024-03-02T16:30:00.000Z");

    // It is still March 2 in UTC, so March 1 receives the one-day grace period.
    expect(currentActivityStreak([habit], events, "UTC", instant)).toBe(1);
    // It is already March 3 in Shanghai; March 2 was missed, so the streak is over.
    expect(currentActivityStreak([habit], events, "Asia/Shanghai", instant)).toBe(0);
  });

  it("finds the longest run across separated activity ranges", () => {
    const events = [
      activity("2024-01-01", "a01"),
      activity("2024-01-02", "a02"),
      activity("2024-02-27", "b27"),
      activity("2024-02-28", "b28"),
      activity("2024-02-29", "b29"),
      activity("2024-03-01", "b01"),
    ];

    expect(bestActivityStreak([habit], events)).toBe(4);
  });
});
