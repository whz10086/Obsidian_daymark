import type { Habit, HabitType, TrackerEvent, TrackerEventType } from "../src/types";

export function makeHabit(type: HabitType = "checkbox", overrides: Partial<Habit> = {}): Habit {
  return {
    version: 1,
    id: `habit_${type}`,
    name: `${type} habit`,
    type,
    category: "日常",
    emoji: "✅",
    color: "#34a853",
    unit: type === "duration" ? "分钟" : type === "count" ? "次" : "",
    step: 1,
    order: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    rules: [
      {
        id: `rule_${type}`,
        effectiveFrom: "2024-01-01",
        enabled: true,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        target: type === "duration" ? 30 : type === "count" ? 3 : 1,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

export function makeEvent(
  type: TrackerEventType,
  overrides: Partial<TrackerEvent> = {},
): TrackerEvent {
  const defaultValue = type === "set" ? true : type === "note" ? "记录" : type === "add" ? 1 : undefined;
  return {
    version: 1,
    id: `event_${type}_0001`,
    habitId: "habit_checkbox",
    type,
    ...(defaultValue !== undefined ? { value: defaultValue } : {}),
    ...(type === "retract" ? { targetEventId: "event_target_0001" } : {}),
    occurredOn: "2024-03-05",
    recordedAt: "2024-03-05T08:00:00.000Z",
    timezone: "Asia/Shanghai",
    deviceId: "device_test_0001",
    note: "",
    ...overrides,
  };
}
