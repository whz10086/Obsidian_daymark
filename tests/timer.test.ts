import { describe, expect, it } from "vitest";

import { dueRestReminderSeconds, elapsedTimerSeconds } from "../src/timer";
import type { RunningTimer } from "../src/types";

const timer: RunningTimer = {
  habitId: "habit_reading",
  date: "2026-09-09",
  startedAt: Date.parse("2026-09-09T08:00:00Z"),
};
const after = (seconds: number): number => timer.startedAt + seconds * 1_000;

describe("rest reminder timing", () => {
  it("freezes elapsed time while paused", () => {
    const paused = { ...timer, pausedAt: after(1800) };
    expect(elapsedTimerSeconds(paused, after(5400))).toBe(1800);
  });
  it("waits a full 30 minutes, including the exact millisecond boundary", () => {
    expect(dueRestReminderSeconds(timer, after(1_800) - 1)).toBeUndefined();
    expect(dueRestReminderSeconds(timer, after(1_800))).toBe(1_800);
  });

  it("repeats at 60 and 90 minutes without repeating an acknowledged reminder", () => {
    const first = { ...timer, lastRestReminderSeconds: 1_800 };
    expect(dueRestReminderSeconds(first, after(1_801))).toBeUndefined();
    expect(dueRestReminderSeconds(first, after(3_600) - 1)).toBeUndefined();
    expect(dueRestReminderSeconds(first, after(3_600))).toBe(3_600);
    const second = { ...timer, lastRestReminderSeconds: 3_600 };
    expect(dueRestReminderSeconds(second, after(5_400))).toBe(5_400);
  });

  it("coalesces missed reminders after sleep and survives persisted-state reload", () => {
    const latest = dueRestReminderSeconds(timer, after(100 * 60));
    expect(latest).toBe(90 * 60);
    const restored = JSON.parse(JSON.stringify({ ...timer, lastRestReminderSeconds: latest }));
    expect(dueRestReminderSeconds(restored, after(100 * 60))).toBeUndefined();
    expect(dueRestReminderSeconds(restored, after(120 * 60))).toBe(120 * 60);
  });

  it("counts continuously across midnight from the start timestamp", () => {
    const midnightTimer = { ...timer, startedAt: Date.parse("2026-09-09T23:50:00+08:00") };
    const nextDay = Date.parse("2026-09-10T00:20:00+08:00");
    expect(elapsedTimerSeconds(midnightTimer, nextDay)).toBe(1_800);
    expect(dueRestReminderSeconds(midnightTimer, nextDay)).toBe(1_800);
  });

  it("does not issue a new reminder while a clock rollback remains before the last boundary", () => {
    const acknowledged = { ...timer, lastRestReminderSeconds: 3_600 };
    expect(dueRestReminderSeconds(acknowledged, after(2_000))).toBeUndefined();
    expect(elapsedTimerSeconds(timer, timer.startedAt - 1)).toBe(0);
    expect(dueRestReminderSeconds(timer, timer.startedAt - 1)).toBeUndefined();
  });

  it("ignores malformed timestamps and defaults invalid legacy reminder state", () => {
    expect(dueRestReminderSeconds({ ...timer, startedAt: Number.NaN }, after(1_800))).toBeUndefined();
    expect(dueRestReminderSeconds(timer, Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(dueRestReminderSeconds({ ...timer, lastRestReminderSeconds: Number.NaN }, after(1_800))).toBe(1_800);
  });
});
