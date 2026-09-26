import { generateId } from "./id";
import { keyToDate } from "./date-utils";
import type { DaymarkSettings, DeviceState, TrackerEvent, TrackerEventType } from "./types";

interface EventInput {
  habitId: string;
  type: TrackerEventType;
  occurredOn: string;
  value?: boolean | number | string;
  targetEventId?: string;
  note?: string;
}

export function createTrackerEvent(
  settings: DaymarkSettings,
  deviceState: DeviceState,
  input: EventInput,
  now = new Date(),
): TrackerEvent {
  if (!["set", "add", "note", "retract"].includes(String(input.type))) {
    throw new Error("事件类型无效");
  }
  try {
    keyToDate(input.occurredOn);
  } catch {
    throw new Error("记录日期无效");
  }
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(input.habitId)) throw new Error("项目 ID 无效");
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(deviceState.deviceId)) throw new Error("设备 ID 无效");
  if (input.note !== undefined && typeof input.note !== "string") throw new Error("备注必须是文字");
  try {
    new Intl.DateTimeFormat("en", { timeZone: settings.timezone }).format();
  } catch {
    throw new Error("统计时区无效");
  }
  if (input.type === "add") {
    if (typeof input.value !== "number" || !Number.isFinite(input.value) || input.value <= 0) {
      throw new Error("增加值必须是大于 0 的有限数字");
    }
  }
  if (input.type === "note") {
    if (typeof input.value !== "string" || !input.value.trim()) {
      throw new Error("文字记录不能为空");
    }
  }
  if (input.type === "set" && typeof input.value !== "boolean") {
    throw new Error("完成型记录必须是布尔值");
  }
  if (input.type === "retract" && !input.targetEventId) {
    throw new Error("撤销操作缺少目标事件");
  }
  if (
    input.type === "retract" &&
    (typeof input.targetEventId !== "string" ||
      !/^[A-Za-z0-9_-]{6,160}$/.test(input.targetEventId))
  ) {
    throw new Error("撤销目标 ID 无效");
  }
  if (input.type === "retract" && input.value !== undefined) {
    throw new Error("撤销操作不能携带数值");
  }
  if (input.type !== "retract" && input.targetEventId !== undefined) {
    throw new Error("只有撤销操作可以指定目标事件");
  }
  return {
    version: 1,
    id: generateId("event"),
    habitId: input.habitId,
    type: input.type,
    value: input.value,
    targetEventId: input.targetEventId,
    occurredOn: input.occurredOn,
    recordedAt: now.toISOString(),
    timezone: settings.timezone,
    deviceId: deviceState.deviceId,
    note: input.note?.trim() ?? "",
  };
}
