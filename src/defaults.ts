import { generateId } from "./id";
import type { DaymarkSettings, Habit, HabitType } from "./types";

function detectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
  } catch {
    return "Asia/Shanghai";
  }
}

export function createDefaultSettings(): DaymarkSettings {
  return {
    dataFolder: "日迹",
    firstDayOfWeek: "monday",
    timezone: detectedTimezone(),
  };
}

export function createHabit(
  name: string,
  type: HabitType,
  date: string,
  order: number,
  options: Partial<Pick<Habit, "category" | "emoji" | "color" | "unit" | "step">> = {},
): Habit {
  const now = new Date().toISOString();
  const target = type === "duration" ? 1_800 : 1;
  return {
    version: 1,
    id: generateId("habit"),
    name,
    type,
    category: options.category ?? "日常",
    emoji: options.emoji ?? "✨",
    color: options.color ?? "#7c6fcd",
    unit: options.unit ?? (type === "duration" ? "分钟" : type === "count" ? "次" : ""),
    step: options.step ?? (type === "duration" ? 300 : 1),
    order,
    createdAt: now,
    updatedAt: now,
    rules: [
      {
        id: generateId("rule"),
        effectiveFrom: date,
        enabled: true,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        target,
        createdAt: now,
      },
    ],
  };
}

export const VIEW_TYPE_DAYMARK = "daymark-life-tracker-view";
