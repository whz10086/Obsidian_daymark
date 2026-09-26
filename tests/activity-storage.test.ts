import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";

const runtime = vi.hoisted(() => {
  class TFile {
    stat = { ctime: 1 };
    constructor(public path: string) {}
    get extension() { return this.path.split(".").pop()!; }
    get basename() { return this.path.split("/").pop()!.replace(/\.[^.]+$/, ""); }
  }
  class TFolder { constructor(public path: string) {} }
  return { TFile, TFolder };
});
vi.mock("obsidian", () => ({ ...runtime, normalizePath: (value: string) => value.replace(/\\/g, "/") }));
import { ActivityStorage } from "../src/activity-storage";
import { selectedActivityIds } from "../src/activity-list";

function setup() {
  const entries = new Map<string, { file: InstanceType<typeof runtime.TFile> | InstanceType<typeof runtime.TFolder>; content?: string | ArrayBuffer }>();
  const add = async (path: string, content: string | ArrayBuffer) => {
    if (entries.has(path)) throw new Error("exists");
    const file = new runtime.TFile(path);
    entries.set(path, { file, content });
    return file;
  };
  const vault = {
    getFiles: () => [...entries.values()].map((entry) => entry.file).filter((file) => file instanceof runtime.TFile),
    getAbstractFileByPath: (path: string) => entries.get(path)?.file,
    getResourcePath: (file: { path: string }) => `app://local/${file.path}`,
    createFolder: async (path: string) => entries.set(path, { file: new runtime.TFolder(path) }),
    createBinary: vi.fn(add), create: vi.fn(add),
    cachedRead: async (file: { path: string }) => entries.get(file.path)?.content,
    modify: async (file: { path: string }, content: string) => { entries.get(file.path)!.content = content; },
  };
  return { entries, vault, add, storage: new ActivityStorage({ vault } as unknown as App, "日迹") };
}

describe("activity list storage", () => {
  it("persists membership across reload and never modifies source files", async () => {
    const { storage, entries, add } = setup();
    await add("日迹/项目/original.md", "original task");
    await add("日迹/记录/original.md", "original event");
    await storage.append("2024-03-05", "habit_a", true);
    const initial = await storage.load();
    expect(selectedActivityIds(initial.entries, "2024-03-05")).toEqual(["habit_a"]);
    await storage.append("2024-03-05", "habit_a", false);
    await storage.append("2024-03-06", "habit_a", true);
    const reloaded = await storage.load();
    expect(selectedActivityIds(reloaded.entries, "2024-03-05")).toEqual([]);
    expect(selectedActivityIds(reloaded.entries, "2024-03-06")).toEqual(["habit_a"]);
    expect(reloaded.entries).toHaveLength(3);
    expect(entries.get("日迹/项目/original.md")?.content).toBe("original task");
    expect(entries.get("日迹/记录/original.md")?.content).toBe("original event");
  });
  it("orders same-millisecond changes and reports damaged files without deleting them", async () => {
    const { storage, add, entries } = setup();
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    try {
      await storage.append("2024-03-05", "habit_a", true);
      await storage.append("2024-03-05", "habit_a", false);
      expect(selectedActivityIds((await storage.load()).entries, "2024-03-05")).toEqual([]);
      await add("日迹/活动列表/bad.json", "{}");
      const result = await storage.load();
      expect(result.entries).toHaveLength(2);
      expect(result.issues).toHaveLength(1);
      expect(entries.get("日迹/活动列表/bad.json")?.content).toBe("{}");
    } finally { vi.restoreAllMocks(); }
  });
  it("propagates failed writes without creating a selection", async () => {
    const { storage, vault } = setup();
    vault.create.mockRejectedValueOnce(new Error("disk full"));
    await expect(storage.append("2024-03-05", "habit_a", true)).rejects.toThrow("disk full");
    expect((await storage.load()).entries).toHaveLength(0);
  });
});

