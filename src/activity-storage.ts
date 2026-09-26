import { App, TFolder, normalizePath } from "obsidian";
import { generateId } from "./id";
import type { ActivitySelection } from "./activity-list";
import type { DataIssue } from "./types";

export class ActivityStorage {
  constructor(private readonly app: App, private readonly root: string) {}
  get folder(): string { return normalizePath(`${this.root}/活动列表`); }

  async load(): Promise<{ entries: ActivitySelection[]; issues: DataIssue[] }> {
    const entries: ActivitySelection[] = [];
    const issues: DataIssue[] = [];
    for (const file of this.app.vault.getFiles().filter((file) => file.path.startsWith(`${this.folder}/`) && file.extension === "json")) {
      try {
        const data = JSON.parse(await this.app.vault.cachedRead(file));
        if (data.version !== 1 || typeof data.id !== "string" || typeof data.habitId !== "string" ||
          typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
          typeof data.included !== "boolean" || typeof data.recordedAt !== "string" || !Number.isFinite(Date.parse(data.recordedAt))) {
          throw new Error("无效的活动列表记录");
        }
        entries.push(data);
      } catch (error) { issues.push({ path: file.path, message: error instanceof Error ? error.message : String(error) }); }
    }
    return { entries, issues };
  }

  async append(date: string, habitId: string, included: boolean): Promise<void> {
    let cursor = "";
    for (const segment of this.folder.split("/")) {
      cursor = cursor ? `${cursor}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(cursor);
      if (existing && !(existing instanceof TFolder)) throw new Error(`${cursor} 不是文件夹`);
      if (!existing) {
        try { await this.app.vault.createFolder(cursor); }
        catch (error) { if (!(this.app.vault.getAbstractFileByPath(cursor) instanceof TFolder)) throw error; }
      }
    }
    const previous = (await this.load()).entries.filter((item) => item.date === date && item.habitId === habitId)
      .reduce((latest, item) => Math.max(latest, Date.parse(item.recordedAt)), 0);
    const entry: ActivitySelection = { version: 1, id: generateId("activity"), date, habitId, included, recordedAt: new Date(Math.max(Date.now(), previous + 1)).toISOString() };
    await this.app.vault.create(`${this.folder}/${entry.id}.json`, JSON.stringify(entry, null, 2));
  }
}
