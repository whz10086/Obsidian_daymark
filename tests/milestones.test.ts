import { describe, expect, it } from "vitest";

import {
  ELDER_FUTHARK_RUNES,
  HEXAGRAM_STEP_HOURS,
  HEXAGRAM_STEP_SECONDS,
  HEXAGRAMS_PER_CYCLE,
  MILESTONE_HEXAGRAMS,
  MILESTONE_STAGES,
  MILESTONE_SYMBOL_SYSTEMS,
  RUNE_CYCLE_HOURS,
  buildMilestoneProgress,
  evaluateMilestoneProgress,
} from "../src/milestones";
import { makeEvent, makeHabit } from "./fixtures";

const HOUR = 60 * 60;
const CYCLE = 64 * HOUR;

describe("milestone symbol systems", () => {
  it("uses the complete King Wen sequence as the 64-step base cycle", () => {
    expect(HEXAGRAM_STEP_HOURS).toBe(1);
    expect(HEXAGRAM_STEP_SECONDS).toBe(HOUR);
    expect(HEXAGRAMS_PER_CYCLE).toBe(64);
    expect(RUNE_CYCLE_HOURS).toBe(64);
    expect(MILESTONE_HEXAGRAMS).toHaveLength(64);
    expect(MILESTONE_HEXAGRAMS[0]).toEqual({ number: 1, name: "乾", symbol: "䷀" });
    expect(MILESTONE_HEXAGRAMS[1]).toEqual({ number: 2, name: "坤", symbol: "䷁" });
    expect(MILESTONE_HEXAGRAMS[63]).toEqual({ number: 64, name: "未濟", symbol: "䷿" });
    expect(new Set(MILESTONE_HEXAGRAMS.map((hexagram) => hexagram.symbol))).toHaveLength(64);
  });

  it("orders the four historical symbol systems after each 64-hexagram cycle", () => {
    expect(MILESTONE_SYMBOL_SYSTEMS.map((system) => system.id)).toEqual([
      "elder-futhark",
      "classical-planets",
      "zodiac",
      "geomancy",
    ]);
    expect(MILESTONE_SYMBOL_SYSTEMS.map((system) => system.symbols.length)).toEqual([
      24,
      7,
      12,
      16,
    ]);
    expect(MILESTONE_STAGES).toHaveLength(59);
    expect(new Set(MILESTONE_STAGES.map((stage) => stage.id))).toHaveLength(59);

    for (const [index, stage] of MILESTONE_STAGES.entries()) {
      expect(stage.cycle).toBe(index + 1);
      expect(stage.thresholdSeconds).toBe((index + 1) * CYCLE);
      expect(stage.reward.id.trim()).not.toBe("");
      expect(stage.reward.name.trim()).not.toBe("");
      expect(stage.reward.symbol).not.toBe("");
      expect(stage.reward.meaning.trim()).not.toBe("");
    }
  });

  it("keeps the canonical 24-character Elder Futhark row first", () => {
    expect(ELDER_FUTHARK_RUNES.map((rune) => rune.symbol).join("")).toBe(
      "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ",
    );
    expect(MILESTONE_STAGES.slice(0, 24).map((stage) => stage.reward)).toEqual(
      ELDER_FUTHARK_RUNES,
    );
    for (const rune of ELDER_FUTHARK_RUNES) {
      expect(rune.sound).toMatch(/^\/.+\/(?:.+)?$/u);
    }
  });

  it("uses the inward-to-outward classical planet order", () => {
    const planets = MILESTONE_SYMBOL_SYSTEMS[1].symbols;
    expect(planets.map((planet) => planet.symbol).join("")).toBe("☽☿♀☉♂♃♄");
    expect(planets.map((planet) => planet.name)).toEqual([
      "月亮",
      "水星",
      "金星",
      "太阳",
      "火星",
      "木星",
      "土星",
    ]);
    expect(planets.map((planet) => planet.sound)).toEqual([
      "Moon /muːn/",
      "Mercury /ˈmɜːrkjəri/",
      "Venus /ˈviːnəs/",
      "Sun /sʌn/",
      "Mars /mɑːrz/",
      "Jupiter /ˈdʒuːpɪtər/",
      "Saturn /ˈsætərn/",
    ]);
  });

  it("forces all zodiac signs to text presentation", () => {
    const zodiac = MILESTONE_SYMBOL_SYSTEMS[2].symbols;
    for (const [index, sign] of zodiac.entries()) {
      expect([...sign.symbol].map((character) => character.codePointAt(0))).toEqual([
        0x2648 + index,
        0xfe0e,
      ]);
    }
    expect(zodiac.map((sign) => sign.sound)).toEqual([
      "Aries /ˈeəriːz/",
      "Taurus /ˈtɔːrəs/",
      "Gemini /ˈdʒemɪnaɪ/",
      "Cancer /ˈkænsər/",
      "Leo /ˈliːoʊ/",
      "Virgo /ˈvɜːrɡoʊ/",
      "Libra /ˈliːbrə/",
      "Scorpio /ˈskɔːrpioʊ/",
      "Sagittarius /ˌsædʒɪˈteəriəs/",
      "Capricorn /ˈkæprɪkɔːrn/",
      "Aquarius /əˈkweəriəs/",
      "Pisces /ˈpaɪsiːz/",
    ]);
  });

  it("maps the sixteen geomantic figures to Unicode and top-to-bottom point patterns", () => {
    const geomancy = MILESTONE_SYMBOL_SYSTEMS[3].symbols;
    expect(geomancy.map((figure) => figure.symbol.codePointAt(0))).toEqual(
      Array.from({ length: 16 }, (_, index) => 0x1cee0 + index),
    );
    expect(geomancy.map((figure) => figure.pattern)).toEqual([
      "2222",
      "2221",
      "2212",
      "2211",
      "2122",
      "2121",
      "2112",
      "2111",
      "1222",
      "1221",
      "1212",
      "1211",
      "1122",
      "1121",
      "1112",
      "1111",
    ]);
    expect(geomancy.map((figure) => figure.name)).toEqual([
      "众民",
      "悲哀",
      "白",
      "大福",
      "赤红",
      "获得",
      "联结",
      "龙首",
      "欢欣",
      "囚笼",
      "失去",
      "少女",
      "小福",
      "少年",
      "龙尾",
      "道路",
    ]);
    expect(geomancy.map((figure) => figure.sound)).toEqual([
      "Populus",
      "Tristitia",
      "Albus",
      "Fortuna Major",
      "Rubeus",
      "Acquisitio",
      "Conjunctio",
      "Caput Draconis",
      "Laetitia",
      "Carcer",
      "Amissio",
      "Puella",
      "Fortuna Minor",
      "Puer",
      "Cauda Draconis",
      "Via",
    ]);
    expect(geomancy.every((figure) => figure.soundLabel === "拉丁名")).toBe(true);
  });
});

describe("evaluateMilestoneProgress", () => {
  it("starts at the first hexagram with Fehu one cycle away", () => {
    expect(evaluateMilestoneProgress(0)).toMatchObject({
      totalSeconds: 0,
      completedStages: [],
      currentStage: undefined,
      nextStage: MILESTONE_STAGES[0],
      completedCycles: 0,
      currentCycle: 1,
      currentHexagram: MILESTONE_HEXAGRAMS[0],
      nextHexagram: MILESTONE_HEXAGRAMS[1],
      completedHexagramsInCycle: 0,
      hexagramProgress: 0,
      remainingHexagramSeconds: HOUR,
      cycleProgress: 0,
      remainingRewardSeconds: CYCLE,
      progress: 0,
      remainingSeconds: CYCLE,
    });
  });

  it("stays on Qian until the first hour is complete", () => {
    const result = evaluateMilestoneProgress(HOUR - 1);

    expect(result.currentHexagram).toBe(MILESTONE_HEXAGRAMS[0]);
    expect(result.nextHexagram).toBe(MILESTONE_HEXAGRAMS[1]);
    expect(result.completedHexagramsInCycle).toBe(0);
    expect(result.hexagramProgress).toBeCloseTo((HOUR - 1) / HOUR);
    expect(result.remainingHexagramSeconds).toBe(1);
    expect(result.cycleProgress).toBeCloseTo((HOUR - 1) / CYCLE);
  });

  it("moves to Kun exactly at one hour", () => {
    const result = evaluateMilestoneProgress(HOUR);

    expect(result.currentHexagram).toBe(MILESTONE_HEXAGRAMS[1]);
    expect(result.nextHexagram).toBe(MILESTONE_HEXAGRAMS[2]);
    expect(result.completedHexagramsInCycle).toBe(1);
    expect(result.hexagramProgress).toBe(0);
    expect(result.remainingHexagramSeconds).toBe(HOUR);
    expect(result.remainingRewardSeconds).toBe(63 * HOUR);
  });

  it("reaches Wei Ji one second before the first 64-hour cycle completes", () => {
    const result = evaluateMilestoneProgress(CYCLE - 1);

    expect(result.currentHexagram).toBe(MILESTONE_HEXAGRAMS[63]);
    expect(result.nextHexagram).toBe(MILESTONE_HEXAGRAMS[0]);
    expect(result.completedHexagramsInCycle).toBe(63);
    expect(result.hexagramProgress).toBeCloseTo((HOUR - 1) / HOUR);
    expect(result.remainingHexagramSeconds).toBe(1);
    expect(result.remainingRewardSeconds).toBe(1);
  });

  it("unlocks Fehu and restarts at Qian exactly at 64 hours", () => {
    const result = evaluateMilestoneProgress(CYCLE);

    expect(result.completedStages).toEqual([MILESTONE_STAGES[0]]);
    expect(result.currentStage).toBe(MILESTONE_STAGES[0]);
    expect(result.nextStage).toBe(MILESTONE_STAGES[1]);
    expect(result.completedCycles).toBe(1);
    expect(result.currentCycle).toBe(2);
    expect(result.currentHexagram).toBe(MILESTONE_HEXAGRAMS[0]);
    expect(result.completedHexagramsInCycle).toBe(0);
    expect(result.cycleProgress).toBe(0);
    expect(result.remainingRewardSeconds).toBe(CYCLE);
  });

  it("moves from all 24 runes into the classical planets at 1536 hours", () => {
    const result = evaluateMilestoneProgress(24 * CYCLE);

    expect(result.completedStages).toHaveLength(24);
    expect(result.currentStage?.reward.id).toBe("othala");
    expect(result.nextStage).toMatchObject({
      cycle: 25,
      systemId: "classical-planets",
      reward: { id: "moon", symbol: "☽" },
    });
    expect(result.currentCycle).toBe(25);
    expect(result.currentHexagram).toBe(MILESTONE_HEXAGRAMS[0]);
    expect(result.remainingRewardSeconds).toBe(CYCLE);
  });

  it("unlocks the Moon at 1600 hours and targets Mercury", () => {
    const result = evaluateMilestoneProgress(25 * CYCLE);

    expect(result.completedStages).toHaveLength(25);
    expect(result.currentStage).toMatchObject({
      systemId: "classical-planets",
      reward: { id: "moon", symbol: "☽" },
    });
    expect(result.nextStage).toMatchObject({
      cycle: 26,
      systemId: "classical-planets",
      reward: { id: "mercury", symbol: "☿" },
    });
    expect(result.currentCycle).toBe(26);
    expect(result.currentHexagram).toBe(MILESTONE_HEXAGRAMS[0]);
  });

  it("keeps cycling through the hexagrams after every configured reward is unlocked", () => {
    const finalThreshold = MILESTONE_STAGES[MILESTONE_STAGES.length - 1].thresholdSeconds;
    const complete = evaluateMilestoneProgress(finalThreshold);

    expect(complete.completedStages).toHaveLength(59);
    expect(complete.currentStage?.reward.id).toBe("via");
    expect(complete.nextStage).toBeUndefined();
    expect(complete.currentCycle).toBe(60);
    expect(complete.currentHexagram).toBe(MILESTONE_HEXAGRAMS[0]);
    expect(complete.cycleProgress).toBe(0);
    expect(complete.remainingRewardSeconds).toBe(0);
    expect(complete.progress).toBe(1);

    const later = evaluateMilestoneProgress(finalThreshold + 65 * HOUR);
    expect(later.completedStages).toHaveLength(59);
    expect(later.completedCycles).toBe(60);
    expect(later.currentCycle).toBe(61);
    expect(later.currentHexagram).toBe(MILESTONE_HEXAGRAMS[1]);
    expect(later.completedHexagramsInCycle).toBe(1);
    expect(later.cycleProgress).toBeCloseTo(1 / 64);
    expect(later.nextStage).toBeUndefined();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "treats an invalid total as zero: %s",
    (total) => {
      expect(evaluateMilestoneProgress(total)).toMatchObject({
        totalSeconds: 0,
        completedCycles: 0,
        currentCycle: 1,
        currentHexagram: MILESTONE_HEXAGRAMS[0],
      });
    },
  );
});

describe("buildMilestoneProgress", () => {
  it("sums all duration tasks while excluding other task types", () => {
    const reading = makeHabit("duration", { id: "habit_reading" });
    const exercise = makeHabit("duration", { id: "habit_exercise" });
    const repetitions = makeHabit("count", { id: "habit_repetitions" });
    const events = [
      makeEvent("add", { id: "event_reading", habitId: reading.id, value: 40 * HOUR }),
      makeEvent("add", { id: "event_exercise", habitId: exercise.id, value: 24 * HOUR }),
      makeEvent("add", { id: "event_repetitions", habitId: repetitions.id, value: 10_000 }),
    ];

    const result = buildMilestoneProgress([reading, exercise, repetitions], events);
    expect(result.totalSeconds).toBe(CYCLE);
    expect(result.completedStages).toEqual([MILESTONE_STAGES[0]]);
  });

  it("uses deterministic deduplication and global retractions", () => {
    const habit = makeHabit("duration", { id: "habit_duration" });
    const kept = makeEvent("add", {
      id: "event_kept",
      habitId: habit.id,
      value: 600,
      recordedAt: "2024-03-05T08:00:00.000Z",
    });
    const laterCopy = { ...kept, value: 6_000, recordedAt: "2024-03-05T09:00:00.000Z" };
    const removed = makeEvent("add", {
      id: "event_removed",
      habitId: habit.id,
      value: 1_200,
    });
    const retract = makeEvent("retract", {
      id: "event_retract_removed",
      habitId: habit.id,
      targetEventId: removed.id,
      occurredOn: "2024-03-06",
      recordedAt: "2024-03-06T08:00:00.000Z",
    });

    const result = buildMilestoneProgress(
      [habit],
      [laterCopy, removed, kept, { ...kept }, retract, { ...retract }],
    );

    expect(result.totalSeconds).toBe(600);
  });

  it("does not award a milestone for time spent paused", () => {
    const habit = makeHabit("duration", { id: "habit_pause" });
    const startedAt = Date.parse("2024-03-05T08:00:00.000Z");
    const result = buildMilestoneProgress([habit], [makeEvent("add", { habitId: habit.id, value: 63 * HOUR })],
      { habitId: habit.id, date: "2024-03-05", startedAt, pausedAt: startedAt + 1800_000 }, startedAt + 7200_000);
    expect(result.totalSeconds).toBe(63 * HOUR + 1800);
    expect(result.completedStages).toHaveLength(0);
  });

  it("adds a matching running timer and crosses the 64-hour reward boundary", () => {
    const duration = makeHabit("duration", { id: "habit_duration" });
    const count = makeHabit("count", { id: "habit_count" });
    const now = Date.parse("2024-03-05T09:00:00.000Z");
    const startedAt = Date.parse("2024-03-05T08:00:00.000Z");
    const saved = [makeEvent("add", { habitId: duration.id, value: 63 * HOUR })];

    const live = buildMilestoneProgress(
      [duration, count],
      saved,
      { habitId: duration.id, date: "2024-03-05", startedAt },
      now,
    );
    expect(live.totalSeconds).toBe(CYCLE);
    expect(live.completedStages).toEqual([MILESTONE_STAGES[0]]);
    expect(live.currentHexagram).toBe(MILESTONE_HEXAGRAMS[0]);

    const ignored = buildMilestoneProgress(
      [duration, count],
      saved,
      { habitId: count.id, date: "2024-03-05", startedAt },
      now,
    );
    expect(ignored.totalSeconds).toBe(63 * HOUR);
    expect(ignored.completedStages).toHaveLength(0);
    expect(ignored.currentHexagram).toBe(MILESTONE_HEXAGRAMS[63]);
  });
});
