import { App, TFile, normalizePath } from "obsidian";
import type { HabitOrderGroup } from "./habit-order";

function parse(content: string): HabitOrderGroup[] {
  const data = JSON.parse(content);
  if (data.version !== 1 || !Array.isArray(data.groups) || data.groups.some((group: HabitOrderGroup) =>
    !group || typeof group.category !== "string" || !Array.isArray(group.ids) || group.ids.some((id) => typeof id !== "string") || new Set(group.ids).size !== group.ids.length)) {
    throw new Error("项目顺序文件格式无效，原文件已保留");
  }
  return data.groups;
}

export class HabitOrderStorage {
  constructor(private readonly app: App, root: string) { this.path = normalizePath(`${root}/项目顺序.json`); }
  readonly path: string;
  async load(): Promise<HabitOrderGroup[]> {
    const file = this.app.vault.getAbstractFileByPath(this.path);
    if (!file) return [];
    if (!(file instanceof TFile)) throw new Error("项目顺序路径不是文件");
    return parse(await this.app.vault.cachedRead(file));
  }
  async save(group: HabitOrderGroup, expectedIds: string[]): Promise<void> {
    const update = (content?: string): string => {
      const groups = content === undefined ? [] : parse(content);
      const existing = groups.find((entry) => entry.category === group.category)?.ids ?? [];
      if (JSON.stringify(existing) !== JSON.stringify(expectedIds)) throw new Error("顺序已在另一端更新，请刷新后重试");
      return JSON.stringify({ version: 1, groups: [...groups.filter((entry) => entry.category !== group.category), group] }, null, 2);
    };
    const file = this.app.vault.getAbstractFileByPath(this.path);
    if (file instanceof TFile) await this.app.vault.process(file, update);
    else if (file) throw new Error("项目顺序路径不是文件");
    else await this.app.vault.create(this.path, update());
  }
}
