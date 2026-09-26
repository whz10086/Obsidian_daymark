import { addDays, daysBetweenInclusive, keyToDate } from "./date-utils";
import { deduplicateEvents, projectHabitDay } from "./domain";
import type { Habit, TrackerEvent } from "./types";

export type StatisticsRange = "7d" | "30d" | "90d" | "all";

export interface DailyStatistics {
  date: string;
  durationSeconds: number;
  completions: number;
  records: number;
}

export interface HabitStatistics {
  habitId: string;
  total: number;
  activeDays: number;
  completedDays: number;
  records: number;
}

export interface RangeStatistics {
  start: string;
  end: string;
  activeDays: number;
  completions: number;
  records: number;
  durationSeconds: number;
  daily: DailyStatistics[];
  habits: HabitStatistics[];
}

export interface DailyStatisticsBucket {
  start: string;
  end: string;
  durationSeconds: number;
  completions: number;
  records: number;
}

function activeBaseEvents(events: readonly TrackerEvent[]): TrackerEvent[] {
  const unique = deduplicateEvents([...events]);
  const retractedIds = new Set(
    unique
      .filter((event) => event.type === "retract" && event.targetEventId)
      .map((event) => event.targetEventId as string),
  );
  return unique.filter((event) => event.type !== "retract" && !retractedIds.has(event.id));
}

export function resolveStatisticsRange(
  range: StatisticsRange,
  today: string,
  events: readonly TrackerEvent[],
): { start: string; end: string } {
  keyToDate(today);
  if (range === "7d") return { start: addDays(today, -6), end: today };
  if (range === "30d") return { start: addDays(today, -29), end: today };
  if (range === "90d") return { start: addDays(today, -89), end: today };

  const earliest = activeBaseEvents(events)
    .map((event) => event.occurredOn)
    .sort((a, b) => a.localeCompare(b))[0];
  return { start: earliest ?? today, end: today };
}

interface HabitAccumulator {
  habit: Habit;
  total: number;
  records: number;
  eventsByDate: Map<string, TrackerEvent[]>;
}

const MAX_DENSE_STATISTICS_DAYS = 20_000;
const MILLISECONDS_PER_DAY = 86_400_000;

function calendarDaysInclusive(start: string, end: string): number {
  const startDate = keyToDate(start);
  const endDate = keyToDate(end);
  if (start > end) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY) + 1;
}

function emptyDailyStatistics(date: string): DailyStatistics {
  return { date, durationSeconds: 0, completions: 0, records: 0 };
}

function numericContribution(event: TrackerEvent): number {
  return event.type === "add" &&
    typeof event.value === "number" &&
    Number.isFinite(event.value) &&
    event.value > 0
    ? event.value
    : 0;
}

/**
 * Builds statistics from saved events. Retractions and duplicate IDs are resolved
 * globally before the selected date range is applied, so an undo written on a
 * later date can remove an earlier contribution.
 */
export function buildRangeStatistics(
  habits: readonly Habit[],
  events: readonly TrackerEvent[],
  start: string,
  end: string,
): RangeStatistics {
  const calendarDays = calendarDaysInclusive(start, end);
  const usesSparseTimeline = calendarDays > MAX_DENSE_STATISTICS_DAYS;
  const dates = usesSparseTimeline
    ? [start, ...(end === start ? [] : [end])]
    : daysBetweenInclusive(start, end);
  const dailyByDate = new Map<string, DailyStatistics>(
    dates.map((date) => [date, emptyDailyStatistics(date)]),
  );
  const accumulators = new Map<string, HabitAccumulator>();
  for (const habit of habits) {
    if (!accumulators.has(habit.id)) {
      accumulators.set(habit.id, { habit, total: 0, records: 0, eventsByDate: new Map() });
    }
  }

  for (const event of activeBaseEvents(events)) {
    const accumulator = accumulators.get(event.habitId);
    if (!accumulator) continue;

    let daily = dailyByDate.get(event.occurredOn);
    if (
      !daily &&
      usesSparseTimeline &&
      event.occurredOn >= start &&
      event.occurredOn <= end
    ) {
      try {
        keyToDate(event.occurredOn);
        daily = emptyDailyStatistics(event.occurredOn);
        dailyByDate.set(event.occurredOn, daily);
      } catch {
        // Malformed event dates are ignored, matching dense-range behavior.
      }
    }
    if (!daily) continue;

    daily.records += 1;
    accumulator.records += 1;
    const dayEvents = accumulator.eventsByDate.get(event.occurredOn) ?? [];
    dayEvents.push(event);
    accumulator.eventsByDate.set(event.occurredOn, dayEvents);

    if (accumulator.habit.type === "duration") {
      const seconds = numericContribution(event);
      accumulator.total += seconds;
      daily.durationSeconds += seconds;
    } else if (accumulator.habit.type === "count") {
      accumulator.total += numericContribution(event);
    } else if (accumulator.habit.type === "text" && event.type === "note") {
      accumulator.total += 1;
    }
  }

  const habitStatistics: HabitStatistics[] = [];
  let completions = 0;
  for (const accumulator of accumulators.values()) {
    let completedDays = 0;
    for (const [date, dayEvents] of accumulator.eventsByDate) {
      if (projectHabitDay(accumulator.habit, date, dayEvents).completed) {
        completedDays += 1;
        completions += 1;
        const daily = dailyByDate.get(date);
        if (daily) daily.completions += 1;
      }
    }
    habitStatistics.push({
      habitId: accumulator.habit.id,
      total: accumulator.habit.type === "checkbox" ? completedDays : accumulator.total,
      activeDays: accumulator.eventsByDate.size,
      completedDays,
      records: accumulator.records,
    });
  }

  const daily = [...dailyByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
  return {
    start,
    end,
    activeDays: daily.reduce((total, day) => total + (day.records > 0 ? 1 : 0), 0),
    completions,
    records: daily.reduce((total, day) => total + day.records, 0),
    durationSeconds: daily.reduce((total, day) => total + day.durationSeconds, 0),
    daily,
    habits: habitStatistics,
  };
}

export function bucketDailyStatistics(
  daily: readonly DailyStatistics[],
  maxBuckets = 12,
): DailyStatisticsBucket[] {
  if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) {
    throw new Error("maxBuckets must be a positive integer");
  }
  if (daily.length === 0) return [];

  const ordered = [...daily].sort((left, right) => left.date.localeCompare(right.date));
  const totalDays = calendarDaysInclusive(ordered[0].date, ordered[ordered.length - 1].date);
  if (totalDays === 0) return [];

  const bucketCount = Math.min(maxBuckets, totalDays);
  const minimumSize = Math.floor(totalDays / bucketCount);
  let remainder = totalDays % bucketCount;
  let offset = 0;
  const buckets: DailyStatisticsBucket[] = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const size = minimumSize + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    const bucketStart = addDays(ordered[0].date, offset);
    const bucketEnd = addDays(bucketStart, size - 1);
    offset += size;
    buckets.push({
      start: bucketStart,
      end: bucketEnd,
      durationSeconds: 0,
      completions: 0,
      records: 0,
    });
  }
  for (const day of ordered) {
    const bucket = buckets.find((candidate) => day.date >= candidate.start && day.date <= candidate.end);
    if (!bucket) continue;
    bucket.durationSeconds += day.durationSeconds;
    bucket.completions += day.completions;
    bucket.records += day.records;
  }
  return buckets;
}
