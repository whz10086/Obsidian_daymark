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
  normalizePath: (path: string) => path.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/\/$/, ""),
}));

import type { App } from "obsidian";
import { DaymarkStorage } from "../src/storage";

function createVault(shared = new Map<string, { file: object; content?: string }>()) {
  return {
    shared,
    app: {
      vault: {
        getAbstractFileByPath: (path: string) => shared.get(path)?.file ?? null,
        createFolder: async (path: string) => {
          if (shared.has(path)) throw new Error("already exists");
          const folder = new runtime.TFolder(path);
          shared.set(path, { file: folder });
          return folder;
        },
        create: async (path: string, content: string) => {
          if (shared.has(path)) throw new Error("already exists");
          const file = new runtime.TFile(path);
          shared.set(path, { file, content });
          return file;
        },
        cachedRead: async (file: { path: string }) => shared.get(file.path)?.content ?? "",
      },
    } as unknown as App,
  };
}

describe("shared Vault identity", () => {
  it("creates one Markdown marker and reuses its identity", async () => {
    const { app, shared } = createVault();
    const storage = new DaymarkStorage(app, "日迹");

    const first = await storage.getOrCreateVaultIdentity();
    const second = await storage.getOrCreateVaultIdentity();

    expect(first).toMatch(/^vault_/);
    expect(second).toBe(first);
    expect(storage.vaultIdentityPath).toBe("日迹/日迹库标识.md");
    expect(shared.get(storage.vaultIdentityPath)?.content).toContain(`daymark-vault-id: ${first}`);
  });

  it("returns the same seed to two devices sharing the marker", async () => {
    const shared = new Map<string, { file: object; content?: string }>();
    const desktop = createVault(shared);
    const mobile = createVault(shared);

    const desktopSeed = await new DaymarkStorage(desktop.app, "日迹").getOrCreateVaultIdentity();
    const mobileSeed = await new DaymarkStorage(mobile.app, "日迹").getOrCreateVaultIdentity();

    expect(mobileSeed).toBe(desktopSeed);
  });

  it("adopts a marker created by a concurrent writer", async () => {
    const { app, shared } = createVault();
    const storage = new DaymarkStorage(app, "日迹");
    const vault = app.vault as unknown as {
      create(path: string, content: string): Promise<object>;
    };
    vault.create = async (path: string) => {
      const file = new runtime.TFile(path);
      shared.set(path, {
        file,
        content: "---\ndaymark-vault-id: vault_from_peer_12345678\n---\n",
      });
      throw new Error("already exists");
    };

    await expect(storage.getOrCreateVaultIdentity()).resolves.toBe("vault_from_peer_12345678");
  });

  it("uses shared file content as a stable fallback without overwriting malformed data", async () => {
    const { app, shared } = createVault();
    const storage = new DaymarkStorage(app, "日迹");
    const file = new runtime.TFile(storage.vaultIdentityPath);
    shared.set("日迹", { file: new runtime.TFolder("日迹") });
    shared.set(storage.vaultIdentityPath, { file, content: "用户保留的旧内容" });

    const first = await storage.getOrCreateVaultIdentity();
    const second = await storage.getOrCreateVaultIdentity();

    expect(first).toMatch(/^vault_content_[0-9a-f]{8}$/);
    expect(second).toBe(first);
    expect(shared.get(storage.vaultIdentityPath)?.content).toBe("用户保留的旧内容");
  });
});
