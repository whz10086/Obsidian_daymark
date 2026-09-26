import { describe, it, expect } from "vitest";
import { applyHabitOrder, moveHabitIds } from "../src/habit-order";
import { makeHabit } from "./fixtures";

describe("module order", () => {
  const habits = [makeHabit("duration", { id: "a", category: "学习" }), makeHabit("count", { id: "b", category: "学习" }),
    makeHabit("text", { id: "c", category: "学习" }), makeHabit("checkbox", { id: "d", category: "生活" })];
  it("moves all module types before/after peers without mutating their models", () => {
    const before = JSON.stringify(habits);
    const group = moveHabitIds(habits, "c", "a");
    expect(applyHabitOrder(habits, [group]).map(h => h.id)).toEqual(["c", "a", "b", "d"]);
    expect(moveHabitIds(habits, "a", "c", true).ids).toEqual(["b", "c", "a"]);
    expect(JSON.stringify(habits)).toBe(before);
  });
  it("rejects cross-category or missing targets and leaves self-drops unchanged", () => {
    expect(() => moveHabitIds(habits, "a", "d")).toThrow("同一分类");
    expect(() => moveHabitIds(habits, "missing", "a")).toThrow();
    expect(moveHabitIds(habits, "a", "a").ids).toEqual(["a", "b", "c"]);
  });
  it("keeps new modules and ignores removed IDs on reload", () => {
    expect(applyHabitOrder(habits, [{ category: "学习", ids: ["c", "gone", "b"] }]).map(h => h.id)).toEqual(["c", "b", "a", "d"]);
  });
});
