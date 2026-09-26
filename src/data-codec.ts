import type { DailyRitualCheckIn, Habit, TrackerEvent } from "./types";
import { keyToDate } from "./date-utils";

const DATA_START = "<!-- daymark:data:start -->";
const DATA_END = "<!-- daymark:data:end -->";
const SUMMARY_START = "<!-- daymark:summary:start -->";
const SUMMARY_END = "<!-- daymark:summary:end -->";

function fencedJson(value: unknown): string {
  return `${DATA_START}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n${DATA_END}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function managedBlockPattern(startMarker: string, endMarker: string): RegExp {
  if (startMarker === DATA_START && endMarker === DATA_END) {
    return new RegExp(
      `^${escapeRegExp(DATA_START)}\\r?\\n\`\`\`json\\r?\\n[\\s\\S]*?\\r?\\n\`\`\`\\r?\\n${escapeRegExp(DATA_END)}\\r?$`,
      "m",
    );
  }
  return new RegExp(
    `^${escapeRegExp(startMarker)}\\r?$[\\s\\S]*?^${escapeRegExp(endMarker)}\\r?$`,
    "m",
  );
}

function replaceManagedBlock(
  markdown: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const pattern = managedBlockPattern(startMarker, endMarker);
  if (!pattern.test(markdown)) {
    return `${markdown.trimEnd()}\n\n${replacement}\n`;
  }
  return markdown.replace(pattern, () => replacement);
}

function extractJson(markdown: string): unknown {
  const source = markdown.charCodeAt(0) === 0xfeff ? markdown.slice(1) : markdown;
  const block = source.match(managedBlockPattern(DATA_START, DATA_END))?.[0];
  if (!block) throw new Error("找不到日迹数据区块");
  const match = block.match(/^```json\r?\n([\s\S]*?)\r?\n```$/m);
  if (!match) throw new Error("日迹数据区块不是有效的 JSON 代码块");
  return JSON.parse(match[1]);
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]<>|]/g, "\\$&").replace(/\r?\n/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,160}$/.test(value);
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && value.includes("T") && Number.isFinite(Date.parse(value));
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    keyToDate(value);
    return true;
  } catch {
    return false;
  }
}

function isTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function assertHabit(data: Partial<Habit>): asserts data is Habit {
  if (
    data.version !== 1 ||
    !isSafeId(data.id) ||
    typeof data.name !== "string" ||
    !data.name.trim() ||
    !["checkbox", "count", "duration", "text"].includes(String(data.type)) ||
    typeof data.category !== "string" ||
    typeof data.emoji !== "string" ||
    typeof data.color !== "string" ||
    typeof data.unit !== "string" ||
    typeof data.step !== "number" ||
    !Number.isFinite(data.step) ||
    data.step <= 0 ||
    typeof data.order !== "number" ||
    !Number.isFinite(data.order) ||
    !isIsoDateTime(data.createdAt) ||
    !isIsoDateTime(data.updatedAt) ||
    !Array.isArray(data.rules) ||
    data.rules.length === 0
  ) {
    throw new Error("项目文件版本不受支持或内容损坏");
  }
  const validRules = data.rules.every((unknownRule) => {
    if (!isRecord(unknownRule)) return false;
    const weekdays = unknownRule.weekdays;
    return (
      isSafeId(unknownRule.id) &&
      isDateKey(unknownRule.effectiveFrom) &&
      typeof unknownRule.enabled === "boolean" &&
      Array.isArray(weekdays) &&
      weekdays.length > 0 &&
      weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
      new Set(weekdays).size === weekdays.length &&
      typeof unknownRule.target === "number" &&
      Number.isFinite(unknownRule.target) &&
      unknownRule.target > 0 &&
      isIsoDateTime(unknownRule.createdAt)
    );
  });
  if (!validRules) throw new Error("项目规则内容损坏");
}

function assertEvent(data: Partial<TrackerEvent>): asserts data is TrackerEvent {
  if (
    data.version !== 1 ||
    !isSafeId(data.id) ||
    !isSafeId(data.habitId) ||
    !["set", "add", "note", "retract"].includes(String(data.type)) ||
    !isDateKey(data.occurredOn) ||
    !isIsoDateTime(data.recordedAt) ||
    !isTimezone(data.timezone) ||
    !isSafeId(data.deviceId) ||
    typeof data.note !== "string"
  ) {
    throw new Error("事件文件版本不受支持或内容损坏");
  }
  const validPayload =
    (data.type === "set" && typeof data.value === "boolean" && data.targetEventId === undefined) ||
    (data.type === "add" &&
      typeof data.value === "number" &&
      Number.isFinite(data.value) &&
      data.value > 0 &&
      data.targetEventId === undefined) ||
    (data.type === "note" &&
      typeof data.value === "string" &&
      data.value.trim().length > 0 &&
      data.targetEventId === undefined) ||
    (data.type === "retract" && isSafeId(data.targetEventId) && data.value === undefined);
  if (!validPayload) throw new Error("事件数值与操作类型不匹配");
}

function assertDailyRitualCheckIn(
  data: Partial<DailyRitualCheckIn>,
): asserts data is DailyRitualCheckIn {
  if (
    data.version !== 1 ||
    !isSafeId(data.id) ||
    data.type !== "daily-ritual" ||
    !isDateKey(data.occurredOn) ||
    !isIsoDateTime(data.recordedAt) ||
    !isTimezone(data.timezone) ||
    !isSafeId(data.deviceId) ||
    !isSafeId(data.passageId)
  ) {
    throw new Error("签到文件版本不受支持或内容损坏");
  }
}

export function parseHabitMarkdown(markdown: string): Habit {
  const data = extractJson(markdown) as Partial<Habit>;
  assertHabit(data);
  return data;
}

export function parseEventMarkdown(markdown: string): TrackerEvent {
  const data = extractJson(markdown) as Partial<TrackerEvent>;
  assertEvent(data);
  return data;
}

export function parseDailyRitualCheckInMarkdown(markdown: string): DailyRitualCheckIn {
  const data = extractJson(markdown) as Partial<DailyRitualCheckIn>;
  assertDailyRitualCheckIn(data);
  return data;
}

export function renderHabitMarkdown(habit: Habit, previous = ""): string {
  const sortedRules = [...habit.rules].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
  const latestRule = sortedRules[sortedRules.length - 1];
  const targetText =
    habit.type === "duration"
      ? `${((latestRule?.target ?? 0) / 60).toLocaleString("zh-CN")} 分钟`
      : `${latestRule?.target ?? 0} ${escapeMarkdown(habit.unit)}`.trim();
  const summary = [
    SUMMARY_START,
    "## 当前设置",
    "",
    `- 类型：${habit.type}`,
    `- 分类：${escapeMarkdown(habit.category)}`,
    `- 目标：${targetText}`,
    `- 生效日期：${latestRule?.effectiveFrom ?? "-"}`,
    `- 状态：${latestRule?.enabled ? "启用" : "归档"}`,
    SUMMARY_END,
  ].join("\n");
  if (!previous.trim()) {
    return [
      "---",
      "daymark-kind: habit",
      `daymark-id: ${habit.id}`,
      "daymark-version: 1",
      "---",
      "",
      `# ${habit.emoji} ${escapeMarkdown(habit.name)}`,
      "",
      "> 此文件会随 Vault 同步。请优先在日迹界面中修改设置。",
      "",
      fencedJson(habit),
      "",
      summary,
      "",
      "## 项目说明",
      "",
      "这里的文字不会被插件覆盖。",
      "",
    ].join("\n");
  }
  let next = replaceManagedBlock(previous, DATA_START, DATA_END, fencedJson(habit));
  next = replaceManagedBlock(next, SUMMARY_START, SUMMARY_END, summary);
  return next;
}

export function renderEventMarkdown(event: TrackerEvent, habitName = "未知项目"): string {
  const value =
    event.type === "retract" ? `撤销 ${event.targetEventId ?? ""}` : String(event.value ?? "");
  return [
    "---",
    "daymark-kind: event",
    `daymark-id: ${event.id}`,
    `daymark-habit: ${event.habitId}`,
    `date: ${event.occurredOn}`,
    "daymark-version: 1",
    "---",
    "",
    `# ${escapeMarkdown(habitName)} · ${event.occurredOn}`,
    "",
    `- 操作：${event.type}`,
    `- 数值：${escapeMarkdown(value)}`,
    `- 记录时间：${event.recordedAt}`,
    event.note ? `- 备注：${escapeMarkdown(event.note)}` : "",
    "",
    fencedJson(event),
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function renderDailyRitualCheckInMarkdown(checkIn: DailyRitualCheckIn): string {
  return [
    "---",
    "daymark-kind: daily-ritual-check-in",
    `daymark-id: ${checkIn.id}`,
    `date: ${checkIn.occurredOn}`,
    `daymark-passage: ${checkIn.passageId}`,
    "daymark-version: 1",
    "---",
    "",
    `# 每日经文签到 · ${checkIn.occurredOn}`,
    "",
    `- 篇章：${escapeMarkdown(checkIn.passageId)}`,
    `- 签到时间：${checkIn.recordedAt}`,
    "",
    fencedJson(checkIn),
    "",
  ].join("\n");
}
