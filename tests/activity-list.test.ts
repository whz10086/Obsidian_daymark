import { describe, it, expect } from "vitest";
import { activityProgress, selectedActivityIds, type ActivitySelection } from "../src/activity-list";
import { makeHabit, makeEvent } from "./fixtures";

const date = "2024-03-05";
describe("daily activity associations", () => {
  it("keeps dates independent, deduplicates selection and supports remove/re-add", () => {
    const entry = (id: string, habitId: string, included: boolean, day = date): ActivitySelection =>
      ({ version: 1, id, habitId, included, date: day, recordedAt: `2024-03-05T08:00:0${id}.000Z` });
    const entries = [entry("1", "a", true), entry("2", "a", true), entry("3", "b", true), entry("4", "a", false), entry("5", "c", true, "2024-03-06")];
    expect(selectedActivityIds(entries, date)).toEqual(["b"]);
    expect(selectedActivityIds([...entries, entry("6", "a", true)], date)).toEqual(["b", "a"]);
    expect(selectedActivityIds([...entries].reverse(), date)).toEqual(["b"]);
    expect(selectedActivityIds(entries, "2024-03-07")).toEqual([]);
  });
  it("auto-completes counts and unchecks when source data is retracted", () => {
    const habit = makeHabit("count");
    const add = makeEvent("add", { habitId: habit.id, value: 3 });
    expect(activityProgress(habit, date, [add]).completed).toBe(true);
    const undo = makeEvent("retract", { habitId: habit.id, targetEventId: add.id });
    expect(activityProgress(habit, date, [add, undo]).completed).toBe(false);
    expect(activityProgress(habit, "2024-03-06", [add]).value).toBe(0);
  });
  it("includes live duration, freezes while resting and excludes other sessions", () => {
    const habit = makeHabit("duration"); // target: 30 seconds
    const events = [makeEvent("add", { habitId: habit.id, value: 10 })];
    const running = { habitId: habit.id, date, startedAt: 1000 };
    expect(activityProgress(habit, date, events, running, 21000)).toMatchObject({ value: 30, completed: true });
    expect(activityProgress(habit, date, events, { ...running, pausedAt: 11000 }, 61000)).toMatchObject({ value: 20, completed: false });
    expect(activityProgress(habit, date, events, { ...running, date: "2024-03-04" }, 61000).value).toBe(10);
    expect(activityProgress(habit, date, events, { ...running, habitId: "other" }, 61000).value).toBe(10);
  });
  it("uses the goal effective on that date and never changes the source model", () => {
    const habit = makeHabit("count");
    habit.rules.push({ ...habit.rules[0], id: "new", effectiveFrom: "2024-03-06", target: 8 });
    const snapshot = JSON.stringify(habit);
    expect(activityProgress(habit, date, []).target).toBe(3);
    expect(activityProgress(habit, "2024-03-06", []).target).toBe(8);
    expect(activityProgress(habit, "2023-12-01", []).completed).toBe(false);
    expect(JSON.stringify(habit)).toBe(snapshot);
  });
});
