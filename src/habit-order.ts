import type { Habit } from "./types";

export interface HabitOrderGroup { category: string; ids: string[] }
export const habitCategory = (habit: Habit): string => habit.category || "日常";

export function applyHabitOrder(habits: Habit[], groups: HabitOrderGroup[]): Habit[] {
  const categories = new Map<string, Habit[]>();
  for (const habit of habits) {
    const category = habitCategory(habit);
    const group = categories.get(category) ?? [];
    group.push(habit); categories.set(category, group);
  }
  for (const [category, group] of categories) {
    const ids = groups.find((entry) => entry.category === category)?.ids ?? [];
    const ranks = new Map(ids.map((id, index) => [id, index]));
    group.sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity));
  }
  return [...categories.values()].flat();
}

export function moveHabitIds(habits: Habit[], sourceId: string, targetId: string, after = false): { category: string; ids: string[] } {
  const source = habits.find((habit) => habit.id === sourceId);
  const target = habits.find((habit) => habit.id === targetId);
  if (!source || !target) throw new Error("项目已变化，请刷新后重试");
  if (habitCategory(source) !== habitCategory(target)) throw new Error("请在同一分类内调整顺序，分类不会随拖动改变");
  const category = habitCategory(source);
  const ids = habits.filter((habit) => habitCategory(habit) === category).map((habit) => habit.id);
  if (sourceId !== targetId) {
    ids.splice(ids.indexOf(sourceId), 1);
    ids.splice(ids.indexOf(targetId) + Number(after), 0, sourceId);
  }
  return { category, ids };
}
