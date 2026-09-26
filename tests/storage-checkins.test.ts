import { describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => {
  class TAbstractFile {
    constructor(public path: string) {}
  }
  class TFile extends TAbstractFile {}
  class TFolder extends TAbstractFile {}
  return { TFile, TFolder };
});

vi.mock("obsidian", () => ({
  TFile: runtime.TFile,
  TFolder: runtime.TFolder,
  normalizePath: (path: string) =>
    path.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/\/$/, ""),
}));

import type { App } from "obsidian";
import { renderDailyRitualCheckInMarkdown } from "../src/data-codec";
import { DaymarkStorage } from "../src/storage";
import type { DailyRitualCheckIn } from "../src/types";

interface VaultEntry {
  file: InstanceType<typeof runtime.TFile> | InstanceType<typeof runtime.TFolder>;
  content?: string;
}

function makeCheckIn(overrides: Partial<DailyRitualCheckIn> = {}): DailyRitualCheckIn {
  return {
    version: 1,
    id: "checkin_test_0001",
    type: "daily-ritual",
    occurredOn: "2024-03-05",
    recordedAt: "2024-03-05T08:00:00.000Z",
    timezone: "Asia/Shanghai",
    deviceId: "device_test_0001",
    passageId: "daodejing-08-water",
    ...overrides,
  };
}

function createVault() {
  const entries = new Map<string, VaultEntry>();
  const app = {
    vault: {
      getAbstractFileByPath: (path: string) => entries.get(path)?.file ?? null,
      createFolder: async (path: string) => {
        if (entries.has(path)) throw new Error("already exists");
        const folder = new runtime.TFolder(path);
        entries.set(path, { file: folder });
        return folder;
      },
      create: async (path: string, content: string) => {
        if (entries.has(path)) throw new Error("already exists");
        const file = new runtime.TFile(path);
        entries.set(path, { file, content });
        return file;
      },
      cachedRead: async (file: { path: string }) => entries.get(file.path)?.content ?? "",
      getMarkdownFiles: () =>
        [...entries.values()]
          .map((entry) => entry.file)
          .filter(
            (file): file is InstanceType<typeof runtime.TFile> =>
              file instanceof runtime.TFile && file.path.endsWith(".md"),
          ),
    },
  } as unknown as App;
  const addMarkdown = (path: string, content: string): void => {
    entries.set(path, { file: new runtime.TFile(path), content });
  };
  return { app, entries, addMarkdown };
}

describe("daily ritual check-in storage", () => {
  it("appends one immutable Markdown file under its calendar date", async () => {
    const { app, entries } = createVault();
    const storage = new DaymarkStorage(app, "日迹");
    const checkIn = makeCheckIn();
    const path = "日迹/签到/2024/03/05/checkin_test_0001.md";

    await storage.appendDailyRitualCheckIn(checkIn);
    const firstContent = entries.get(path)?.content;
    await storage.appendDailyRitualCheckIn(checkIn);

    expect(storage.checkInsFolder).toBe("日迹/签到");
    expect(firstContent).toContain("daymark-kind: daily-ritual-check-in");
    expect(entries.get(path)?.content).toBe(firstContent);
  });

  it("preserves an existing file when the same ID has different content", async () => {
    const { app, entries } = createVault();
    const storage = new DaymarkStorage(app, "日迹");
    const original = makeCheckIn();
    const path = "日迹/签到/2024/03/05/checkin_test_0001.md";
    await storage.appendDailyRitualCheckIn(original);
    const originalContent = entries.get(path)?.content;

    await expect(
      storage.appendDailyRitualCheckIn(
        makeCheckIn({ passageId: "qingjing-return", recordedAt: "2024-03-05T09:00:00.000Z" }),
      ),
    ).rejects.toThrow("签到 ID 冲突，已保留原文件");
    expect(entries.get(path)?.content).toBe(originalContent);
  });

  it("deduplicates identical IDs, preserves distinct same-day IDs, and isolates conflicts", async () => {
    const { app, addMarkdown } = createVault();
    const storage = new DaymarkStorage(app, "日迹");
    const first = makeCheckIn({
      id: "checkin_same_0001",
      recordedAt: "2024-03-05T09:00:00.000Z",
    });
    const second = makeCheckIn({
      id: "checkin_same_day_0002",
      recordedAt: "2024-03-05T08:00:00.000Z",
      passageId: "qingjing-mind",
    });
    const conflicted = makeCheckIn({ id: "checkin_conflict_0003" });

    addMarkdown("日迹/签到/2024/03/05/first.md", renderDailyRitualCheckInMarkdown(first));
    addMarkdown("日迹/签到/2024/03/05/first-copy.md", renderDailyRitualCheckInMarkdown(first));
    addMarkdown("日迹/签到/2024/03/05/second.md", renderDailyRitualCheckInMarkdown(second));
    addMarkdown(
      "日迹/签到/2024/03/05/conflict-a.md",
      renderDailyRitualCheckInMarkdown(conflicted),
    );
    addMarkdown(
      "日迹/签到/2024/03/05/conflict-b.md",
      renderDailyRitualCheckInMarkdown({ ...conflicted, passageId: "qingjing-observe" }),
    );

    const snapshot = await storage.loadAll();

    expect(snapshot.checkIns.map((checkIn) => checkIn.id)).toEqual([
      "checkin_same_day_0002",
      "checkin_same_0001",
    ]);
    expect(snapshot.issues.filter((issue) => issue.message.includes("checkin_conflict_0003"))).toHaveLength(2);
    expect(snapshot.issues.some((issue) => issue.message.includes("checkin_same_0001"))).toBe(false);
  });

  it("reports and excludes a malformed check-in", async () => {
    const { app, addMarkdown } = createVault();
    const storage = new DaymarkStorage(app, "日迹");
    const malformed = renderDailyRitualCheckInMarkdown(
      makeCheckIn({ id: "checkin_bad_0004", passageId: "../../unsafe" }),
    );
    addMarkdown("日迹/签到/2024/03/05/bad.md", malformed);

    const snapshot = await storage.loadAll();

    expect(snapshot.checkIns).toEqual([]);
    expect(snapshot.issues).toEqual([
      { path: "日迹/签到/2024/03/05/bad.md", message: "签到文件版本不受支持或内容损坏" },
    ]);
  });
});
