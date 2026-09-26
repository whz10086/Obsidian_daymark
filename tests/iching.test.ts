import { describe, expect, it } from "vitest";

import {
  getDailyIChingIndex,
  getDailyIChingLine,
  getIChingLine,
  ICHING_LINES,
} from "../src/iching";

describe("I Ching line corpus", () => {
  it("contains exactly 64 hexagrams and 384 unique lines", () => {
    expect(ICHING_LINES).toHaveLength(384);
    expect(new Set(ICHING_LINES.map((line) => line.id))).toHaveLength(384);

    for (let hexagramNumber = 1; hexagramNumber <= 64; hexagramNumber += 1) {
      const lines = ICHING_LINES.filter((line) => line.hexagramNumber === hexagramNumber);
      expect(lines).toHaveLength(6);
      expect(lines.map((line) => line.position)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(new Set(lines.map((line) => line.hexagramName))).toHaveLength(1);
      expect(new Set(lines.map((line) => line.hexagramSymbol))).toHaveLength(1);
    }
  });

  it("gives every line complete, correctly indexed display data", () => {
    for (const line of ICHING_LINES) {
      expect(line.hexagramNumber).toBeGreaterThanOrEqual(1);
      expect(line.hexagramNumber).toBeLessThanOrEqual(64);
      expect(line.hexagramName.trim()).not.toBe("");
      expect(line.hexagramSymbol).toBe(
        String.fromCodePoint(0x4dc0 + line.hexagramNumber - 1),
      );
      expect(line.positionName.trim()).not.toBe("");
      expect(line.original).toContain(line.positionName);
      expect(line.original.trim().length).toBeGreaterThan(4);
      expect(line.explanation.trim().length).toBeGreaterThan(12);
    }

    expect(getIChingLine(1, 1)).toMatchObject({
      id: "01-1",
      hexagramName: "乾",
      hexagramSymbol: "䷀",
      positionName: "初九",
      original: "初九：潛龍，勿用。",
    });
    expect(getIChingLine(64, 6)).toMatchObject({
      id: "64-6",
      hexagramName: "未濟",
      hexagramSymbol: "䷿",
      positionName: "上九",
    });
  });
});

describe("daily I Ching line", () => {
  it("is deterministic for the same date and vault across calls and devices", () => {
    const first = getDailyIChingLine("2026-09-11", "日迹");
    const second = getDailyIChingLine("2026-09-11", "日迹");

    expect(second).toBe(first);
    expect(getDailyIChingIndex("2026-09-11", "日迹")).toBe(268);
    expect(first.id).toBe("45-5");
  });

  it("normalizes harmless vault-name whitespace and Unicode composition", () => {
    expect(getDailyIChingLine("2026-09-11", "  日迹  ")).toBe(
      getDailyIChingLine("2026-09-11", "日迹"),
    );
    expect(getDailyIChingLine("2026-09-11", "Cafe\u0301")).toBe(
      getDailyIChingLine("2026-09-11", "Café"),
    );
  });

  it("responds to date and vault identity changes", () => {
    const baseline = getDailyIChingLine("2026-09-11", "日迹");
    expect(getDailyIChingLine("2026-09-12", "日迹").id).not.toBe(baseline.id);
    expect(getDailyIChingLine("2026-09-11", "另一个库").id).not.toBe(baseline.id);
  });

  it("rejects invalid calendar dates, vault names, and direct indexes", () => {
    expect(() => getDailyIChingLine("2026-02-29", "日迹")).toThrow("Invalid calendar date");
    expect(() => getDailyIChingLine("11/09/2026", "日迹")).toThrow("Invalid date key");
    expect(() => getDailyIChingLine("2026-09-11", "   ")).toThrow(
      "Vault name must not be empty",
    );
    expect(() => getDailyIChingLine("2026-09-11", null as unknown as string)).toThrow(
      "Vault name must be a string",
    );
    expect(() => getIChingLine(0, 1)).toThrow("Invalid hexagram number");
    expect(() => getIChingLine(1, 7 as never)).toThrow("Invalid line position");
  });
});
