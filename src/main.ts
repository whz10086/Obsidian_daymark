import {
  Notice,
  Platform,
  Plugin,
  TAbstractFile,
  WorkspaceLeaf,
} from "obsidian";

import type { DaymarkController } from "./controller";
import { DailyRitualModal } from "./daily-ritual-modal";
import { getDailyRitualPassage } from "./daily-ritual";
import { createDefaultSettings, VIEW_TYPE_DAYMARK } from "./defaults";
import { DeviceStateStore } from "./device-state";
import { DesktopReminder } from "./desktop-reminder";
import { todayKey } from "./date-utils";
import { effectiveRule } from "./domain";
import { createTrackerEvent } from "./event-factory";
import { generateId } from "./id";
import { GalleryStorage, type GalleryItem } from "./gallery";
import { ActivityStorage } from "./activity-storage";
import type { ActivitySelection } from "./activity-list";
import { ActivityView, VIEW_TYPE_ACTIVITY } from "./activity-view";
import { applyHabitOrder, moveHabitIds, type HabitOrderGroup } from "./habit-order";
import { HabitOrderStorage } from "./habit-order-storage";
import { HabitModal } from "./modals";
import { RestReminderChime } from "./rest-chime";
import { RestReminderModal } from "./rest-modal";
import { DaymarkSettingTab } from "./settings";
import { DaymarkStorage, validateDataFolder } from "./storage";
import { dueRestReminderSeconds, elapsedTimerSeconds } from "./timer";
import type {
  DailyRitualCheckIn,
  DataIssue,
  DaymarkSettings,
  DeviceState,
  Habit,
  TrackerEvent,
} from "./types";
import { DaymarkView } from "./view";

interface AppWithSettings {
  setting?: {
    open(): void;
    openTabById(id: string): void;
  };
}

const HEARTBEAT_STALE_MS = 5_000;
const RESUME_THROTTLE_MS = 500;

function timezoneIsValid(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export default class DaymarkPlugin extends Plugin implements DaymarkController {
  settings: DaymarkSettings = createDefaultSettings();
  dailyReflectionSeed = "daymark";
  habits: Habit[] = [];
  events: TrackerEvent[] = [];
  dailyRitualCheckIns: DailyRitualCheckIn[] = [];
  issues: DataIssue[] = [];
  galleryItems: GalleryItem[] = [];
  activitySelections: ActivitySelection[] = [];
  private habitOrder: HabitOrderGroup[] = [];
  private reordering = false;
  private openingActivity?: Promise<void>;

  private storage!: DaymarkStorage;
  private deviceStore!: DeviceStateStore;
  private reloadTimer: number | undefined;
  private reloadPromise: Promise<void> | undefined;
  private reloadQueued = false;
  private timerOperation: Promise<void> | undefined;
  private readonly restChime = new RestReminderChime();
  private readonly desktopReminder = new DesktopReminder();
  private restModal: RestReminderModal | undefined;
  private dailyRitualModal: DailyRitualModal | undefined;
  private dailyRitualModalDate: string | undefined;
  private restReminderInterval: number | undefined;
  private lastHeartbeatAt = 0;
  private lastResumeAt = 0;
  private layoutReady = false;
  private unloaded = false;

  get deviceState(): DeviceState {
    return this.deviceStore.state;
  }

  async onload(): Promise<void> {
    this.unloaded = false;
    this.layoutReady = false;
    await this.loadSettings();
    this.deviceStore = new DeviceStateStore(this.app);
    if (!Number.isFinite(this.deviceState.restTimer?.startedAt)) {
      this.deviceState.restTimer = { startedAt: Date.now() };
      this.deviceStore.save();
    }
    this.storage = new DaymarkStorage(this.app, this.settings.dataFolder);
    this.desktopReminder.start();
    // Vault's file index may still be empty during a full application startup.
    // Register the plugin first; all Vault initialization runs after layout ready.

    this.registerView(
      VIEW_TYPE_DAYMARK,
      (leaf: WorkspaceLeaf) => new DaymarkView(leaf, this),
    );
    this.registerView(VIEW_TYPE_ACTIVITY, (leaf) => new ActivityView(leaf, this));
    this.addCommand({ id: "open-activity-window", name: "打开活动悬浮窗", callback: () => { void this.openActivityView().catch((error) => new Notice(String(error))); } });
    this.addRibbonIcon("calendar-check", "打开日迹", () => {
      void this.activateView();
    });
    this.addCommand({
      id: "open-daymark",
      name: "打开日迹",
      callback: () => {
        void this.activateView();
      },
    });
    this.addCommand({
      id: "create-daymark-habit",
      name: "新建日迹项目",
      callback: () => this.openHabitEditor(),
    });
    this.addSettingTab(new DaymarkSettingTab(this.app, this));

    const scheduleReload = (file: TAbstractFile, oldPath?: string): void => {
      if (!this.layoutReady || this.unloaded) return;
      if (this.storage.isManagedPath(file.path) || (oldPath && this.storage.isManagedPath(oldPath))) {
        this.scheduleReload();
      }
    };
    this.registerEvent(this.app.vault.on("create", (file) => scheduleReload(file)));
    this.registerEvent(this.app.vault.on("modify", (file) => scheduleReload(file)));
    this.registerEvent(this.app.vault.on("delete", (file) => scheduleReload(file)));
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => scheduleReload(file, oldPath)),
    );

    this.app.workspace.onLayoutReady(() => {
      if (this.unloaded) return;
      this.layoutReady = true;
      void this.reloadData()
        .then(() => {
          if (this.unloaded) return;
          this.checkRestReminder();
          this.showDailyRitualIfNeeded();
          const daymarkLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAYMARK);
          const hasStaleView = daymarkLeaves.some((leaf) => !(leaf.view instanceof DaymarkView));
          if (this.deviceState.reopenActivityOnLoad || this.app.workspace.getLeavesOfType(VIEW_TYPE_ACTIVITY).length) {
            void this.openActivityView().catch((error) => new Notice(`活动窗口恢复失败：${String(error)}`));
          }
          if (this.deviceState.reopenViewOnLoad === true || hasStaleView) {
            void this.activateView().catch((error) => {
              new Notice(`日迹视图恢复失败：${error instanceof Error ? error.message : String(error)}`);
            });
          }
        })
        .catch((error) => {
          new Notice(`日迹加载失败：${error instanceof Error ? error.message : String(error)}`);
        });
    });
    this.restartRestReminderHeartbeat();
    const primeRunningTimerChime = (): void => {
      this.restChime.prime();
    };
    this.registerDomEvent(document, "pointerdown", primeRunningTimerChime);
    this.registerDomEvent(document, "keydown", primeRunningTimerChime);
    this.registerDomEvent(document, "visibilitychange", () => {
      if (!document.hidden) this.recoverFromSuspend();
    });
    this.registerDomEvent(document, "resume" as keyof DocumentEventMap, () => {
      this.recoverFromSuspend();
    });
    this.registerDomEvent(window, "focus", () => this.recoverFromSuspend());
    this.registerDomEvent(window, "pageshow", () => this.recoverFromSuspend());
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.recoverFromSuspend()),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        if (Date.now() - this.lastHeartbeatAt > HEARTBEAT_STALE_MS) {
          this.recoverFromSuspend();
        }
      }),
    );
  }

  onunload(): void {
    this.unloaded = true;
    this.layoutReady = false;
    const daymarkWasOpen = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAYMARK).length > 0;
    if (this.deviceStore) {
      this.deviceStore.state.reopenViewOnLoad = daymarkWasOpen;
      this.deviceStore.state.reopenActivityOnLoad = this.app.workspace.getLeavesOfType(VIEW_TYPE_ACTIVITY).length > 0;
      this.deviceStore.save();
    }
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DAYMARK);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ACTIVITY);
    if (this.reloadTimer !== undefined) window.clearTimeout(this.reloadTimer);
    if (this.restReminderInterval !== undefined) {
      window.clearInterval(this.restReminderInterval);
      this.restReminderInterval = undefined;
    }
    this.closeDailyRitual();
    this.closeRestReminder();
    this.restChime.dispose();
    this.desktopReminder.dispose();
  }

  private restartRestReminderHeartbeat(): void {
    if (this.restReminderInterval !== undefined) {
      window.clearInterval(this.restReminderInterval);
    }
    this.lastHeartbeatAt = Date.now();
    this.restReminderInterval = window.setInterval(() => {
      if (document.hidden && !this.desktopReminder.supportsBackground) return;
      const now = Date.now();
      if (now - this.lastHeartbeatAt > HEARTBEAT_STALE_MS) {
        // A delayed callback can arrive before focus/visibility events. Preserve
        // the gap as a recovery signal instead of overwriting it first.
        this.recoverFromSuspend(true);
        return;
      }
      this.lastHeartbeatAt = now;
      this.checkRestReminder();
    }, 1_000);
  }

  private recoverFromSuspend(forceRecovery = false): void {
    if (this.unloaded || (document.hidden && !this.desktopReminder.supportsBackground)) return;
    const now = Date.now();
    const heartbeatWasStale = forceRecovery || now - this.lastHeartbeatAt > HEARTBEAT_STALE_MS;
    if (!heartbeatWasStale && now - this.lastResumeAt < RESUME_THROTTLE_MS) return;
    this.lastResumeAt = now;
    this.restartRestReminderHeartbeat();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DAYMARK)) {
      if (leaf.view instanceof DaymarkView) leaf.view.recoverFromSuspend();
    }

    this.checkRestReminder();
    if (this.layoutReady) this.showDailyRitualIfNeeded();
    if (!heartbeatWasStale || !this.layoutReady) return;
    void this.reloadData()
      .then(() => {
        if (this.unloaded) return;
        this.checkRestReminder();
        if (this.layoutReady) this.showDailyRitualIfNeeded();
      })
      .catch((error) => {
        new Notice(`日迹恢复刷新失败：${error instanceof Error ? error.message : String(error)}`);
      });
  }

  private showDailyRitualIfNeeded(): void {
    if (this.unloaded || !this.layoutReady || this.restModal) return;
    const date = todayKey(new Date(), this.settings.timezone);
    if (this.hasDailyRitualCheckIn(date)) {
      if (this.dailyRitualModal) this.closeDailyRitual();
      return;
    }
    if (this.dailyRitualModal) {
      if (this.dailyRitualModalDate !== date) {
        this.replaceDailyRitualModal(this.dailyRitualModal, date);
      }
      return;
    }
    if (this.deviceState.lastDailyRitualDate === date) return;
    this.openDailyRitualModal(date);
  }

  openDailyRitualCheckIn(): void {
    if (this.unloaded) return;
    const date = todayKey(new Date(), this.settings.timezone);
    if (this.hasDailyRitualCheckIn(date)) {
      if (this.dailyRitualModal) this.closeDailyRitual();
      new Notice("今日已经签到");
      return;
    }
    if (this.dailyRitualModal) {
      if (this.dailyRitualModalDate !== date) {
        this.replaceDailyRitualModal(this.dailyRitualModal, date);
      }
      return;
    }
    if (this.restModal) {
      new Notice("请先处理当前的休息提醒");
      return;
    }
    this.openDailyRitualModal(date);
  }

  private hasDailyRitualCheckIn(date: string): boolean {
    return this.dailyRitualCheckIns.some((checkIn) => checkIn.occurredOn === date);
  }

  private createDailyRitualModal(date: string): DailyRitualModal {
    const passage = getDailyRitualPassage(date, this.dailyReflectionSeed);
    let pendingCheckIn: DailyRitualCheckIn | undefined;
    let modal!: DailyRitualModal;
    modal = new DailyRitualModal(this.app, {
      date,
      passage,
      onCheckIn: async () => {
        const recordedAt = new Date();
        const currentDate = todayKey(recordedAt, this.settings.timezone);
        if (currentDate !== date) {
          this.replaceDailyRitualModal(modal, currentDate);
          new Notice("日期已更新，请完成今天的签到");
          return;
        }
        if (this.hasDailyRitualCheckIn(date)) return;
        const checkIn = pendingCheckIn ?? {
          version: 1,
          id: generateId("checkin"),
          type: "daily-ritual",
          occurredOn: date,
          recordedAt: recordedAt.toISOString(),
          timezone: this.settings.timezone,
          deviceId: this.deviceState.deviceId,
          passageId: passage.id,
        } satisfies DailyRitualCheckIn;
        pendingCheckIn = checkIn;
        await this.storage.appendDailyRitualCheckIn(checkIn);
        this.dailyRitualCheckIns = [...this.dailyRitualCheckIns, checkIn].sort(
          (a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id),
        );
        this.refreshViews();
        new Notice("今日签到完成");
      },
      onDismiss: () => {
        if (this.dailyRitualModal === modal) {
          this.dailyRitualModal = undefined;
          this.dailyRitualModalDate = undefined;
        }
        this.checkRestReminder();
      },
    });
    return modal;
  }

  private openDailyRitualModal(date: string): void {
    const modal = this.createDailyRitualModal(date);
    // This device-local flag means "prompted today", not "checked in".
    this.deviceStore.state.lastDailyRitualDate = date;
    this.deviceStore.save();
    this.dailyRitualModal = modal;
    this.dailyRitualModalDate = date;
    modal.open();
  }

  private replaceDailyRitualModal(previous: DailyRitualModal, date: string): void {
    if (this.unloaded || this.dailyRitualModal !== previous) return;
    if (this.hasDailyRitualCheckIn(date)) {
      this.closeDailyRitual();
      return;
    }
    const replacement = this.createDailyRitualModal(date);
    this.deviceStore.state.lastDailyRitualDate = date;
    this.deviceStore.save();
    this.dailyRitualModal = replacement;
    this.dailyRitualModalDate = date;
    previous.close();
    replacement.open();
  }

  private closeDailyRitual(): void {
    const modal = this.dailyRitualModal;
    this.dailyRitualModal = undefined;
    this.dailyRitualModalDate = undefined;
    modal?.close();
  }

  private closeRestReminder(): void {
    const modal = this.restModal;
    this.restModal = undefined;
    modal?.close();
  }

  private checkRestReminder(): void {
    if (
      this.unloaded ||
      (document.hidden && !this.desktopReminder.supportsBackground) ||
      this.timerOperation ||
      this.restModal
    ) return;
    const running = this.deviceState.runningTimer;
    const restTimer = this.deviceState.restTimer;
    if (!restTimer) return;
    const milestone = dueRestReminderSeconds(restTimer);
    if (milestone === undefined) return;
    const habit = this.habits.find((item) => item.id === running?.habitId && item.type === "duration");
    if (running && running.pausedAt === undefined) {
      running.pausedAt = Date.now();
      this.deviceStore.save();
    }

    const modal = new RestReminderModal(this.app, {
      habitName: habit?.name,
      elapsedSeconds: elapsedTimerSeconds(restTimer),
      soundMode: this.deviceState.restSoundMode,
      onModeChange: (mode) => { this.deviceState.restSoundMode = mode; this.deviceStore.save(); },
      onReplaySound: (mode) => this.restChime.play(mode),
      onStop: async () => {
        // A stale dialog must never stop or restart a different session.
        if (!this.unloaded && running && habit && this.deviceState.runningTimer === running) {
          await this.toggleTimer(habit, running.date);
        }
      },
      onDismiss: () => {
        if (this.restModal === modal) this.restModal = undefined;
        if (!this.unloaded && this.deviceState.restTimer === restTimer) {
          if (running && this.deviceState.runningTimer === running && running.pausedAt !== undefined) {
            running.startedAt += Math.max(0, Date.now() - running.pausedAt);
            delete running.pausedAt;
          }
          // Time spent in the reminder is rest, not part of the next cycle.
          restTimer.startedAt = Date.now();
          delete restTimer.lastRestReminderSeconds;
          this.deviceStore.save();
          this.refreshViews();
        }
        this.desktopReminder.dismiss();
        this.showDailyRitualIfNeeded();
      },
    });
    this.restModal = modal;
    // A due rest reminder must not be hidden indefinitely behind the optional
    // daily check-in. Assign the rest modal first so the check-in's onClose
    // callback cannot recursively open a duplicate reminder.
    if (this.dailyRitualModal) this.closeDailyRitual();
    modal.open();
    this.refreshViews();
    this.desktopReminder.reveal();
    void this.restChime.play(this.deviceState.restSoundMode ?? "bell").catch(() => false);
  }

  async onExternalSettingsChange(): Promise<void> {
    await this.loadSettings();
    this.storage.setDataFolder(this.settings.dataFolder);
    await this.reloadData();
  }

  private async loadSettings(): Promise<void> {
    const defaults = createDefaultSettings();
    const stored = (await this.loadData()) as Partial<DaymarkSettings> | null;
    const next: DaymarkSettings = {
      dataFolder:
        typeof stored?.dataFolder === "string" ? stored.dataFolder : defaults.dataFolder,
      firstDayOfWeek:
        stored?.firstDayOfWeek === "sunday" || stored?.firstDayOfWeek === "monday"
          ? stored.firstDayOfWeek
          : defaults.firstDayOfWeek,
      timezone: typeof stored?.timezone === "string" ? stored.timezone : defaults.timezone,
    };
    if (validateDataFolder(next.dataFolder)) next.dataFolder = defaults.dataFolder;
    if (!timezoneIsValid(next.timezone)) next.timezone = defaults.timezone;
    this.settings = next;
  }

  async updateSettings(settings: DaymarkSettings): Promise<void> {
    const folderProblem = validateDataFolder(settings.dataFolder);
    if (folderProblem) throw new Error(folderProblem);
    if (!timezoneIsValid(settings.timezone)) throw new Error("统计时区无效");
    const folderChanged = settings.dataFolder !== this.settings.dataFolder;
    this.settings = settings;
    await this.saveData(this.settings);
    if (folderChanged) {
      if (this.deviceState.runningTimer) {
        this.deviceStore.state = {
          ...this.deviceState,
          runningTimer: undefined,
        };
        this.deviceStore.save();
        this.closeRestReminder();
        new Notice("数据目录已更换，当前设备的计时器已停止且未写入");
      }
      this.storage.setDataFolder(settings.dataFolder);
      await this.reloadData();
    } else {
      this.refreshViews();
    }
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAYMARK);
    const usable = existing.filter((leaf) => leaf.view instanceof DaymarkView);
    let mainAreaLeaf: WorkspaceLeaf | undefined;
    this.app.workspace.iterateRootLeaves((leaf) => {
      if (!mainAreaLeaf && usable.includes(leaf)) mainAreaLeaf = leaf;
    });
    if (mainAreaLeaf) {
      await this.app.workspace.revealLeaf(mainAreaLeaf);
      for (const leaf of existing) {
        if (leaf !== mainAreaLeaf) leaf.detach();
      }
      return;
    }

    // Older releases opened Daymark in the right sidebar. Create the main-area
    // copy first so a failed view transition never destroys the working view.
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_DAYMARK, active: true });
    await this.app.workspace.revealLeaf(leaf);
    for (const oldLeaf of existing) oldLeaf.detach();
  }

  openSettings(): void {
    const manager = (this.app as typeof this.app & AppWithSettings).setting;
    manager?.open();
    manager?.openTabById(this.manifest.id);
  }

  async openActivityView(date?: string): Promise<void> {
    if (this.openingActivity) return this.openingActivity;
    this.openingActivity = (async () => {
      const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_ACTIVITY);
      const reusable = existing.find((leaf) => leaf.view instanceof ActivityView);
      if (reusable) {
        // A restored/docked leaf is not a native floating window.
        if (Platform.isDesktopApp && reusable.view.containerEl?.ownerDocument === document) {
          this.app.workspace.moveLeafToPopout(reusable, { size: { width: 420, height: 680 } });
        }
        if (date) await reusable.setViewState({ type: VIEW_TYPE_ACTIVITY, state: { ...reusable.view.getState(), date }, active: true });
        await this.app.workspace.revealLeaf(reusable);
        for (const leaf of existing) if (leaf !== reusable) leaf.detach();
        return;
      }
      const leaf = Platform.isDesktopApp
        ? this.app.workspace.openPopoutLeaf({ size: { width: 420, height: 680 } })
        : this.app.workspace.getLeaf("tab");
      try {
        await leaf.setViewState({ type: VIEW_TYPE_ACTIVITY, state: { date: date ?? todayKey(new Date(), this.settings.timezone), pinned: this.deviceState.activityWindowPinned ?? true }, active: true });
        await this.app.workspace.revealLeaf(leaf);
      } catch (error) { leaf.detach(); throw error; }
      for (const old of existing) old.detach();
    })();
    try { await this.openingActivity; } finally { this.openingActivity = undefined; }
  }

  private scheduleReload(): void {
    if (this.reloadTimer !== undefined) window.clearTimeout(this.reloadTimer);
    this.reloadTimer = window.setTimeout(() => {
      this.reloadTimer = undefined;
      void this.reloadData().catch((error) => {
        new Notice(`日迹刷新失败：${error instanceof Error ? error.message : String(error)}`);
      });
    }, 300);
  }

  async reloadData(): Promise<void> {
    if (this.reloadPromise) {
      this.reloadQueued = true;
      return this.reloadPromise;
    }
    this.reloadPromise = (async () => {
      do {
        this.reloadQueued = false;
        this.dailyReflectionSeed = await this.storage.getOrCreateVaultIdentity();
        const snapshot = await this.storage.loadAll();
        this.habits = snapshot.habits;
        this.events = snapshot.events;
        this.dailyRitualCheckIns = snapshot.checkIns;
        this.issues = snapshot.issues;
        const orderStorage = new HabitOrderStorage(this.app, this.settings.dataFolder);
        try {
          this.habitOrder = await orderStorage.load();
          this.habits = applyHabitOrder(this.habits, this.habitOrder);
        } catch (error) {
          this.habitOrder = [];
          this.issues = [...this.issues, { path: orderStorage.path, message: String(error) }];
        }
        this.galleryItems = await new GalleryStorage(this.app, this.settings.dataFolder).load();
        const activities = await new ActivityStorage(this.app, this.settings.dataFolder).load();
        this.activitySelections = activities.entries;
        this.issues.push(...activities.issues);
        const today = todayKey(new Date(), this.settings.timezone);
        if (this.dailyRitualModal && this.hasDailyRitualCheckIn(today)) {
          this.closeDailyRitual();
        }
        this.refreshViews();
      } while (this.reloadQueued);
    })();
    try {
      await this.reloadPromise;
    } finally {
      this.reloadPromise = undefined;
    }
  }

  private refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DAYMARK)) {
      if (leaf.view instanceof DaymarkView) leaf.view.refresh();
    }
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ACTIVITY)) {
      if (leaf.view instanceof ActivityView) leaf.view.refresh();
    }
  }

  async reorderHabit(sourceId: string, targetId: string, after = false): Promise<void> {
    if (this.reordering || sourceId === targetId) return;
    this.reordering = true;
    try {
      const group = moveHabitIds(this.habits, sourceId, targetId, after);
      const expected = this.habitOrder.find((item) => item.category === group.category)?.ids ?? [];
      await new HabitOrderStorage(this.app, this.settings.dataFolder).save(group, expected);
      await this.reloadData();
    } catch (error) {
      await this.reloadData();
      throw error;
    } finally { this.reordering = false; }
  }

  setActivityWindowPinned(pinned: boolean): void {
    this.deviceState.activityWindowPinned = pinned;
    this.deviceStore.save();
  }

  async importGalleryImages(files: File[]): Promise<void> {
    const gallery = new GalleryStorage(this.app, this.settings.dataFolder);
    let success = 0;
    const failures: string[] = [];
    for (const file of files) {
      try { await gallery.importImage(file); success += 1; }
      catch (error) { failures.push(`${file.name}：${error instanceof Error ? error.message : String(error)}`); }
    }
    await this.reloadData();
    new Notice(`已导入 ${success} 张作品${failures.length ? `；${failures.join("；")}` : ""}`, failures.length ? 15000 : 5000);
  }

  async saveGalleryDetails(path: string, title: string, description: string): Promise<void> {
    await new GalleryStorage(this.app, this.settings.dataFolder).saveDetails(path, title, description);
    await this.reloadData();
  }

  async setActivitySelected(date: string, habitId: string, included: boolean): Promise<void> {
    this.ensureRecordableDate(date);
    const habit = this.habits.find((item) => item.id === habitId);
    if (included && (!habit || (habit.type !== "duration" && habit.type !== "count") || !effectiveRule(habit, date))) {
      throw new Error("请选择当天已有目标的计时或计次项目");
    }
    await new ActivityStorage(this.app, this.settings.dataFolder).append(date, habitId, included);
    await this.reloadData();
  }

  openHabitEditor(habit?: Habit): void {
    const date = todayKey(new Date(), this.settings.timezone);
    const expectedUpdatedAt = habit?.updatedAt;
    const nextOrder = this.habits.reduce((max, item) => Math.max(max, item.order), -1) + 1;
    new HabitModal(this.app, {
      habit,
      effectiveDate: date,
      nextOrder,
      onSubmit: (updated) => this.persistHabit(updated, expectedUpdatedAt),
    }).open();
  }

  private async persistHabit(habit: Habit, expectedUpdatedAt?: string): Promise<void> {
    await this.storage.saveHabit(habit, expectedUpdatedAt);
    await this.reloadData();
  }

  async archiveHabit(habit: Habit): Promise<void> {
    await this.setHabitEnabled(habit, false);
    new Notice(`${habit.name} 已归档，历史记录仍然保留`);
  }

  async restoreHabit(habit: Habit): Promise<void> {
    await this.setHabitEnabled(habit, true);
    new Notice(`${habit.name} 已恢复`);
  }

  private async setHabitEnabled(habit: Habit, enabled: boolean): Promise<void> {
    const date = todayKey(new Date(), this.settings.timezone);
    const current = effectiveRule(habit, date);
    if (current?.enabled === enabled) return;
    const now = new Date().toISOString();
    const updated: Habit = {
      ...habit,
      updatedAt: now,
      rules: [
        ...habit.rules.map((rule) => ({ ...rule, weekdays: [...rule.weekdays] })),
        {
          id: generateId("rule"),
          effectiveFrom: date,
          enabled,
          weekdays: [...(current?.weekdays ?? [0, 1, 2, 3, 4, 5, 6])],
          target: current?.target ?? 1,
          createdAt: now,
        },
      ],
    };
    await this.persistHabit(updated, habit.updatedAt);
  }

  private async appendEvent(event: TrackerEvent, habit: Habit, refresh = true): Promise<void> {
    await this.storage.appendEvent(event, habit.name);
    this.events = [...this.events, event].sort(
      (a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id),
    );
    if (refresh) this.refreshViews();
  }

  private ensureRecordableDate(date: string): void {
    const today = todayKey(new Date(), this.settings.timezone);
    if (date > today) throw new Error("不能记录未来日期");
  }

  async recordCheckbox(habit: Habit, date: string, value: boolean): Promise<void> {
    this.ensureRecordableDate(date);
    if (habit.type !== "checkbox") throw new Error("这个项目不是完成型");
    const event = createTrackerEvent(this.settings, this.deviceState, {
      habitId: habit.id,
      type: "set",
      occurredOn: date,
      value,
    });
    await this.appendEvent(event, habit);
  }

  async recordNumber(habit: Habit, date: string, value: number, note = ""): Promise<void> {
    this.ensureRecordableDate(date);
    if (habit.type !== "count" && habit.type !== "duration") {
      throw new Error("这个项目不是次数型或时长型");
    }
    const event = createTrackerEvent(this.settings, this.deviceState, {
      habitId: habit.id,
      type: "add",
      occurredOn: date,
      value,
      note,
    });
    await this.appendEvent(event, habit);
  }

  async recordText(habit: Habit, date: string, value: string): Promise<void> {
    this.ensureRecordableDate(date);
    if (habit.type !== "text") throw new Error("这个项目不是文字型");
    const event = createTrackerEvent(this.settings, this.deviceState, {
      habitId: habit.id,
      type: "note",
      occurredOn: date,
      value,
    });
    await this.appendEvent(event, habit);
  }

  async retractEvent(habit: Habit, target: TrackerEvent): Promise<void> {
    if (target.habitId !== habit.id || target.type === "retract") {
      throw new Error("不能撤销这条记录");
    }
    if (this.events.some((event) => event.type === "retract" && event.targetEventId === target.id)) {
      throw new Error("这条记录已经撤销");
    }
    const event = createTrackerEvent(this.settings, this.deviceState, {
      habitId: habit.id,
      type: "retract",
      occurredOn: target.occurredOn,
      targetEventId: target.id,
    });
    await this.appendEvent(event, habit);
  }

  async toggleTimer(habit: Habit, date: string): Promise<void> {
    if (this.timerOperation) throw new Error("计时器正在保存，请稍候");
    if (!this.deviceState.runningTimer) this.restChime.prime();
    this.timerOperation = this.performTimerToggle(habit, date);
    try {
      await this.timerOperation;
    } finally {
      this.timerOperation = undefined;
    }
  }

  private async performTimerToggle(habit: Habit, date: string): Promise<void> {
    if (habit.type !== "duration") throw new Error("只有时长型项目可以计时");
    const running = this.deviceState.runningTimer;
    const today = todayKey(new Date(), this.settings.timezone);
    if (!running) {
      this.ensureRecordableDate(date);
      if (date !== today) throw new Error("计时器只能从今天开始；历史日期请手动补记");
    } else if ((running.habitId !== habit.id || running.date !== date) && date !== today) {
      throw new Error("新的计时只能从今天开始；历史日期请手动补记");
    }
    if (running) {
      const runningHabit = this.habits.find((item) => item.id === running.habitId);
      const elapsedMilliseconds = (running.pausedAt ?? Date.now()) - running.startedAt;
      if (elapsedMilliseconds < 0) throw new Error("系统时间早于计时开始时间；计时器已保留，请校准时间后重试");
      const seconds = Math.max(1, Math.floor(elapsedMilliseconds / 1_000));
      if (!runningHabit || runningHabit.type !== "duration") {
        this.deviceStore.state = {
          ...this.deviceState,
          runningTimer: undefined,
        };
        this.deviceStore.save();
        this.closeRestReminder();
        this.refreshViews();
        throw new Error("原计时项目已不存在，计时器已清除");
      }
      const event = createTrackerEvent(this.settings, this.deviceState, {
        habitId: runningHabit.id,
        type: "add",
        occurredOn: running.date,
        value: seconds,
        note: "计时器记录",
      });
      await this.appendEvent(event, runningHabit, false);
      this.deviceStore.state = {
        ...this.deviceState,
        runningTimer: undefined,
      };
      this.deviceStore.save();
      this.closeRestReminder();
      if (running.habitId === habit.id && running.date === date) {
        this.refreshViews();
        return;
      }
      new Notice(`${runningHabit.name} 的计时已保存，已开始新的计时`);
    }
    this.deviceStore.state = {
      ...this.deviceState,
      runningTimer: { habitId: habit.id, date, startedAt: Date.now() },
    };
    this.deviceStore.save();
    this.refreshViews();
  }
}
