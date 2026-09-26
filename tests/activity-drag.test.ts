import { describe, expect, it } from "vitest";
import { canDropActivity, readActivityDrag, writeActivityDrag } from "../src/activity-drag";
function transfer() {
  const values = new Map<string, string>();
  return { values, get types() { return [...values.keys()]; }, getData: (key: string) => values.get(key) ?? "", setData: (key: string, value: string) => { values.set(key, value); } };
}
describe("native activity drag payload", () => {
  it("survives a cross-window transfer that strips custom MIME", () => {
    const data = transfer(); writeActivityDrag(data as unknown as DataTransfer, "habit_1");
    data.values.delete("application/x-daymark-habit");
    expect(canDropActivity(data as unknown as DataTransfer)).toBe(true);
    expect(readActivityDrag(data as unknown as DataTransfer)).toBe("habit_1");
  });
  it("does not treat arbitrary text or files as a task", () => {
    const data = transfer(); data.setData("text/plain", "habit_1");
    expect(readActivityDrag(data as unknown as DataTransfer)).toBeUndefined();
    expect(canDropActivity(null)).toBe(false);
  });
});
