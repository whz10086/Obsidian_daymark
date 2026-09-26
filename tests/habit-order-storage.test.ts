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
import { HabitOrderStorage } from "../src/habit-order-storage";


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
    process: async (file: { path: string }, update: (content: string) => string) => { entries.get(file.path)!.content = update(entries.get(file.path)!.content as string); },
    modify: async (file: { path: string }, content: string) => { entries.get(file.path)!.content = content; },
  };
  return { entries, vault, add, storage: new HabitOrderStorage({ vault } as unknown as App, "日迹") };
}

describe("module order storage", () => {
  it("persists one order file without changing task or record files", async () => {
    const { storage, entries, add } = setup();
    await add("日迹/项目/a.md", "unchanged");
    await storage.save({category:"学习",ids:["b","a"]}, []);
    expect(await storage.load()).toEqual([{category:"学习",ids:["b","a"]}]);
    await storage.save({category:"生活",ids:["d","c"]}, []);
    expect(await storage.load()).toHaveLength(2);
    expect(entries.get("日迹/项目/a.md")?.content).toBe("unchanged");
  });
  it("rejects stale same-category writes while preserving other category updates", async () => {
    const { storage } = setup();
    await storage.save({category:"学习",ids:["b","a"]}, []);
    await expect(storage.save({category:"学习",ids:["a","b"]}, [])).rejects.toThrow("另一端");
    await storage.save({category:"学习",ids:["a","b"]}, ["b","a"]);
    expect((await storage.load())[0].ids).toEqual(["a","b"]);
  });
  it("preserves a malformed file rather than replacing it", async () => {
    const { storage, add, entries } = setup();
    await add("日迹/项目顺序.json", "broken");
    await expect(storage.load()).rejects.toThrow();
    await expect(storage.save({category:"学习",ids:["a"]}, [])).rejects.toThrow();
    expect(entries.get("日迹/项目顺序.json")?.content).toBe("broken");
  });
});

