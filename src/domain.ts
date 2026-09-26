import { addDays, daysBetweenInclusive, todayKey, weekdayIndex } from "./date-utils";
import type {
  DaySummary,
  Habit,
  HabitProjection,
  HabitRule,
  TrackerEvent,
} from "./types";

export function effectiveRule(habit: Habit, date: string): HabitRule | undefined {
  const rules = habit.rules
    .filter((rule) => rule.effectiveFrom <= date)
    .sort((a, b) => {
      const byDate = a.effectiveFrom.localeCompare(b.effectiveFrom);
      if (byDate !== 0) return byDate;
      const byCreated = a.createdAt.localeCompare(b.createdAt);
      return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id);
    });
  return rules[rules.length - 1];
}

export function isHabitScheduled(habit: Habit, date: string): boolean {
  const rule = effectiveRule(habit, date) ?? habit.rules[0];
  return Boolean(rule?.enabled && rule.weekdays.includes(weekdayIndex(date)));
}

function compareEvents(a: TrackerEvent, b: TrackerEvent): number {
  const byRecorded = a.recordedAt.localeCompare(b.recordedAt);
  return byRecorded !== 0 ? byRecorded : a.id.localeCompare(b.id);
}

export function deduplicateEvents(events: TrackerEvent[]): TrackerEvent[] {
  const byId = new Map<string, TrackerEvent>();
  for (const event of [...events].sort(compareEvents)) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  return [...byId.values()].sort(compareEvents);
}

function activeBaseEvents(events: TrackerEvent[]): TrackerEvent[] {
  const unique = deduplicateEvents(events);
  const retracted = new Set(
    unique
      .filter((event) => event.type === "retract" && event.targetEventId)
      .map((event) => event.targetEventId as string),
  );
  return unique.filter((event) => event.type !== "retract" && !retracted.has(event.id));
}

export function cumulativeDurationSeconds(habitId: string, events: TrackerEvent[]): number {
  return activeBaseEvents(events).reduce((total, event) => {
    if (
      event.habitId !== habitId ||
      event.type !== "add" ||
      typeof event.value !== "number" ||
      !Number.isFinite(event.value) ||
      event.value <= 0
    ) {
      return total;
    }
    return total + event.value;
  }, 0);
}

export function projectHabitDay(
  habit: Habit,
  date: string,
  allEvents: TrackerEvent[],
): HabitProjection {
  const dayEvents = deduplicateEvents(
    allEvents.filter((event) => event.habitId === habit.id && event.occurredOn === date),
  );
  const retractedIds = new Set(
    dayEvents
      .filter((event) => event.type === "retract" && event.targetEventId)
      .map((event) => event.targetEventId as string),
  );
  const activeEvents = dayEvents.filter(
    (event) => event.type !== "retract" && !retractedIds.has(event.id),
  );
  const latestEvent = activeEvents[activeEvents.length - 1];
  const rule = effectiveRule(habit, date);
  if (habit.type === "checkbox") {
    const setEvents = activeEvents.filter((event) => event.type === "set");
    const latestSet = setEvents[setEvents.length - 1];
    const value = latestSet?.value === true;
    return {
      habitId: habit.id,
      date,
      completed: value,
      value,
      notes: [],
      activeEvents,
      latestEvent: latestSet,
    };
  }
  if (habit.type === "text") {
    const notes = activeEvents.filter(
      (event) => event.type === "note" && typeof event.value === "string",
    );
    const value = notes.map((event) => String(event.value)).join("\n\n");
    return {
      habitId: habit.id,
      date,
      completed: notes.some((event) => String(event.value).trim().length > 0),
      value,
      notes,
      activeEvents,
      latestEvent,
    };
  }
  const value = activeEvents
    .filter((event) => event.type === "add" && typeof event.value === "number")
    .reduce((sum, event) => sum + (event.value as number), 0);
  return {
    habitId: habit.id,
    date,
    completed: value >= (rule?.target ?? Number.POSITIVE_INFINITY),
    value,
    notes: [],
    activeEvents,
    latestEvent,
  };
}

export function summarizeDay(date: string, habits: Habit[], events: TrackerEvent[]): DaySummary {
  const scheduled = habits.filter((habit) => isHabitScheduled(habit, date));
  const completed = scheduled.filter(
    (habit) => projectHabitDay(habit, date, events).completed,
  ).length;
  const hasActivity = habits.some(
    (habit) => projectHabitDay(habit, date, events).activeEvents.length > 0,
  );
  return {
    date,
    scheduled: scheduled.length,
    completed,
    ratio: scheduled.length === 0 ? 0 : completed / scheduled.length,
    hasActivity,
  };
}

export function currentActivityStreak(
  habits: Habit[],
  events: TrackerEvent[],
  timezone: string,
  now = new Date(),
): number {
  const activeDates = new Set(activeBaseEvents(events).map((event) => event.occurredOn));
  let cursor = todayKey(now, timezone);
  if (!activeDates.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestActivityStreak(habits: Habit[], events: TrackerEvent[]): number {
  const completedDates = [...new Set(activeBaseEvents(events).map((event) => event.occurredOn))].sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const date of completedDates) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

export function completionCount(
  habits: Habit[],
  events: TrackerEvent[],
  start: string,
  end: string,
): number {
  const byDate = new Map<string, TrackerEvent[]>();
  for (const event of events) {
    if (event.occurredOn < start || event.occurredOn > end) continue;
    const group = byDate.get(event.occurredOn) ?? [];
    group.push(event);
    byDate.set(event.occurredOn, group);
  }
  return daysBetweenInclusive(start, end).reduce(
    (total, date) => total + summarizeDay(date, habits, byDate.get(date) ?? []).completed,
    0,
  );
}

export function latestRetractableEvent(projection: HabitProjection): TrackerEvent | undefined {
  const events = projection.activeEvents.filter((event) => event.type !== "set");
  return events[events.length - 1];
}
