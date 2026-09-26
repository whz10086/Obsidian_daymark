import { describe, expect, it } from "vitest";

import {
  parseDailyRitualCheckInMarkdown,
  parseEventMarkdown,
  parseHabitMarkdown,
  renderDailyRitualCheckInMarkdown,
  renderEventMarkdown,
  renderHabitMarkdown,
} from "../src/data-codec";
import type { DailyRitualCheckIn, TrackerEvent } from "../src/types";
import { makeEvent, makeHabit } from "./fixtures";

const adversarialText = [
  "中文内容与 emoji 🧠🏃‍♀️",
  "```",
  "<!-- daymark:data:start -->",
  "<!-- daymark:data:end -->",
  "<!-- daymark:summary:start -->",
  "<!-- daymark:summary:end -->",
  "$& $` $' $$ replacement tokens",
].join("\n");

describe("habit Markdown codec", () => {
  it("round-trips every Habit field without damaging unusual text", () => {
    const habit = makeHabit("duration", {
      id: "habit_special_0001",
      name: adversarialText,
      category: `健康 / ${adversarialText}`,
      emoji: "🧘🏽‍♀️✨",
      unit: `分钟 ${adversarialText}`,
    });

    const markdown = renderHabitMarkdown(habit);

    expect(parseHabitMarkdown(markdown)).toStrictEqual(habit);
    expect(parseHabitMarkdown(`\uFEFF${markdown}`)).toStrictEqual(habit);
  });

  it("updates managed blocks while preserving the user's Markdown verbatim", () => {
    const original = makeHabit("count", { id: "habit_preserve_0001" });
    const userText = [
      "",
      "## 我的长期笔记",
      "",
      adversarialText,
      "",
      "```ts",
      "const marker = '<!-- daymark:data:start -->';",
      "```",
      "",
    ].join("\n");
    const previous = `${renderHabitMarkdown(original)}${userText}`;
    const updated = { ...original, category: "训练 🏋️", updatedAt: "2024-04-01T00:00:00.000Z" };

    const rendered = renderHabitMarkdown(updated, previous);

    expect(parseHabitMarkdown(rendered)).toStrictEqual(updated);
    expect(rendered.endsWith(userText)).toBe(true);
  });
});

describe("event Markdown codec", () => {
  const variants: TrackerEvent[] = [
    makeEvent("set", { id: "event_codec_set", value: false, note: adversarialText }),
    makeEvent("add", { id: "event_codec_add", value: 12.5, note: adversarialText }),
    makeEvent("note", { id: "event_codec_note", value: adversarialText, note: adversarialText }),
    makeEvent("retract", {
      id: "event_codec_retract",
      targetEventId: "event_codec_target",
      note: adversarialText,
    }),
  ];

  it.each(variants)("round-trips a $type event", (event) => {
    const markdown = renderEventMarkdown(event, adversarialText);

    expect(parseEventMarkdown(markdown)).toStrictEqual(event);
  });
});

describe("daily ritual check-in Markdown codec", () => {
  const checkIn: DailyRitualCheckIn = {
    version: 1,
    id: "checkin_codec_0001",
    type: "daily-ritual",
    occurredOn: "2024-03-05",
    recordedAt: "2024-03-05T08:00:00.000Z",
    timezone: "Asia/Shanghai",
    deviceId: "device_test_0001",
    passageId: "daodejing-08-water",
  };

  it("round-trips a check-in and marks its Markdown kind", () => {
    const markdown = renderDailyRitualCheckInMarkdown(checkIn);

    expect(markdown).toContain("daymark-kind: daily-ritual-check-in");
    expect(parseDailyRitualCheckInMarkdown(markdown)).toStrictEqual(checkIn);
    expect(parseDailyRitualCheckInMarkdown(`\uFEFF${markdown}`)).toStrictEqual(checkIn);
  });

  it("rejects an unsafe passage ID", () => {
    const markdown = renderDailyRitualCheckInMarkdown({
      ...checkIn,
      passageId: "../../outside",
    });

    expect(() => parseDailyRitualCheckInMarkdown(markdown)).toThrow("签到文件版本不受支持");
  });
});
