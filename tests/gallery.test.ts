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
import { GalleryStorage, MAX_IMAGE_BYTES, validateGalleryImage } from "../src/gallery";

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
  return { entries, vault, add, storage: new GalleryStorage({ vault } as unknown as App, "日迹") };
}

describe("Blender gallery", () => {
  it("validates images and rejects unsupported or oversized files", () => {
    expect(validateGalleryImage("作品.PNG", 40)).toBeUndefined();
    expect(validateGalleryImage("作品.blend", 40)).toBeTruthy();
    expect(validateGalleryImage("作品.svg", 40)).toBeTruthy();
    expect(validateGalleryImage("作品.png", MAX_IMAGE_BYTES + 1)).toBeTruthy();
    expect(validateGalleryImage("作品.png", 0)).toBeTruthy();
  });
  it("imports same-named images separately without replacing originals and reloads editable details", async () => {
    const { storage, entries, vault } = setup();
    const bytes = new Uint8Array([137, 80, 78, 71]).buffer;
    const file = { name: "建筑.png", size: 4, arrayBuffer: async () => bytes } as File;
    await storage.importImage(file);
    await storage.importImage(file);
    const items = await storage.load();
    expect(items).toHaveLength(2);
    expect(new Set(items.map((item) => item.path)).size).toBe(2);
    expect(items[0].title).toBe("建筑");
    await storage.saveDetails(items[0].path, "光影练习", "第一版\n玻璃材质");
    expect((await storage.load()).find((item) => item.path === items[0].path)).toMatchObject({ title: "光影练习", description: "第一版\n玻璃材质" });
    expect(entries.get(items[0].path)?.content).toBe(bytes);
    expect(vault.createBinary).toHaveBeenCalledTimes(2);
  });
  it("discovers manually added images and preserves corrupt metadata", async () => {
    const { storage, add, entries } = setup();
    await add("日迹/Blender展柜/室内/灯.jpg", new ArrayBuffer(4));
    await add("日迹/Blender展柜/室内/灯.jpg.json", "broken");
    await add("日迹/其他.png", new ArrayBuffer(4));
    await add("日迹/Blender展柜/model.blend", new ArrayBuffer(4));
    const items = await storage.load();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "灯", warning: expect.any(String) });
    expect(entries.get("日迹/Blender展柜/室内/灯.jpg.json")?.content).toBe("broken");
  });
  it("rejects writes outside the gallery and invalid titles", async () => {
    const { storage, add } = setup();
    await add("日迹/Blender展柜/a.png", new ArrayBuffer(4));
    await expect(storage.saveDetails("日迹/Blender展柜/../a.png", "x", "")).rejects.toThrow();
    await expect(storage.saveDetails("日迹/Blender展柜/a.png", "", "")).rejects.toThrow();
    await expect(storage.importImage({ name: "a.blend", size: 10 } as File)).rejects.toThrow();
  });
});
