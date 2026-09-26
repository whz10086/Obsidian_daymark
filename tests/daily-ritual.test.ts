import { describe, expect, it } from "vitest";

import { addDays } from "../src/date-utils";
import { DAILY_RITUAL_PASSAGES, getDailyRitualPassage } from "../src/daily-ritual";

describe("daily ritual passages", () => {
  it("keeps every original and translation within 100 characters", () => {
    expect(DAILY_RITUAL_PASSAGES.length).toBeGreaterThanOrEqual(12);
    for (const passage of DAILY_RITUAL_PASSAGES) {
      expect(passage.original.trim().length, passage.id).toBeGreaterThan(0);
      expect(passage.original.trim().length, passage.id).toBeLessThanOrEqual(100);
      expect(passage.translation.trim().length, passage.id).toBeGreaterThan(0);
      expect(passage.translation.trim().length, passage.id).toBeLessThanOrEqual(100);
    }
  });

  it("contains unique entries from both requested classics", () => {
    const ids = DAILY_RITUAL_PASSAGES.map((passage) => passage.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DAILY_RITUAL_PASSAGES.some((passage) => passage.source.includes("道德经"))).toBe(true);
    expect(DAILY_RITUAL_PASSAGES.some((passage) => passage.source.includes("清静经"))).toBe(true);
  });

  it("is stable for the same date and Vault identity", () => {
    expect(getDailyRitualPassage("2026-09-13", "vault-alpha")).toEqual(
      getDailyRitualPassage("2026-09-13", "vault-alpha"),
    );
    expect(getDailyRitualPassage("2026-09-13", " vault-alpha ")).toEqual(
      getDailyRitualPassage("2026-09-13", "vault-alpha"),
    );
  });

  it("varies the selection across dates", () => {
    const selected = new Set<string>();
    let date = "2026-01-01";
    for (let index = 0; index < 64; index += 1) {
      selected.add(getDailyRitualPassage(date, "vault-alpha").id);
      date = addDays(date, 1);
    }
    expect(selected.size).toBeGreaterThan(8);
  });

  it("rejects invalid inputs", () => {
    expect(() => getDailyRitualPassage("2026-02-30", "vault-alpha")).toThrow();
    expect(() => getDailyRitualPassage("2026-09-13", "   ")).toThrow();
  });
});
