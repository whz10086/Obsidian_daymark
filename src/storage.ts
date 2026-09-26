import { App, normalizePath, TFile, TFolder } from "obsidian";

import {
  parseDailyRitualCheckInMarkdown,
  parseEventMarkdown,
  parseHabitMarkdown,
  renderDailyRitualCheckInMarkdown,
  renderEventMarkdown,
  renderHabitMarkdown,
} from "./data-codec";
import { generateId } from "./id";
import type { DailyRitualCheckIn, DataIssue, Habit, TrackerEvent } from "./types";

export interface StorageSnapshot {
  habits: Habit[];
  events: TrackerEvent[];
  checkIns: DailyRitualCheckIn[];
  issues: DataIssue[];
}

interface Sourced<T> {
  data: T;
  path: string;
}

const VAULT_ID_KEY = "daymark-vault-id";

function parseVaultIdentity(content: string): string | undefined {
  const match = content.match(/^daymark-vault-id:\s*([A-Za-z0-9_-]{8,160})\s*$/m);
  return match?.[1];
}

function contentIdentity(content: string): string {
  let hash = 0x811c9dc5;
  for (const character of content.normalize("NFC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `vault_content_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function renderVaultIdentity(id: string): string {
  return [
    "---",
    `${VAULT_ID_KEY}: ${id}`,
    "---",
    "",
    "# 日迹库标识",
    "",
    "此文件让同一份日迹数据在不同设备上显示一致的每日一爻。请保留并同步此文件。",
    "",
  ].join("\n");
}

export function validateDataFolder(value: string): string | undefined {
  const raw = value.trim().replace(/\\/g, "/");
  if (/^[A-Za-z]:/.test(raw) || raw.startsWith("/")) return "数据文件夹必须是 Vault 内的相对路径";
  const rawSegments = raw.split("/");
  if (rawSegments.some((segment) => segment === "." || segment === "..")) {
    return "数据文件夹不能包含 . 或 .. 路径段";
  }
  const normalized = normalizePath(raw);
  if (!normalized || normalized === "/") return "数据文件夹不能为空";
  const lower = normalized.toLocaleLowerCase("en-US");
  if (lower === ".obsidian" || lower.startsWith(".obsidian/")) {
    return "数据不能保存在 .obsidian 配置目录中";
  }
  return undefined;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export class DaymarkStorage {
  constructor(
    private readonly app: App,
    private dataFolder: string,
  ) {}

  setDataFolder(folder: string): void {
    const problem = validateDataFolder(folder);
    if (problem) throw new Error(problem);
    this.dataFolder = normalizePath(folder);
  }

  get root(): string {
    return normalizePath(this.dataFolder);
  }

  get habitsFolder(): string {
    return normalizePath(`${this.root}/项目`);
  }

  get eventsFolder(): string {
    return normalizePath(`${this.root}/记录`);
  }

  get checkInsFolder(): string {
    return normalizePath(`${this.root}/签到`);
  }

  get vaultIdentityPath(): string {
    return normalizePath(`${this.root}/日迹库标识.md`);
  }

  isManagedPath(path: string): boolean {
    const normalized = normalizePath(path);
    return normalized === this.root || normalized.startsWith(`${this.root}/`);
  }

  private async ensureFolder(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const segments = normalized.split("/").filter(Boolean);
    let cursor = "";
    for (const segment of segments) {
      cursor = cursor ? `${cursor}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(cursor);
      if (!existing) {
        try {
          await this.app.vault.createFolder(cursor);
        } catch (error) {
          if (!(this.app.vault.getAbstractFileByPath(cursor) instanceof TFolder)) throw error;
        }
      } else if (!(existing instanceof TFolder)) {
        throw new Error(`${cursor} 已存在，但不是文件夹`);
      }
    }
  }

  async initialize(): Promise<void> {
    const problem = validateDataFolder(this.root);
    if (problem) throw new Error(problem);
    await this.ensureFolder(this.habitsFolder);
    await this.ensureFolder(this.eventsFolder);
    await this.ensureFolder(this.checkInsFolder);
  }

  async getOrCreateVaultIdentity(): Promise<string> {
    const problem = validateDataFolder(this.root);
    if (problem) throw new Error(problem);
    await this.ensureFolder(this.root);

    const readIdentity = async (file: TFile): Promise<string> => {
      const content = await this.app.vault.cachedRead(file);
      return parseVaultIdentity(content) ?? contentIdentity(content);
    };
    const existing = this.app.vault.getAbstractFileByPath(this.vaultIdentityPath);
    if (existing instanceof TFile) return readIdentity(existing);
    if (existing) throw new Error(`${this.vaultIdentityPath} 已存在，但不是文件`);

    const id = generateId("vault");
    try {
      await this.app.vault.create(this.vaultIdentityPath, renderVaultIdentity(id));
      return id;
    } catch (error) {
      // Another device or concurrent reload may have created the shared marker first.
      const raced = this.app.vault.getAbstractFileByPath(this.vaultIdentityPath);
      if (raced instanceof TFile) return readIdentity(raced);
      throw error;
    }
  }

  async loadAll(): Promise<StorageSnapshot> {
    await this.initialize();
    const issues: DataIssue[] = [];
    const habitSources: Sourced<Habit>[] = [];
    const eventSources: Sourced<TrackerEvent>[] = [];
    const checkInSources: Sourced<DailyRitualCheckIn>[] = [];
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => this.isManagedPath(file.path))
      .sort((a, b) => a.path.localeCompare(b.path));

    const readFile = async (file: TFile): Promise<void> => {
        try {
          const content = await this.app.vault.cachedRead(file);
          if (file.path.startsWith(`${this.habitsFolder}/`)) {
            habitSources.push({ data: parseHabitMarkdown(content), path: file.path });
          } else if (file.path.startsWith(`${this.eventsFolder}/`)) {
            eventSources.push({ data: parseEventMarkdown(content), path: file.path });
          } else if (file.path.startsWith(`${this.checkInsFolder}/`)) {
            checkInSources.push({ data: parseDailyRitualCheckInMarkdown(content), path: file.path });
          }
        } catch (error) {
          issues.push({
            path: file.path,
            message: error instanceof Error ? error.message : String(error),
          });
        }
    };
    for (let index = 0; index < files.length; index += 32) {
      await Promise.all(files.slice(index, index + 32).map(readFile));
    }

    const habitGroups = new Map<string, Sourced<Habit>[]>();
    for (const source of habitSources.sort((a, b) => a.path.localeCompare(b.path))) {
      const group = habitGroups.get(source.data.id) ?? [];
      group.push(source);
      habitGroups.set(source.data.id, group);
    }
    const mergedHabits: Habit[] = [];
    for (const [habitId, group] of habitGroups) {
      const ranked = [...group].sort(
        (a, b) =>
          b.data.updatedAt.localeCompare(a.data.updatedAt) || a.path.localeCompare(b.path),
      );
      const winner = ranked[0];
      const rules = new Map<string, Habit["rules"][number]>();
      for (const source of group) {
        for (const rule of source.data.rules) {
          const existing = rules.get(rule.id);
          if (!existing) rules.set(rule.id, rule);
          else if (stableJson(existing) !== stableJson(rule)) {
            issues.push({ path: source.path, message: `项目 ${habitId} 的规则 ${rule.id} 冲突` });
          }
        }
      }
      if (group.length > 1) {
        for (const duplicate of group.filter((source) => source !== winner)) {
          issues.push({ path: duplicate.path, message: `发现重复项目 ID：${habitId}，规则已合并` });
        }
      }
      mergedHabits.push({
        ...winner.data,
        rules: [...rules.values()].sort(
          (a, b) =>
            a.effectiveFrom.localeCompare(b.effectiveFrom) ||
            a.createdAt.localeCompare(b.createdAt) ||
            a.id.localeCompare(b.id),
        ),
      });
    }

    const eventsById = new Map<string, Sourced<TrackerEvent>>();
    const conflictedEventIds = new Set<string>();
    for (const source of eventSources.sort((a, b) => a.path.localeCompare(b.path))) {
      if (conflictedEventIds.has(source.data.id)) continue;
      const previous = eventsById.get(source.data.id);
      if (!previous) {
        eventsById.set(source.data.id, source);
        continue;
      }
      if (stableJson(previous.data) !== stableJson(source.data)) {
        issues.push({ path: source.path, message: `事件 ID 冲突：${source.data.id}` });
        issues.push({ path: previous.path, message: `事件 ID 冲突：${source.data.id}` });
        eventsById.delete(source.data.id);
        conflictedEventIds.add(source.data.id);
      }
    }

    const habitsById = new Map(mergedHabits.map((habit) => [habit.id, habit]));
    const compatibleEventSources: Sourced<TrackerEvent>[] = [];
    for (const source of eventsById.values()) {
      const habit = habitsById.get(source.data.habitId);
      if (!habit) {
        issues.push({ path: source.path, message: `找不到关联项目：${source.data.habitId}` });
        continue;
      }
      const typeMatches =
        source.data.type === "retract" ||
        (source.data.type === "set" && habit.type === "checkbox") ||
        (source.data.type === "add" && (habit.type === "count" || habit.type === "duration")) ||
        (source.data.type === "note" && habit.type === "text");
      if (!typeMatches) {
        issues.push({ path: source.path, message: `事件类型与项目类型 ${habit.type} 不匹配` });
        continue;
      }
      compatibleEventSources.push(source);
    }
    const compatibleById = new Map(
      compatibleEventSources.map((source) => [source.data.id, source]),
    );
    const validEventSources = compatibleEventSources.filter((source) => {
      if (source.data.type !== "retract") return true;
      const target = source.data.targetEventId
        ? compatibleById.get(source.data.targetEventId)
        : undefined;
      if (
        !target ||
        target.data.type === "retract" ||
        target.data.habitId !== source.data.habitId ||
        target.data.occurredOn !== source.data.occurredOn
      ) {
        issues.push({ path: source.path, message: "撤销操作找不到同日、同项目的原始事件" });
        return false;
      }
      return true;
    });

    const checkInGroups = new Map<string, Sourced<DailyRitualCheckIn>[]>();
    for (const source of checkInSources.sort((a, b) => a.path.localeCompare(b.path))) {
      const group = checkInGroups.get(source.data.id) ?? [];
      group.push(source);
      checkInGroups.set(source.data.id, group);
    }
    const checkIns: DailyRitualCheckIn[] = [];
    for (const [checkInId, group] of checkInGroups) {
      if (new Set(group.map((source) => stableJson(source.data))).size > 1) {
        for (const source of group) {
          issues.push({ path: source.path, message: `签到 ID 冲突：${checkInId}` });
        }
        continue;
      }
      checkIns.push(group[0].data);
    }

    return {
      habits: mergedHabits.sort(
        (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
      ),
      events: validEventSources
        .map((source) => source.data)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id)),
      checkIns: checkIns.sort(
        (a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id),
      ),
      issues: issues.sort((a, b) => a.path.localeCompare(b.path)),
    };
  }

  async saveHabit(habit: Habit, expectedUpdatedAt?: string): Promise<void> {
    parseHabitMarkdown(renderHabitMarkdown(habit));
    await this.initialize();
    const path = normalizePath(`${this.habitsFolder}/${habit.id}.md`);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!existing) {
      await this.app.vault.create(path, renderHabitMarkdown(habit));
      return;
    }
    if (!(existing instanceof TFile)) throw new Error(`${path} 已存在，但不是文件`);
    await this.app.vault.process(existing, (content) => {
      const current = parseHabitMarkdown(content);
      if (current.id !== habit.id) throw new Error("项目文件 ID 与保存内容不一致，已拒绝覆盖");
      if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
        throw new Error("这个项目已在另一端发生变化。请重新打开编辑窗口后再试。");
      }
      return renderHabitMarkdown(habit, content);
    });
  }

  async appendEvent(event: TrackerEvent, habitName: string): Promise<void> {
    parseEventMarkdown(renderEventMarkdown(event, habitName));
    await this.initialize();
    const [year, month, day] = event.occurredOn.split("-");
    const folder = normalizePath(`${this.eventsFolder}/${year}/${month}/${day}`);
    await this.ensureFolder(folder);
    const path = normalizePath(`${folder}/${event.id}.md`);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!existing) {
      await this.app.vault.create(path, renderEventMarkdown(event, habitName));
      return;
    }
    if (!(existing instanceof TFile)) throw new Error(`${path} 已存在，但不是文件`);
    const parsed = parseEventMarkdown(await this.app.vault.cachedRead(existing));
    if (stableJson(parsed) !== stableJson(event)) {
      throw new Error(`事件 ID 冲突，已保留原文件：${path}`);
    }
  }

  async appendDailyRitualCheckIn(checkIn: DailyRitualCheckIn): Promise<void> {
    parseDailyRitualCheckInMarkdown(renderDailyRitualCheckInMarkdown(checkIn));
    await this.initialize();
    const [year, month, day] = checkIn.occurredOn.split("-");
    const folder = normalizePath(`${this.checkInsFolder}/${year}/${month}/${day}`);
    await this.ensureFolder(folder);
    const path = normalizePath(`${folder}/${checkIn.id}.md`);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!existing) {
      await this.app.vault.create(path, renderDailyRitualCheckInMarkdown(checkIn));
      return;
    }
    if (!(existing instanceof TFile)) throw new Error(`${path} 已存在，但不是文件`);
    const parsed = parseDailyRitualCheckInMarkdown(await this.app.vault.cachedRead(existing));
    if (stableJson(parsed) !== stableJson(checkIn)) {
      throw new Error(`签到 ID 冲突，已保留原文件：${path}`);
    }
  }
}
