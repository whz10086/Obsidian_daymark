import { effectiveRule, projectHabitDay } from "./domain";
import { elapsedTimerSeconds } from "./timer";
import type { Habit, RunningTimer, TrackerEvent } from "./types";

export interface ActivitySelection {
  version: 1;
  id: string;
  date: string;
  habitId: string;
  included: boolean;
  recordedAt: string;
}

/** Membership is independent of task data; completion is never persisted here. */
export function selectedActivityIds(entries: ActivitySelection[], date: string): string[] {
  const selected = new Set<string>();
  for (const entry of entries.filter((item) => item.date === date).sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id))) {
    if (entry.included) selected.add(entry.habitId);
    else selected.delete(entry.habitId);
  }
  return [...selected];
}

export function activityProgress(habit: Habit, date: string, events: TrackerEvent[], running?: RunningTimer, now = Date.now()) {
  const saved = Number(projectHabitDay(habit, date, events).value);
  const live = habit.type === "duration" && running?.habitId === habit.id && running.date === date
    ? elapsedTimerSeconds(running, now) : 0;
  const target = effectiveRule(habit, date)?.target;
  const value = saved + live;
  return { value, target, completed: target !== undefined && value >= target };
}
