export type HabitType = "checkbox" | "count" | "duration" | "text";
export type TrackerEventType = "set" | "add" | "note" | "retract";

export interface HabitRule {
  id: string;
  effectiveFrom: string;
  enabled: boolean;
  weekdays: number[];
  target: number;
  createdAt: string;
}

export interface Habit {
  version: 1;
  id: string;
  name: string;
  type: HabitType;
  category: string;
  emoji: string;
  color: string;
  unit: string;
  step: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  rules: HabitRule[];
}

export interface TrackerEvent {
  version: 1;
  id: string;
  habitId: string;
  type: TrackerEventType;
  value?: boolean | number | string;
  targetEventId?: string;
  occurredOn: string;
  recordedAt: string;
  timezone: string;
  deviceId: string;
  note: string;
}

export interface DailyRitualCheckIn {
  version: 1;
  id: string;
  type: "daily-ritual";
  occurredOn: string;
  recordedAt: string;
  timezone: string;
  deviceId: string;
  passageId: string;
}

export interface RunningTimer {
  habitId: string;
  date: string;
  startedAt: number;
  pausedAt?: number;
  lastRestReminderSeconds?: number;
}

export interface DaymarkSettings {
  dataFolder: string;
  firstDayOfWeek: "monday" | "sunday";
  timezone: string;
}

export interface DeviceState {
  deviceId: string;
  restTimer?: { startedAt: number; lastRestReminderSeconds?: number };
  runningTimer?: RunningTimer;
  lastDailyRitualDate?: string;
  reopenViewOnLoad?: boolean;
  reopenActivityOnLoad?: boolean;
  activityWindowPinned?: boolean;
  restSoundMode?: "bell" | "wood";
}

export interface HabitProjection {
  habitId: string;
  date: string;
  completed: boolean;
  value: boolean | number | string;
  notes: TrackerEvent[];
  activeEvents: TrackerEvent[];
  latestEvent?: TrackerEvent;
}

export interface DaySummary {
  date: string;
  scheduled: number;
  completed: number;
  ratio: number;
  hasActivity: boolean;
}

export interface DataIssue {
  path: string;
  message: string;
}
