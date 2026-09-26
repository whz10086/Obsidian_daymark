import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  endOfMonth,
  isFutureDate,
  keyToDate,
  startOfMonth,
  todayKey,
} from "../src/date-utils";

describe("date-utils", () => {
  it("handles ordinary and leap-year month ends", () => {
    expect(startOfMonth("2024-02-29")).toBe("2024-02-01");
    expect(endOfMonth("2023-02-10")).toBe("2023-02-28");
    expect(endOfMonth("2024-02-10")).toBe("2024-02-29");
    expect(endOfMonth("2000-02-10")).toBe("2000-02-29");
    expect(endOfMonth("2100-02-10")).toBe("2100-02-28");
    expect(endOfMonth("2024-12-31")).toBe("2024-12-31");
  });

  it("crosses month, leap-day, and year boundaries without local-time drift", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDays("2023-12-31", 1)).toBe("2024-01-01");
    expect(addDays("2024-01-01", -1)).toBe("2023-12-31");
    expect(addMonths("2024-12-31", 1)).toBe("2025-01-01");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-01");
  });

  it("validates leap days instead of letting Date normalize them", () => {
    expect(keyToDate("2024-02-29").toISOString()).toBe("2024-02-29T12:00:00.000Z");
    expect(() => keyToDate("2023-02-29")).toThrow("Invalid calendar date");
    expect(() => keyToDate("2100-02-29")).toThrow("Invalid calendar date");
    expect(() => keyToDate("2024-13-01")).toThrow("Invalid calendar date");
    expect(() => keyToDate("2024-2-9")).toThrow("Invalid date key");
  });

  it("derives the calendar day in the requested timezone", () => {
    const instant = new Date("2024-02-29T16:30:00.000Z");

    expect(todayKey(instant, "UTC")).toBe("2024-02-29");
    expect(todayKey(instant, "Asia/Shanghai")).toBe("2024-03-01");
    expect(todayKey(instant, "America/Los_Angeles")).toBe("2024-02-29");
    expect(isFutureDate("2024-03-01", instant, "UTC")).toBe(true);
    expect(isFutureDate("2024-03-01", instant, "Asia/Shanghai")).toBe(false);
  });
});
