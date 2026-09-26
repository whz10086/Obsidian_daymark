import { describe, expect, it } from "vitest";

import { createTrackerEvent } from "../src/event-factory";
import type { DaymarkSettings, DeviceState } from "../src/types";

const settings: DaymarkSettings = {
  dataFolder: "Daymark",
  firstDayOfWeek: "monday",
  timezone: "Asia/Shanghai",
};

const deviceState: DeviceState = { deviceId: "device_test_0001" };
type EventInput = Parameters<typeof createTrackerEvent>[2];

function create(input: unknown, overrides: Partial<DaymarkSettings> = {}, state = deviceState) {
  return createTrackerEvent({ ...settings, ...overrides }, state, input as EventInput, new Date("2024-03-05T08:09:10.000Z"));
}

describe("createTrackerEvent", () => {
  it("creates a normalized, timestamped event", () => {
    expect(
      create({
        habitId: "habit_test_0001",
        type: "note",
        occurredOn: "2024-03-05",
        value: "今天完成了拉伸 🧘",
        note: "  状态很好  ",
      }),
    ).toMatchObject({
      version: 1,
      habitId: "habit_test_0001",
      type: "note",
      value: "今天完成了拉伸 🧘",
      occurredOn: "2024-03-05",
      recordedAt: "2024-03-05T08:09:10.000Z",
      timezone: "Asia/Shanghai",
      deviceId: "device_test_0001",
      note: "状态很好",
    });
  });

  it.each([
    ["an impossible date", { habitId: "habit_test_0001", type: "set", value: true, occurredOn: "2023-02-29" }],
    ["a malformed date", { habitId: "habit_test_0001", type: "set", value: true, occurredOn: "2024-2-01" }],
    ["an unsafe habit id", { habitId: "bad/id", type: "set", value: true, occurredOn: "2024-03-05" }],
    ["an unknown event type", { habitId: "habit_test_0001", type: "toggle", value: true, occurredOn: "2024-03-05" }],
    ["zero added value", { habitId: "habit_test_0001", type: "add", value: 0, occurredOn: "2024-03-05" }],
    ["negative added value", { habitId: "habit_test_0001", type: "add", value: -1, occurredOn: "2024-03-05" }],
    ["infinite added value", { habitId: "habit_test_0001", type: "add", value: Number.POSITIVE_INFINITY, occurredOn: "2024-03-05" }],
    ["non-number added value", { habitId: "habit_test_0001", type: "add", value: "2", occurredOn: "2024-03-05" }],
    ["blank text", { habitId: "habit_test_0001", type: "note", value: "   ", occurredOn: "2024-03-05" }],
    ["non-string text", { habitId: "habit_test_0001", type: "note", value: 1, occurredOn: "2024-03-05" }],
    ["non-boolean checkbox value", { habitId: "habit_test_0001", type: "set", value: 1, occurredOn: "2024-03-05" }],
    ["missing retract target", { habitId: "habit_test_0001", type: "retract", occurredOn: "2024-03-05" }],
    ["unsafe retract target", { habitId: "habit_test_0001", type: "retract", targetEventId: "x", occurredOn: "2024-03-05" }],
    ["a target on a set event", { habitId: "habit_test_0001", type: "set", value: true, targetEventId: "event_target_0001", occurredOn: "2024-03-05" }],
    ["a value on a retract event", { habitId: "habit_test_0001", type: "retract", value: true, targetEventId: "event_target_0001", occurredOn: "2024-03-05" }],
  ])("rejects %s", (_label, input) => {
    expect(() => create(input)).toThrow();
  });

  it("rejects an invalid statistics timezone", () => {
    expect(() =>
      create(
        { habitId: "habit_test_0001", type: "set", value: true, occurredOn: "2024-03-05" },
        { timezone: "Mars/Olympus_Mons" },
      ),
    ).toThrow("统计时区无效");
  });

  it("rejects an unsafe device id before producing an unparseable event", () => {
    expect(() =>
      create(
        { habitId: "habit_test_0001", type: "set", value: true, occurredOn: "2024-03-05" },
        {},
        { deviceId: "bad/device" },
      ),
    ).toThrow();
  });
});
