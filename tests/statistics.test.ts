import { describe, expect, it } from "vitest";

import {
  bucketDailyStatistics,
  buildRangeStatistics,
  resolveStatisticsRange,
} from "../src/statistics";
import type { TrackerEvent } from "../src/types";
import { makeEvent, makeHabit } from "./fixtures";

describe("resolveStatisticsRange", () => {
  it("returns inclusive rolling ranges ending today", () => {
    expect(resolveStatisticsRange("7d", "2024-03-01", [])).toEqual({
      start: "2024-02-24",
      end: "2024-03-01",
    });
    expect(resolveStatisticsRange("30d", "2024-03-01", [])).toEqual({
      start: "2024-02-01",
      end: "2024-03-01",
    });
    expect(resolveStatisticsRange("90d", "2024-03-01", [])).toEqual({
      start: "2023-12-03",
      end: "2024-03-01",
    });
  });

  it("starts all-time at the earliest globally active base event", () => {
    const cancelled = makeEvent("add", {
      id: "event_cancelled",
      occurredOn: "2024-01-01",
      recordedAt: "2024-01-01T08:00:00.000Z",
    });
    const undo = makeEvent("retract", {
      id: "event_undo",
      targetEventId: cancelled.id,
      occurredOn: "2024-03-01",
      recordedAt: "2024-03-01T08:00:00.000Z",
    });
    const earliestActive = makeEvent("set", {
      id: "event_active",
      occurredOn: "2024-02-10",
      recordedAt: "2024-02-10T08:00:00.000Z",
    });

    expect(resolveStatisticsRange("all", "2024-03-01", [cancelled, undo, earliestActive])).toEqual({
      start: "2024-02-10",
      end: "2024-03-01",
    });
    expect(resolveStatisticsRange("all", "2024-03-01", [])).toEqual({
      start: "2024-03-01",
      end: "2024-03-01",
    });
  });
});

describe("buildRangeStatistics", () => {
  it("summarizes checkbox, count, duration, and text habits by day and habit", () => {
    const checkbox = makeHabit("checkbox", { id: "habit_check" });
    const count = makeHabit("count", { id: "habit_count" });
    const duration = makeHabit("duration", {
      id: "habit_duration",
      rules: [{ ...makeHabit("duration").rules[0], id: "rule_duration_stats", target: 1_800 }],
    });
    const text = makeHabit("text", { id: "habit_text" });
    const events = [
      makeEvent("set", { id: "event_check_true", habitId: checkbox.id, value: true, occurredOn: "2024-03-01" }),
      makeEvent("add", { id: "event_count_one", habitId: count.id, value: 1, occurredOn: "2024-03-01" }),
      makeEvent("add", { id: "event_count_two", habitId: count.id, value: 2, occurredOn: "2024-03-01", recordedAt: "2024-03-01T09:00:00.000Z" }),
      makeEvent("add", { id: "event_duration_first", habitId: duration.id, value: 1_200, occurredOn: "2024-03-01" }),
      makeEvent("note", { id: "event_text_first", habitId: text.id, value: "阅读", occurredOn: "2024-03-01" }),
      makeEvent("note", { id: "event_text_second", habitId: text.id, value: "复盘", occurredOn: "2024-03-01", recordedAt: "2024-03-01T10:00:00.000Z" }),
      makeEvent("set", { id: "event_check_false", habitId: checkbox.id, value: false, occurredOn: "2024-03-02", recordedAt: "2024-03-02T08:00:00.000Z" }),
      makeEvent("add", { id: "event_duration_second", habitId: duration.id, value: 1_800, occurredOn: "2024-03-02", recordedAt: "2024-03-02T09:00:00.000Z" }),
    ];

    expect(buildRangeStatistics([checkbox, count, duration, text], events, "2024-03-01", "2024-03-03")).toEqual({
      start: "2024-03-01",
      end: "2024-03-03",
      activeDays: 2,
      completions: 4,
      records: 8,
      durationSeconds: 3_000,
      daily: [
        { date: "2024-03-01", durationSeconds: 1_200, completions: 3, records: 6 },
        { date: "2024-03-02", durationSeconds: 1_800, completions: 1, records: 2 },
        { date: "2024-03-03", durationSeconds: 0, completions: 0, records: 0 },
      ],
      habits: [
        { habitId: checkbox.id, total: 1, activeDays: 2, completedDays: 1, records: 2 },
        { habitId: count.id, total: 3, activeDays: 1, completedDays: 1, records: 2 },
        { habitId: duration.id, total: 3_000, activeDays: 2, completedDays: 1, records: 2 },
        { habitId: text.id, total: 2, activeDays: 1, completedDays: 1, records: 2 },
      ],
    });
  });

  it("deduplicates before filtering and lets an out-of-range retract cancel an in-range event", () => {
    const habit = makeHabit("duration", { id: "habit_duration" });
    const earlierCopy = makeEvent("add", {
      id: "event_same_id",
      habitId: habit.id,
      value: 600,
      occurredOn: "2024-03-05",
      recordedAt: "2024-03-05T08:00:00.000Z",
    });
    const laterCopy = { ...earlierCopy, value: 9_999, recordedAt: "2024-03-05T09:00:00.000Z" };
    const cancelled = makeEvent("add", {
      id: "event_cancelled_inside",
      habitId: habit.id,
      value: 1_200,
      occurredOn: "2024-03-05",
      recordedAt: "2024-03-05T10:00:00.000Z",
    });
    const outsideUndo = makeEvent("retract", {
      id: "event_outside_undo",
      habitId: habit.id,
      targetEventId: cancelled.id,
      occurredOn: "2024-04-01",
      recordedAt: "2024-04-01T08:00:00.000Z",
    });
    const outsideValue = makeEvent("add", {
      id: "event_outside_value",
      habitId: habit.id,
      value: 3_600,
      occurredOn: "2024-03-04",
    });

    const result = buildRangeStatistics(
      [habit],
      [laterCopy, cancelled, earlierCopy, outsideUndo, outsideValue],
      "2024-03-05",
      "2024-03-05",
    );
    expect(result.durationSeconds).toBe(600);
    expect(result.records).toBe(1);
    expect(result.habits[0]).toMatchObject({ total: 600, activeDays: 1, records: 1 });
  });

  it("excludes invalid numeric totals while retaining their active records", () => {
    const count = makeHabit("count", { id: "habit_count_invalid" });
    const duration = makeHabit("duration", { id: "habit_duration_invalid" });
    const values = [Number.NaN, Number.POSITIVE_INFINITY, -1, 0, "60", true];
    const events: TrackerEvent[] = values.flatMap((value, index) => [
      makeEvent("add", { id: `event_count_invalid_${index}`, habitId: count.id, value }),
      makeEvent("add", { id: `event_duration_invalid_${index}`, habitId: duration.id, value }),
    ]);
    events.push(makeEvent("add", { id: "event_count_valid", habitId: count.id, value: 4 }));
    events.push(makeEvent("add", { id: "event_duration_valid", habitId: duration.id, value: 75 }));

    const result = buildRangeStatistics([count, duration], events, "2024-03-05", "2024-03-05");
    expect(result.records).toBe(14);
    expect(result.durationSeconds).toBe(75);
    expect(result.habits).toMatchObject([
      { habitId: count.id, total: 4, records: 7 },
      { habitId: duration.id, total: 75, records: 7 },
    ]);
  });

  it("returns zero-filled days and habits for an empty range", () => {
    const habit = makeHabit("checkbox");
    expect(buildRangeStatistics([habit], [], "2024-02-28", "2024-03-01")).toEqual({
      start: "2024-02-28",
      end: "2024-03-01",
      activeDays: 0,
      completions: 0,
      records: 0,
      durationSeconds: 0,
      daily: [
        { date: "2024-02-28", durationSeconds: 0, completions: 0, records: 0 },
        { date: "2024-02-29", durationSeconds: 0, completions: 0, records: 0 },
        { date: "2024-03-01", durationSeconds: 0, completions: 0, records: 0 },
      ],
      habits: [{ habitId: habit.id, total: 0, activeDays: 0, completedDays: 0, records: 0 }],
    });
  });

  it("uses occurredOn date keys without converting event timezones", () => {
    const habit = makeHabit("checkbox");
    const event = makeEvent("set", {
      id: "event_timezone",
      habitId: habit.id,
      occurredOn: "2024-03-01",
      recordedAt: "2024-02-29T16:30:00.000Z",
      timezone: "Asia/Shanghai",
      value: true,
    });
    const result = buildRangeStatistics([habit], [event], "2024-02-29", "2024-03-01");

    expect(result.daily).toEqual([
      { date: "2024-02-29", durationSeconds: 0, completions: 0, records: 0 },
      { date: "2024-03-01", durationSeconds: 0, completions: 1, records: 1 },
    ]);
  });

  it("keeps very long all-time histories sparse without losing their totals", () => {
    const habit = makeHabit("duration", { id: "habit_long_history" });
    const events = [
      makeEvent("add", {
        id: "event_long_start",
        habitId: habit.id,
        value: 60,
        occurredOn: "1900-01-01",
      }),
      makeEvent("add", {
        id: "event_long_middle",
        habitId: habit.id,
        value: 120,
        occurredOn: "1970-06-15",
      }),
      makeEvent("add", {
        id: "event_long_end",
        habitId: habit.id,
        value: 180,
        occurredOn: "2026-09-09",
      }),
    ];

    const range = resolveStatisticsRange("all", "2026-09-09", events);
    const result = buildRangeStatistics([habit], events, range.start, range.end);
    const buckets = bucketDailyStatistics(result.daily, 8);

    expect(range).toEqual({ start: "1900-01-01", end: "2026-09-09" });
    expect(result.daily.map((day) => day.date)).toEqual([
      "1900-01-01",
      "1970-06-15",
      "2026-09-09",
    ]);
    expect(result).toMatchObject({ activeDays: 3, records: 3, durationSeconds: 360 });
    expect(buckets).toHaveLength(8);
    expect(buckets[0].start).toBe("1900-01-01");
    expect(buckets.at(-1)?.end).toBe("2026-09-09");
    expect(buckets.reduce((sum, bucket) => sum + bucket.durationSeconds, 0)).toBe(360);
    expect(buckets.reduce((sum, bucket) => sum + bucket.records, 0)).toBe(3);
  });
});

describe("bucketDailyStatistics", () => {
  it("creates contiguous balanced buckets and preserves every total", () => {
    const daily = Array.from({ length: 14 }, (_, index) => ({
      date: `2024-03-${String(index + 1).padStart(2, "0")}`,
      durationSeconds: (index + 1) * 10,
      completions: index % 3,
      records: index + 1,
    }));
    const buckets = bucketDailyStatistics(daily, 5);

    expect(buckets).toHaveLength(5);
    expect(buckets.map((bucket) => [bucket.start, bucket.end])).toEqual([
      ["2024-03-01", "2024-03-03"],
      ["2024-03-04", "2024-03-06"],
      ["2024-03-07", "2024-03-09"],
      ["2024-03-10", "2024-03-12"],
      ["2024-03-13", "2024-03-14"],
    ]);
    expect(buckets.reduce((sum, bucket) => sum + bucket.durationSeconds, 0)).toBe(
      daily.reduce((sum, day) => sum + day.durationSeconds, 0),
    );
    expect(buckets.reduce((sum, bucket) => sum + bucket.completions, 0)).toBe(
      daily.reduce((sum, day) => sum + day.completions, 0),
    );
    expect(buckets.reduce((sum, bucket) => sum + bucket.records, 0)).toBe(
      daily.reduce((sum, day) => sum + day.records, 0),
    );
  });
});
