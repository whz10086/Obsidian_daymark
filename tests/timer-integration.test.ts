import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { App, PluginManifest } from "obsidian";
import { cumulativeDurationSeconds } from "../src/domain";
import DaymarkPlugin from "../src/main";
import { Platform } from "obsidian";
import { elapsedTimerSeconds } from "../src/timer";
import { makeHabit } from "./fixtures";

const harness = vi.hoisted(() => {
  class Element {
    text = "";
    disabled = false;
    attrs: Record<string, string> = {};
    children: Element[] = [];
    listeners = new Map<string, () => unknown>();

    addClass(): void {}
    setAttr(name: string, value: string): void { this.attrs[name] = value; }
    removeAttribute(): void {}
    setText(text: string): void { this.text = text; }
    empty(): void { this.children = []; }
    createDiv(): Element { return this.createEl("div"); }
    createSpan(options?: { text?: string; cls?: string }): Element { return this.createEl("span", options); }
    createEl(_tag: string, options?: { text?: string; cls?: string }): Element {
      const child = new Element();
      child.text = options?.text ?? "";
      this.children.push(child);
      return child;
    }
    addEventListener(event: string, callback: () => unknown): void {
      this.listeners.set(event, callback);
    }
    find(text: string): Element | undefined {
      if (this.text === text || this.attrs["aria-label"] === text) return this;
      for (const child of this.children) {
        const found = child.find(text);
        if (found) return found;
      }
      return undefined;
    }
    async click(): Promise<void> {
      if (!this.disabled) await this.listeners.get("click")?.();
    }
  }

  const modals: Modal[] = [];
  class Modal {
    modalEl = new Element();
    contentEl = new Element();
    opened = false;
    dismissCount = 0;
    title = "";
    constructor(_app: unknown) { modals.push(this); }
    setTitle(title: string): void { this.title = title; }
    onOpen(): void {}
    onClose(): void {}
    open(): void {
      this.opened = true;
      this.onOpen();
    }
    close(): void {
      if (!this.opened) return;
      this.opened = false;
      this.dismissCount += 1;
      this.onClose();
    }
  }

  class Plugin {
    cleanups: Array<() => void> = [];
    constructor(public app: unknown, public manifest: unknown) {}
    async loadData(): Promise<unknown> { return { timezone: "UTC" }; }
    async saveData(): Promise<void> {}
    registerView(): void {}
    addRibbonIcon(): void {}
    addCommand(): void {}
    addSettingTab(): void {}
    registerEvent(): void {}
    registerInterval(id: ReturnType<typeof setInterval>): void {
      this.cleanups.push(() => clearInterval(id));
    }
    registerDomEvent(target: EventTarget, type: string, listener: EventListener): void {
      target.addEventListener(type, listener);
      this.cleanups.push(() => target.removeEventListener(type, listener));
    }
    onunload(): void {}
    unload(): void {
      this.onunload();
      this.cleanups.forEach((cleanup) => cleanup());
    }
  }

  class DaymarkView {
    refresh = vi.fn();
    recoverFromSuspend = vi.fn();
  }

  const chimes: RestReminderChime[] = [];
  class RestReminderChime {
    prime = vi.fn();
    play = vi.fn().mockResolvedValue(true);
    dispose = vi.fn();
    constructor() { chimes.push(this); }
  }

  return {
    Plugin,
    DaymarkView,
    Modal,
    modals,
    notices: vi.fn(),
    appendEvent: vi.fn(),
    appendDailyRitualCheckIn: vi.fn(),
    loadAll: vi.fn(),
    getOrCreateVaultIdentity: vi.fn(),
    RestReminderChime,
    chimes,
  };
});

vi.mock("obsidian", () => ({
  normalizePath: (path: string) => path,
  Platform: { isDesktopApp: false },
  Plugin: harness.Plugin,
  Modal: harness.Modal,
  Notice: class { constructor(message: string) { harness.notices(message); } },
  setIcon: vi.fn(),
}));
vi.mock("../src/storage", () => ({
  validateDataFolder: () => undefined,
  DaymarkStorage: class {
    loadAll = harness.loadAll;
    appendEvent = harness.appendEvent;
    appendDailyRitualCheckIn = harness.appendDailyRitualCheckIn;
    getOrCreateVaultIdentity = harness.getOrCreateVaultIdentity;
    isManagedPath(): boolean { return false; }
  },
}));
vi.mock("../src/view", () => ({ DaymarkView: harness.DaymarkView }));
vi.mock("../src/activity-view", () => ({ ActivityView: class { refresh = vi.fn(); getState() { return {}; } }, VIEW_TYPE_ACTIVITY: "daymark-activity-window" }));
vi.mock("../src/modals", () => ({ HabitModal: class {} }));
vi.mock("../src/rest-chime", () => ({ RestReminderChime: harness.RestReminderChime }));
vi.mock("../src/settings", () => ({ DaymarkSettingTab: class {} }));

describe("plugin timer and rest reminder integration", () => {
  const day = "2026-09-09";
  const reading = makeHabit("duration", { id: "habit_reading", name: "读书" });
  const exercise = makeHabit("duration", { id: "habit_exercise", name: "锻炼" });
  let plugin: DaymarkPlugin;
  let doc: EventTarget & { hidden: boolean };
  let browser: EventTarget & { localStorage: { getItem(key: string): string | null; setItem(key: string, value: string): void } };
  let workspace: {
    getLeavesOfType: ReturnType<typeof vi.fn>;
    onLayoutReady: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    iterateRootLeaves: ReturnType<typeof vi.fn>;
    getLeaf: ReturnType<typeof vi.fn>;
    revealLeaf: ReturnType<typeof vi.fn>;
    detachLeavesOfType: ReturnType<typeof vi.fn>;
  };
  let layoutReadyCallback: (() => void) | undefined;
  let workspaceCallbacks: Map<string, () => void>;
  let app: App;
  let saved: Map<string, string>;

  beforeEach(async () => {
    Platform.isDesktopApp = false;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${day}T08:00:00.000Z`));
    layoutReadyCallback = undefined;
    workspaceCallbacks = new Map();
    harness.modals.length = 0;
    harness.chimes.length = 0;
    harness.notices.mockReset();
    harness.appendEvent.mockReset().mockResolvedValue(undefined);
    harness.appendDailyRitualCheckIn.mockReset().mockResolvedValue(undefined);
    harness.getOrCreateVaultIdentity.mockReset().mockResolvedValue("vault_timer_integration");
    harness.loadAll.mockReset().mockResolvedValue({
      habits: [reading, exercise],
      events: [],
      checkIns: [],
      issues: [],
    });
    saved = new Map<string, string>();
    doc = Object.assign(new EventTarget(), { hidden: false });
    browser = Object.assign(new EventTarget(), {
      localStorage: {
        getItem: (key: string) => saved.get(key) ?? null,
        setItem: (key: string, value: string) => { saved.set(key, value); },
      },
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", doc);
    workspace = {
      getLeavesOfType: vi.fn(() => []),
      onLayoutReady: vi.fn((callback: () => void) => { layoutReadyCallback = callback; }),
      on: vi.fn((name: string, callback: () => void) => {
        workspaceCallbacks.set(name, callback);
        return {};
      }),
      iterateRootLeaves: vi.fn(),
      getLeaf: vi.fn(),
      revealLeaf: vi.fn().mockResolvedValue(undefined),
      detachLeavesOfType: vi.fn(),
    };
    app = {
      vault: { getName: () => "Timer integration", on: vi.fn(), getFiles: () => [], getAbstractFileByPath: () => null },
      workspace,
    } as unknown as App;
    plugin = new DaymarkPlugin(app, { id: "daymark-life-tracker" } as PluginManifest);
    await plugin.onload();
    await plugin.reloadData();
    await plugin.toggleTimer(reading, day);
  });

  afterEach(() => {
    plugin?.unload();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function button(modal: InstanceType<typeof harness.Modal>, text: string): InstanceType<typeof harness.Modal>["contentEl"] {
    const element = modal.contentEl.find(text);
    if (!element) throw new Error(`Missing button: ${text}`);
    return element;
  }

  function persistPromptedToday(): void {
    plugin.deviceState.lastDailyRitualDate = day;
    const stateKey = [...saved.keys()][0];
    if (!stateKey) throw new Error("Missing persisted device state");
    saved.set(stateKey, JSON.stringify(plugin.deviceState));
  }

  async function restartPlugin(): Promise<void> {
    plugin.unload();
    plugin = new DaymarkPlugin(app, { id: "daymark-life-tracker" } as PluginManifest);
    await plugin.onload();
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  }

  it("defers Vault access until layout readiness during a cold start", async () => {
    plugin.unload();
    let vaultReady = false;
    harness.getOrCreateVaultIdentity.mockClear().mockImplementation(async () => {
      if (!vaultReady) throw new Error("Folder already exists: 日迹 (index not ready)");
      return "vault_cold_start";
    });
    harness.loadAll.mockClear();
    plugin = new DaymarkPlugin(app, { id: "daymark-life-tracker" } as PluginManifest);
    await expect(plugin.onload()).resolves.toBeUndefined();
    doc.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(harness.getOrCreateVaultIdentity).not.toHaveBeenCalled();
    expect(harness.loadAll).not.toHaveBeenCalled();
    vaultReady = true;
    layoutReadyCallback?.();
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
    expect(harness.getOrCreateVaultIdentity).toHaveBeenCalledOnce();
    expect(plugin.habits).toEqual([reading, exercise]);
  });

  it("opens a single desktop activity popout under concurrent requests and preserves pin preference", async () => {
    Platform.isDesktopApp = true;
    plugin.setActivityWindowPinned(false);
    const leaf = { setViewState: vi.fn().mockResolvedValue(undefined), detach: vi.fn() };
    const open = vi.fn(() => leaf);
    Object.assign(workspace, { openPopoutLeaf: open });
    await Promise.all([plugin.openActivityView(day), plugin.openActivityView(day)]);
    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith({ size: { width: 420, height: 680 } });
    expect(leaf.setViewState).toHaveBeenCalledWith({ type: "daymark-activity-window", state: { date: day, pinned: false }, active: true });
    expect(harness.appendEvent).not.toHaveBeenCalled();
  });

  it("uses a normal activity tab on mobile and cleans a failed popout without detaching the old view", async () => {
    const leaf = { setViewState: vi.fn().mockResolvedValue(undefined), detach: vi.fn() };
    workspace.getLeaf.mockReturnValue(leaf);
    await plugin.openActivityView(day);
    expect(workspace.getLeaf).toHaveBeenCalledWith("tab");
    Platform.isDesktopApp = true;
    const old = { view: {}, detach: vi.fn() };
    workspace.getLeavesOfType.mockImplementation(type => type === "daymark-activity-window" ? [old] : []);
    leaf.setViewState.mockRejectedValueOnce(new Error("window failure"));
    Object.assign(workspace, { openPopoutLeaf: vi.fn(() => leaf) });
    await expect(plugin.openActivityView(day)).rejects.toThrow("window failure");
    expect(leaf.detach).toHaveBeenCalledOnce();
    expect(old.detach).not.toHaveBeenCalled();
  });

  it("opens Daymark in a main-area tab and removes an old sidebar copy", async () => {
    const sidebarLeaf = { detach: vi.fn() };
    const mainLeaf = { setViewState: vi.fn().mockResolvedValue(undefined), detach: vi.fn() };
    workspace.getLeavesOfType.mockImplementation((type) => type === "daymark-activity-window" ? [] : [sidebarLeaf]);
    workspace.iterateRootLeaves.mockImplementation(() => undefined);
    workspace.getLeaf.mockReturnValue(mainLeaf);

    await plugin.activateView();

    expect(sidebarLeaf.detach).toHaveBeenCalledOnce();
    expect(workspace.getLeaf).toHaveBeenCalledWith("tab");
    expect(mainLeaf.setViewState).toHaveBeenCalledWith({
      type: "daymark-life-tracker-view",
      active: true,
    });
    expect(workspace.revealLeaf).toHaveBeenCalledWith(mainLeaf);
  });

  it("reuses an existing Daymark tab in the main area", async () => {
    const mainLeaf = { view: new harness.DaymarkView(), setViewState: vi.fn(), detach: vi.fn() };
    workspace.getLeavesOfType.mockImplementation((type) => type === "daymark-activity-window" ? [] : [mainLeaf]);
    workspace.iterateRootLeaves.mockImplementation((callback: (leaf: object) => void) => {
      callback(mainLeaf);
    });

    await plugin.activateView();

    expect(mainLeaf.detach).not.toHaveBeenCalled();
    expect(workspace.getLeaf).not.toHaveBeenCalled();
    expect(workspace.revealLeaf).toHaveBeenCalledWith(mainLeaf);
  });

  it("replaces a stale Daymark view left behind by a plugin reload", async () => {
    const staleLeaf = { view: {}, detach: vi.fn() };
    const freshLeaf = {
      setViewState: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn(),
    };
    workspace.getLeavesOfType.mockImplementation((type) => type === "daymark-activity-window" ? [] : [staleLeaf]);
    workspace.iterateRootLeaves.mockImplementation((callback: (leaf: object) => void) => {
      callback(staleLeaf);
    });
    workspace.getLeaf.mockReturnValue(freshLeaf);

    await plugin.activateView();

    expect(workspace.getLeaf).toHaveBeenCalledWith("tab");
    expect(freshLeaf.setViewState).toHaveBeenCalledWith({
      type: "daymark-life-tracker-view",
      active: true,
    });
    expect(workspace.revealLeaf).toHaveBeenCalledWith(freshLeaf);
    expect(staleLeaf.detach).toHaveBeenCalledOnce();
  });

  it("detaches and restores an open Daymark view across a plugin restart", async () => {
    const oldLeaf = { view: new harness.DaymarkView(), detach: vi.fn() };
    const freshLeaf = {
      setViewState: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn(),
    };
    let leaves: object[] = [oldLeaf];
    workspace.getLeavesOfType.mockImplementation((type) => type === "daymark-activity-window" ? [] : leaves);
    workspace.detachLeavesOfType.mockImplementation(() => { leaves = []; });
    workspace.iterateRootLeaves.mockImplementation(() => undefined);
    workspace.getLeaf.mockReturnValue(freshLeaf);

    await restartPlugin();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();

    expect(workspace.detachLeavesOfType).toHaveBeenCalledWith("daymark-life-tracker-view");
    expect(plugin.deviceState.reopenViewOnLoad).toBe(true);
    expect(freshLeaf.setViewState).toHaveBeenCalledWith({
      type: "daymark-life-tracker-view",
      active: true,
    });
    expect(workspace.revealLeaf).toHaveBeenCalledWith(freshLeaf);
  });

  it("keeps an old sidebar view when creating the main-area tab fails", async () => {
    const sidebarLeaf = { detach: vi.fn() };
    const mainLeaf = {
      setViewState: vi.fn().mockRejectedValue(new Error("view unavailable")),
      detach: vi.fn(),
    };
    workspace.getLeavesOfType.mockImplementation((type) => type === "daymark-activity-window" ? [] : [sidebarLeaf]);
    workspace.iterateRootLeaves.mockImplementation(() => undefined);
    workspace.getLeaf.mockReturnValue(mainLeaf);

    await expect(plugin.activateView()).rejects.toThrow("view unavailable");

    expect(sidebarLeaf.detach).not.toHaveBeenCalled();
    expect(workspace.revealLeaf).not.toHaveBeenCalled();
  });

  it("reminds at 30 and 60 minutes with no tracker view open and no repeat each tick", async () => {
    await vi.advanceTimersByTimeAsync(1_799_000);
    expect(harness.modals).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(harness.modals).toHaveLength(1);
    expect(harness.modals[0].opened).toBe(true);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    await button(harness.modals[0], "知道了").click();
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1_799_000);
    expect(harness.modals).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(harness.modals).toHaveLength(2);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    await button(harness.modals[1], "知道了").click();
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    expect(harness.appendEvent).not.toHaveBeenCalled();
  });

  it("primes the chime from timer gestures and plays it when a reminder opens", async () => {
    const chime = harness.chimes[0];
    expect(chime).toBeDefined();
    expect(chime.prime).toHaveBeenCalledOnce();

    doc.dispatchEvent(new Event("pointerdown"));
    doc.dispatchEvent(new Event("keydown"));
    expect(chime.prime).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(1_800_000);
    expect(harness.modals).toHaveLength(1);
    expect(chime.play).toHaveBeenCalledOnce();
    await button(harness.modals[0], "敲钟").click();
    expect(chime.play).toHaveBeenCalledTimes(2);
  });

  it("keeps the reminder usable when replaying the chime is blocked", async () => {
    await vi.advanceTimersByTimeAsync(1_800_000);
    const modal = harness.modals[0];
    const replay = button(modal, "敲钟");
    harness.chimes[0].play.mockResolvedValueOnce(false);

    await replay.click();

    expect(modal.opened).toBe(true);
    expect(replay.disabled).toBe(false);
    expect(harness.notices).toHaveBeenCalledWith("系统暂时无法播放钟声，请检查静音设置后重试。");
  });

  it("switches instruments and shows temporary feedback without dismissing rest", async () => {
    await vi.advanceTimersByTimeAsync(1_800_000);
    const modal = harness.modals[0];
    await button(modal, "木鱼").click();
    await button(modal, "敲木鱼").click();
    expect(harness.chimes[0].play).toHaveBeenLastCalledWith("wood");
    expect(plugin.deviceState.restSoundMode).toBe("wood");
    expect(modal.contentEl.find("清净 +1")).toBeDefined();
    expect(modal.opened).toBe(true);
    await vi.advanceTimersByTimeAsync(1400);
    expect(modal.contentEl.find("清净 +1")).toBeUndefined();
    await button(modal, "钟").click();
    await button(modal, "敲钟").click();
    expect(harness.chimes[0].play).toHaveBeenLastCalledWith("bell");
    modal.close();
  });

  it("lets a due rest reminder take priority over an open daily check-in", async () => {
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    expect(harness.modals).toHaveLength(1);
    expect(harness.modals[0].title).toBe("今日签到 · 抄读入定");
    expect(harness.modals[0].opened).toBe(true);

    await vi.advanceTimersByTimeAsync(1_800_000);

    expect(harness.modals).toHaveLength(2);
    expect(harness.modals[0].opened).toBe(false);
    expect(harness.modals[1].title).toBe("钟声已响 · 该休息了");
    expect(harness.modals[1].opened).toBe(true);
    expect(harness.chimes[0].play).toHaveBeenCalledOnce();
  });

  it("keeps the independent cadence through starting, switching, stopping and restart without a task", async () => {
    await plugin.toggleTimer(reading, day);
    harness.appendEvent.mockClear();
    const startedAt = plugin.deviceState.restTimer?.startedAt;
    await vi.advanceTimersByTimeAsync(600_000);
    await plugin.toggleTimer(reading, day);
    await vi.advanceTimersByTimeAsync(600_000);
    await plugin.toggleTimer(exercise, day);
    await plugin.toggleTimer(exercise, day);
    expect(plugin.deviceState.restTimer?.startedAt).toBe(startedAt);
    expect(plugin.deviceState.runningTimer).toBeUndefined();
    const writes = harness.appendEvent.mock.calls.length;
    persistPromptedToday();
    await restartPlugin();
    expect(plugin.deviceState.restTimer?.startedAt).toBe(startedAt);
    await vi.advanceTimersByTimeAsync(599_000);
    expect(harness.modals).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(harness.modals).toHaveLength(1);
    expect(harness.chimes[1].play).toHaveBeenCalledOnce();
    expect(harness.modals[0].contentEl.find("停止并保存，去休息")).toBeUndefined();
    await button(harness.modals[0], "知道了").click();
    await vi.advanceTimersByTimeAsync(1_800_000);
    expect(harness.modals).toHaveLength(2);
    expect(harness.appendEvent).toHaveBeenCalledTimes(writes);
  });

  it("reopens an unconfirmed overdue reminder after the plugin restarts", async () => {
    const startedAt = plugin.deviceState.runningTimer?.startedAt;
    await vi.advanceTimersByTimeAsync(1_800_000);
    expect(harness.modals).toHaveLength(1);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    persistPromptedToday();

    await restartPlugin();

    expect(harness.modals).toHaveLength(2);
    expect(harness.modals[0].opened).toBe(false);
    expect(harness.modals[1].opened).toBe(true);
    expect(harness.modals[1].title).toBe("钟声已响 · 该休息了");
    expect(plugin.deviceState.runningTimer?.startedAt).toBe(startedAt);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    expect(harness.chimes[0].dispose).toHaveBeenCalledOnce();
    expect(harness.chimes[1].play).toHaveBeenCalledOnce();
  });

  it("does not repeat an acknowledged boundary after restart and keeps the heartbeat active", async () => {
    const startedAt = plugin.deviceState.runningTimer?.startedAt;
    await vi.advanceTimersByTimeAsync(1_800_000);
    await button(harness.modals[0], "知道了").click();
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    persistPromptedToday();

    await restartPlugin();

    expect(harness.modals).toHaveLength(1);
    expect(plugin.deviceState.runningTimer?.startedAt).toBe(startedAt);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    expect(harness.chimes[1].play).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_799_000);
    expect(harness.modals).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(harness.modals).toHaveLength(2);
    expect(harness.chimes[1].play).toHaveBeenCalledOnce();
  });

  it("defers hidden-page reminders until foreground and coalesces missed boundaries", async () => {
    doc.hidden = true;
    await vi.advanceTimersByTimeAsync(5_400_000);
    expect(harness.modals).toHaveLength(0);
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    browser.dispatchEvent(new Event("focus"));
    expect(harness.modals).toHaveLength(1);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    await button(harness.modals[0], "知道了").click();
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1_799_000);
    expect(harness.modals).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(harness.modals).toHaveLength(2);
  });

  it("rebuilds a dropped reminder heartbeat after a long suspend", async () => {
    vi.clearAllTimers();
    vi.setSystemTime(new Date(`${day}T08:30:00.000Z`));

    doc.dispatchEvent(new Event("resume"));
    expect(harness.modals).toHaveLength(1);
    await button(harness.modals[0], "知道了").click();

    await vi.advanceTimersByTimeAsync(1_799_000);
    expect(harness.modals).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(harness.modals).toHaveLength(2);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    await button(harness.modals[1], "知道了").click();
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
  });

  it("recovers when an overdue interval callback arrives before focus", async () => {
    persistPromptedToday();
    layoutReadyCallback?.();
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
    const view = new harness.DaymarkView();
    workspace.getLeavesOfType.mockImplementation((type) => type === "daymark-activity-window" ? [] : [{ view }]);
    const loadsBeforeSuspend = harness.loadAll.mock.calls.length;
    vi.setSystemTime(new Date(`${day}T08:30:00.000Z`));

    await vi.advanceTimersByTimeAsync(1_000);
    for (let index = 0; index < 20; index += 1) await Promise.resolve();

    expect(view.recoverFromSuspend).toHaveBeenCalledOnce();
    expect(harness.modals).toHaveLength(1);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    await button(harness.modals[0], "知道了").click();
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    expect(harness.loadAll.mock.calls.length).toBeGreaterThan(loadsBeforeSuspend);
  });

  it("uses page and workspace lifecycle signals to restore a cleared heartbeat", async () => {
    persistPromptedToday();
    layoutReadyCallback?.();
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
    const view = new harness.DaymarkView();
    workspace.getLeavesOfType.mockImplementation((type) => type === "daymark-activity-window" ? [] : [{ view }]);
    const loadsBeforeSignals = harness.loadAll.mock.calls.length;

    workspaceCallbacks.get("active-leaf-change")?.();
    workspaceCallbacks.get("layout-change")?.();
    expect(view.recoverFromSuspend).toHaveBeenCalledOnce();
    expect(harness.loadAll).toHaveBeenCalledTimes(loadsBeforeSignals);

    vi.clearAllTimers();
    vi.setSystemTime(new Date(`${day}T08:30:00.000Z`));
    browser.dispatchEvent(new Event("pageshow"));
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    expect(view.recoverFromSuspend).toHaveBeenCalledTimes(2);
    expect(harness.modals).toHaveLength(1);
    expect(harness.loadAll.mock.calls.length).toBeGreaterThan(loadsBeforeSignals);

    await button(harness.modals[0], "知道了").click();
    vi.clearAllTimers();
    vi.setSystemTime(new Date(`${day}T09:00:00.000Z`));
    workspaceCallbacks.get("layout-change")?.();
    expect(view.recoverFromSuspend).toHaveBeenCalledTimes(3);
    expect(harness.modals).toHaveLength(2);
  });

  it("only creates a synced check-in after an explicit click", async () => {
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    expect(harness.modals).toHaveLength(1);
    expect(harness.modals[0].title).toBe("今日签到 · 抄读入定");
    expect(plugin.deviceState.lastDailyRitualDate).toBe(day);
    harness.modals[0].close();
    expect(plugin.dailyRitualCheckIns).toHaveLength(0);
    expect(harness.appendDailyRitualCheckIn).not.toHaveBeenCalled();

    // Being prompted today suppresses automatic repeat interruptions, but is not a check-in.
    browser.dispatchEvent(new Event("focus"));
    expect(harness.modals).toHaveLength(1);
    plugin.openDailyRitualCheckIn();
    expect(harness.modals).toHaveLength(2);
    await button(harness.modals[1], "完成今日签到").click();

    expect(harness.appendDailyRitualCheckIn).toHaveBeenCalledOnce();
    expect(harness.appendDailyRitualCheckIn).toHaveBeenCalledWith(expect.objectContaining({
      version: 1,
      type: "daily-ritual",
      occurredOn: day,
      recordedAt: `${day}T08:00:00.000Z`,
      timezone: "UTC",
      deviceId: expect.any(String),
      passageId: expect.any(String),
    }));
    expect(plugin.dailyRitualCheckIns).toHaveLength(1);
    expect(plugin.events).toHaveLength(0);
    expect(harness.appendEvent).not.toHaveBeenCalled();
    expect(harness.modals[1].opened).toBe(false);
    expect(harness.notices).toHaveBeenCalledWith("今日签到完成");

    plugin.openDailyRitualCheckIn();
    browser.dispatchEvent(new Event("focus"));
    expect(harness.modals).toHaveLength(2);
    expect(harness.appendDailyRitualCheckIn).toHaveBeenCalledOnce();
    expect(harness.notices).toHaveBeenCalledWith("今日已经签到");
  });

  it("allows a new check-in on the next local day", async () => {
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    await button(harness.modals[0], "完成今日签到").click();
    plugin.deviceState.runningTimer = undefined;

    vi.setSystemTime(new Date("2026-09-10T08:00:00.000Z"));
    plugin.deviceState.restTimer = { startedAt: Date.now() };
    browser.dispatchEvent(new Event("focus"));
    expect(harness.modals).toHaveLength(2);
    await button(harness.modals[1], "完成今日签到").click();

    expect(harness.appendDailyRitualCheckIn).toHaveBeenCalledTimes(2);
    expect(harness.appendDailyRitualCheckIn.mock.calls[1][0]).toEqual(expect.objectContaining({
      occurredOn: "2026-09-10",
      recordedAt: "2026-09-10T08:00:00.000Z",
    }));
    expect(plugin.deviceState.lastDailyRitualDate).toBe("2026-09-10");
    expect(plugin.events).toHaveLength(0);
  });

  it("keeps a failed check-in open and retryable without creating a tracker event", async () => {
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    const modal = harness.modals[0];
    const checkIn = button(modal, "完成今日签到");
    harness.appendDailyRitualCheckIn.mockRejectedValueOnce(new Error("disk full"));

    await checkIn.click();

    expect(modal.opened).toBe(true);
    expect(checkIn.disabled).toBe(false);
    expect(plugin.dailyRitualCheckIns).toHaveLength(0);
    expect(harness.notices).toHaveBeenCalledWith("签到未保存：disk full");
    const firstAttempt = harness.appendDailyRitualCheckIn.mock.calls[0][0];
    await checkIn.click();
    expect(modal.opened).toBe(false);
    expect(modal.dismissCount).toBe(1);
    expect(harness.appendDailyRitualCheckIn).toHaveBeenCalledTimes(2);
    expect(harness.appendDailyRitualCheckIn.mock.calls[1][0]).toBe(firstAttempt);
    expect(plugin.dailyRitualCheckIns).toHaveLength(1);
    expect(plugin.events).toHaveLength(0);
    expect(harness.appendEvent).not.toHaveBeenCalled();
  });

  it("disables the check-in action while one Vault write is pending", async () => {
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    const modal = harness.modals[0];
    const checkIn = button(modal, "完成今日签到");
    let completeWrite!: () => void;
    harness.appendDailyRitualCheckIn.mockImplementationOnce(
      () => new Promise<void>((resolve) => { completeWrite = resolve; }),
    );

    const saving = checkIn.click();
    await Promise.resolve();
    expect(checkIn.disabled).toBe(true);
    await checkIn.listeners.get("click")?.();
    expect(harness.appendDailyRitualCheckIn).toHaveBeenCalledOnce();
    completeWrite();
    await saving;

    expect(modal.opened).toBe(false);
    expect(modal.dismissCount).toBe(1);
    expect(plugin.dailyRitualCheckIns).toHaveLength(1);
  });

  it("does not show the prompt when today's synced check-in is already loaded", async () => {
    harness.loadAll.mockResolvedValue({
      habits: [reading, exercise],
      events: [],
      checkIns: [{
        version: 1,
        id: "checkin_remote",
        type: "daily-ritual",
        occurredOn: day,
        recordedAt: `${day}T07:00:00.000Z`,
        timezone: "UTC",
        deviceId: "device_remote",
        passageId: "daodejing-08-water",
      }],
      issues: [],
    });

    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();

    expect(harness.modals).toHaveLength(0);
    expect(plugin.dailyRitualCheckIns).toHaveLength(1);
    expect(plugin.deviceState.lastDailyRitualDate).toBeUndefined();
    expect(harness.appendDailyRitualCheckIn).not.toHaveBeenCalled();
  });

  it("closes an open prompt when reload discovers today's synced check-in", async () => {
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    const modal = harness.modals[0];
    harness.loadAll.mockResolvedValue({
      habits: [reading, exercise],
      events: [],
      checkIns: [{
        version: 1,
        id: "checkin_remote",
        type: "daily-ritual",
        occurredOn: day,
        recordedAt: `${day}T08:01:00.000Z`,
        timezone: "UTC",
        deviceId: "device_remote",
        passageId: "daodejing-08-water",
      }],
      issues: [],
    });

    await plugin.reloadData();

    expect(modal.opened).toBe(false);
    expect(modal.dismissCount).toBe(1);
    expect(plugin.dailyRitualCheckIns).toHaveLength(1);
    expect(harness.appendDailyRitualCheckIn).not.toHaveBeenCalled();
  });

  it("replaces a stale midnight prompt without backdating a check-in", async () => {
    layoutReadyCallback?.();
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    const oldModal = harness.modals[0];
    plugin.deviceState.runningTimer = undefined;
    vi.setSystemTime(new Date("2026-09-10T00:00:00.000Z"));
    plugin.deviceState.restTimer = { startedAt: Date.now() };

    await button(oldModal, "完成今日签到").click();

    expect(harness.appendDailyRitualCheckIn).not.toHaveBeenCalled();
    expect(oldModal.opened).toBe(false);
    expect(harness.modals).toHaveLength(2);
    expect(harness.modals[1].opened).toBe(true);
    expect(plugin.deviceState.lastDailyRitualDate).toBe("2026-09-10");
    await button(harness.modals[1], "完成今日签到").click();
    expect(harness.appendDailyRitualCheckIn).toHaveBeenCalledWith(expect.objectContaining({
      occurredOn: "2026-09-10",
      recordedAt: "2026-09-10T00:00:00.000Z",
    }));
  });

  it("pauses while open and starts a full 30 minutes on dismissal, preserving task time", async () => {
    const taskStartedAt = plugin.deviceState.runningTimer?.startedAt;
    await vi.advanceTimersByTimeAsync(1_800_000);
    await vi.advanceTimersByTimeAsync(4_020_000);
    expect(harness.modals).toHaveLength(1);
    harness.modals[0].close();
    expect(plugin.deviceState.restTimer?.startedAt).toBe(Date.now());
    expect(plugin.deviceState.runningTimer?.startedAt).toBe(taskStartedAt! + 4_020_000);
    expect(plugin.deviceState.runningTimer?.pausedAt).toBeUndefined();
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    persistPromptedToday();
    await restartPlugin();
    await vi.advanceTimersByTimeAsync(1_799_000);
    expect(harness.modals).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(harness.modals).toHaveLength(2);
  });

  it("restores a minimized desktop and keeps a paused task paused across restart", async () => {
    Platform.isDesktopApp = true;
    const host = {
      isMinimized: vi.fn(() => true), restore: vi.fn(), show: vi.fn(), focus: vi.fn(), flashFrame: vi.fn(),
      webContents: { getBackgroundThrottling: vi.fn(() => true), setBackgroundThrottling: vi.fn() },
    };
    Object.assign(browser, { electronWindow: host });
    persistPromptedToday();
    await restartPlugin();
    expect(host.webContents.setBackgroundThrottling).toHaveBeenCalledWith(false);
    doc.hidden = true;
    await vi.advanceTimersByTimeAsync(1_800_000);
    expect(harness.modals).toHaveLength(1);
    expect(host.restore).toHaveBeenCalledOnce();
    expect(host.focus).toHaveBeenCalledOnce();
    expect(elapsedTimerSeconds(plugin.deviceState.runningTimer!)).toBe(1_800);
    await vi.advanceTimersByTimeAsync(420_000);
    await restartPlugin();
    expect(harness.modals).toHaveLength(2);
    expect(elapsedTimerSeconds(plugin.deviceState.runningTimer!)).toBe(1_800);
    await vi.advanceTimersByTimeAsync(180_000);
    await button(harness.modals[1], "知道了").click();
    expect(plugin.deviceState.runningTimer?.pausedAt).toBeUndefined();
    await vi.advanceTimersByTimeAsync(120_000);
    await plugin.toggleTimer(reading, day);
    expect(cumulativeDurationSeconds(reading.id, plugin.events)).toBe(1_920);
    expect(host.flashFrame).toHaveBeenCalledWith(false);
    plugin.unload();
    expect(host.webContents.setBackgroundThrottling).toHaveBeenLastCalledWith(true);
  });

  it("stop and save dismisses once, records one total, and cannot restart from a stale dialog", async () => {
    await vi.advanceTimersByTimeAsync(1_800_000);
    const modal = harness.modals[0];
    const stop = button(modal, "停止并保存，去休息");
    await stop.click();
    expect(plugin.deviceState.runningTimer).toBeUndefined();
    expect(harness.appendEvent).toHaveBeenCalledTimes(1);
    expect(plugin.events).toHaveLength(1);
    expect(cumulativeDurationSeconds(reading.id, plugin.events)).toBe(1_800);
    expect(modal.opened).toBe(false);
    expect(modal.dismissCount).toBe(1);
    // Simulate a late callback that was already captured before the dialog closed.
    await stop.listeners.get("click")?.();
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(plugin.deviceState.runningTimer).toBeUndefined();
    expect(harness.appendEvent).toHaveBeenCalledTimes(1);
    expect(harness.modals).toHaveLength(2);
  });

  it("keeps a failed save recoverable and saves the full duration once on retry", async () => {
    await vi.advanceTimersByTimeAsync(1_800_000);
    const running = plugin.deviceState.runningTimer;
    const modal = harness.modals[0];
    const stop = button(modal, "停止并保存，去休息");
    harness.appendEvent.mockRejectedValueOnce(new Error("disk full"));
    await stop.click();
    expect(plugin.deviceState.runningTimer).toBe(running);
    expect(plugin.events).toHaveLength(0);
    expect(modal.opened).toBe(true);
    expect(stop.disabled).toBe(false);
    expect(button(modal, "知道了").disabled).toBe(false);
    expect(harness.notices).toHaveBeenCalledWith("计时未保存：disk full");
    await vi.advanceTimersByTimeAsync(5_000);
    await stop.click();
    expect(plugin.deviceState.runningTimer).toBeUndefined();
    expect(plugin.events).toHaveLength(1);
    expect(cumulativeDurationSeconds(reading.id, plugin.events)).toBe(1_800);
    expect(harness.appendEvent).toHaveBeenCalledTimes(2);
    expect(modal.dismissCount).toBe(1);
  });

  it("a dismissed dialog cannot stop a switched session, including after unload", async () => {
    await vi.advanceTimersByTimeAsync(1_800_000);
    const modal = harness.modals[0];
    const staleStop = button(modal, "停止并保存，去休息").listeners.get("click");
    await plugin.toggleTimer(exercise, day);
    const switched = plugin.deviceState.runningTimer;
    expect(switched?.habitId).toBe(exercise.id);
    expect(modal.opened).toBe(false);
    await staleStop?.();
    expect(plugin.deviceState.runningTimer).toBe(switched);
    plugin.unload();
    await staleStop?.();
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(plugin.deviceState.runningTimer).toBe(switched);
    expect(harness.appendEvent).toHaveBeenCalledTimes(1);
    expect(harness.modals).toHaveLength(1);
  });

  it("unloads an open reminder without saving or disturbing the resumable timer", async () => {
    await vi.advanceTimersByTimeAsync(1_800_000);
    const modal = harness.modals[0];
    const staleStop = button(modal, "停止并保存，去休息").listeners.get("click");
    const running = plugin.deviceState.runningTimer;
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    plugin.unload();
    expect(modal.opened).toBe(false);
    expect(modal.dismissCount).toBe(1);
    expect(plugin.deviceState.restTimer?.lastRestReminderSeconds).toBeUndefined();
    expect(harness.chimes[0].dispose).toHaveBeenCalledOnce();
    await staleStop?.();
    browser.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(plugin.deviceState.runningTimer).toBe(running);
    expect(harness.appendEvent).not.toHaveBeenCalled();
    expect(harness.modals).toHaveLength(1);
  });

  it("does not duplicate a save when the stop button is pressed again while writing", async () => {
    await vi.advanceTimersByTimeAsync(1_800_000);
    const modal = harness.modals[0];
    const stop = button(modal, "停止并保存，去休息");
    let completeWrite!: () => void;
    harness.appendEvent.mockImplementationOnce(() => new Promise<void>((resolve) => { completeWrite = resolve; }));
    const saving = stop.click();
    await Promise.resolve();
    expect(stop.disabled).toBe(true);
    await stop.listeners.get("click")?.();
    expect(harness.appendEvent).toHaveBeenCalledTimes(1);
    completeWrite();
    await saving;
    expect(plugin.deviceState.runningTimer).toBeUndefined();
    expect(cumulativeDurationSeconds(reading.id, plugin.events)).toBe(1_800);
    expect(modal.dismissCount).toBe(1);
  });
});
