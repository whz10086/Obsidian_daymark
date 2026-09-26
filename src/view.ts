import { ItemView, Notice, setIcon, WorkspaceLeaf } from "obsidian";

import type { DaymarkController } from "./controller";
import { selectedActivityIds } from "./activity-list";
import { habitCategory } from "./habit-order";
import { writeActivityDrag } from "./activity-drag";
import { GalleryEditModal, GalleryImageModal } from "./gallery-modal";
import {
  addDays,
  addMonths,
  daysBetweenInclusive,
  endOfMonth,
  formatDateLabel,
  formatMonthLabel,
  keyToDate,
  startOfMonth,
  todayKey,
} from "./date-utils";
import {
  bestActivityStreak,
  cumulativeDurationSeconds,
  currentActivityStreak,
  effectiveRule,
  isHabitScheduled,
  latestRetractableEvent,
  projectHabitDay,
  summarizeDay,
} from "./domain";
import { VIEW_TYPE_DAYMARK } from "./defaults";
import {
  getDailyIChingLine,
  ICHING_REFLECTION_DISCLAIMER,
} from "./iching";
import { getDailyRitualPassage } from "./daily-ritual";
import {
  buildMilestoneProgress,
  ELDER_FUTHARK_RUNES,
  evaluateMilestoneProgress,
  HEXAGRAM_STEP_HOURS,
  MILESTONE_HEXAGRAMS,
  MILESTONE_STAGES,
  MILESTONE_SYMBOL_SYSTEMS,
} from "./milestones";
import type { RewardSymbol } from "./milestones";
import { IssuesModal, NumericRecordModal, TextRecordModal } from "./modals";
import { buildRangeStatistics, resolveStatisticsRange } from "./statistics";
import type {
  DailyStatistics,
  HabitStatistics,
  StatisticsRange,
} from "./statistics";
import { elapsedTimerSeconds, REST_INTERVAL_SECONDS } from "./timer";
import type { Habit, HabitProjection, TrackerEvent } from "./types";

type ViewTab = "today" | "history" | "gallery";

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const rest = safe % 60;
  if (hours > 0) return `${hours}小时${minutes > 0 ? `${minutes}分` : ""}`;
  if (minutes > 0) return `${minutes}分${rest > 0 ? `${rest}秒` : ""}`;
  return `${rest}秒`;
}

function formatClock(seconds: number, includeHours = false): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const rest = safe % 60;
  return hours > 0 || includeHours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 3 }).format(value);
}

const liveTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const liveDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

const MYSTIC_HEXAGRAMS = Array.from(
  { length: 64 },
  (_, index) => String.fromCodePoint(0x4dc0 + index),
);

function formatShortDate(key: string): string {
  const date = keyToDate(key);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function displayValue(habit: Habit, value: number): string {
  return habit.type === "duration" ? formatDuration(value) : `${value} ${habit.unit}`.trim();
}

function targetLabel(habit: Habit, date: string): string {
  const target = effectiveRule(habit, date)?.target ?? habit.rules[0]?.target ?? 0;
  return habit.type === "duration"
    ? `目标 ${formatDuration(target)}`
    : habit.type === "count"
      ? `目标 ${target} ${habit.unit}`.trim()
      : "";
}

function numericProgress(habit: Habit, date: string, value: number): number {
  const target = effectiveRule(habit, date)?.target ?? habit.rules[0]?.target ?? 1;
  return Math.min(1, Math.max(0, value / target));
}

export class DaymarkView extends ItemView {
  private readonly backdropSymbols = [
    ...MYSTIC_HEXAGRAMS.map((symbol) => ({ symbol, cls: "daymark-mystic-hexagram" })),
    ...ELDER_FUTHARK_RUNES.map((rune) => ({ symbol: rune.symbol, cls: "daymark-mystic-rune" })),
  ];
  private readonly backdropStyles = this.backdropSymbols.map(() => ({
    x: `${Math.round(Math.random() * 24 - 12)}px`,
    y: `${Math.round(Math.random() * 30 - 15)}px`,
    scale: (0.75 + Math.random() * 0.65).toFixed(2),
    opacity: (0.4 + Math.random() * 0.6).toFixed(2),
    color: ["#9ce8d2", "#a3bfdc", "#c3a6ed", "#d4b77d"][Math.floor(Math.random() * 4)],
  }));
  private selectedDate: string;
  private lastKnownToday: string;
  private activeTab: ViewTab = "today";
  private statisticsRange: StatisticsRange = "30d";
  private liveRegion: HTMLElement | undefined;
  private cumulativeDurations = new Map<string, number>();
  private liveDurationLabels: Array<{
    element: HTMLElement;
    savedSeconds: number;
    startedAt?: number;
  }> = [];
  private liveAverageLabels: Array<{
    element: HTMLElement;
    savedSeconds: number;
    activeDays: number;
    startedAt?: number;
    suffix: string;
  }> = [];
  private statisticsLiveMinute: number | undefined;
  private milestoneLive: {
    savedSeconds: number;
    startedAt?: number;
    completedRewardCount: number;
    completedCycles: number;
    completedHexagramsInCycle: number;
    totalElement: HTMLElement;
    hexagramProgressElement: HTMLElement;
    hexagramProgressFill: HTMLElement;
    hexagramProgressLabel: HTMLElement;
    hexagramRemainingElement: HTMLElement;
    cycleProgressElement: HTMLElement;
    cycleProgressFill: HTMLElement;
    cycleProgressLabel: HTMLElement;
    cycleRemainingElement: HTMLElement;
  } | undefined;
  private liveClockElement: HTMLTimeElement | undefined;
  private liveClockTimeLabel: HTMLElement | undefined;
  private liveClockDateLabel: HTMLElement | undefined;
  private liveUpdateInterval: number | undefined;
  private activityBusy = false;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly controller: DaymarkController,
  ) {
    super(leaf);
    // Keep one composition for this view's lifetime, including timer-driven renders.
    for (let index = this.backdropSymbols.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [this.backdropSymbols[index], this.backdropSymbols[other]] =
        [this.backdropSymbols[other], this.backdropSymbols[index]];
    }
    this.selectedDate = todayKey(new Date(), controller.settings.timezone);
    this.lastKnownToday = this.selectedDate;
  }

  getViewType(): string {
    return VIEW_TYPE_DAYMARK;
  }

  getDisplayText(): string {
    return "日迹";
  }

  getIcon(): string {
    return "calendar-check";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("daymark-view");
    this.contentEl.style.setProperty("--daymark-glow-x", `${8 + Math.round(Math.random() * 70)}%`);
    this.contentEl.style.setProperty("--daymark-glow-y", `${5 + Math.round(Math.random() * 45)}%`);
    this.contentEl.style.setProperty("--daymark-glow-angle", `${135 + Math.round(Math.random() * 40)}deg`);
    this.restartLiveUpdates();
    this.render();
  }

  async onClose(): Promise<void> {
    if (this.liveUpdateInterval !== undefined) {
      window.clearInterval(this.liveUpdateInterval);
      this.liveUpdateInterval = undefined;
    }
  }

  refresh(): void {
    this.render();
  }

  recoverFromSuspend(): void {
    this.restartLiveUpdates();
    const today = todayKey(new Date(), this.controller.settings.timezone);
    const selectedWasToday = this.selectedDate === this.lastKnownToday;
    this.lastKnownToday = today;
    if (selectedWasToday) this.selectedDate = today;
    this.render();
  }

  private restartLiveUpdates(): void {
    if (this.liveUpdateInterval !== undefined) {
      window.clearInterval(this.liveUpdateInterval);
    }
    this.liveUpdateInterval = window.setInterval(() => {
      this.updateLiveClock();
      this.updateRunningTimerLabels();
      this.rollOverToday();
    }, 1_000);
  }

  private rollOverToday(): void {
    const today = todayKey(new Date(), this.controller.settings.timezone);
    if (today === this.lastKnownToday) return;
    const selectedWasToday = this.selectedDate === this.lastKnownToday;
    this.lastKnownToday = today;
    if (selectedWasToday) this.selectedDate = today;
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    const active =
      document.activeElement instanceof HTMLElement && contentEl.contains(document.activeElement)
        ? document.activeElement
        : undefined;
    const focusLabel = active?.getAttribute("aria-label") ?? undefined;
    const focusText = active?.textContent?.trim();
    const focusHabitId = active?.closest<HTMLElement>("[data-habit-id]")?.dataset.habitId;
    this.cumulativeDurations = new Map(
      this.controller.habits
        .filter((habit) => habit.type === "duration")
        .map((habit) => [habit.id, cumulativeDurationSeconds(habit.id, this.controller.events)]),
    );
    this.liveDurationLabels = [];
    this.liveAverageLabels = [];
    this.milestoneLive = undefined;
    contentEl.empty();
    this.renderMysticBackdrop(contentEl);
    this.liveRegion = contentEl.createDiv("daymark-sr-only");
    this.liveRegion.setAttrs({ role: "status", "aria-live": "polite", "aria-atomic": "true" });
    const shell = contentEl.createDiv("daymark-shell");
    this.renderTopbar(shell);
    this.renderTabs(shell);
    this.renderRunningTimer(shell);
    if (this.activeTab === "today") this.renderToday(shell);
    else if (this.activeTab === "gallery") this.renderGallery(shell);
    else this.renderHistory(shell);
    this.updateRunningTimerLabels();
    this.updateLiveClock();
    if (active) {
      window.setTimeout(() => {
        const controls = [...contentEl.querySelectorAll<HTMLElement>("button, input, select, textarea")];
        const exact = focusLabel
          ? controls.find((element) => element.getAttribute("aria-label") === focusLabel)
          : undefined;
        const byText = !exact && focusText
          ? controls.find((element) => element.textContent?.trim() === focusText)
          : undefined;
        const cardFallback = focusHabitId
          ? contentEl.querySelector<HTMLElement>(`[data-habit-id="${focusHabitId}"] button`)
          : undefined;
        (exact ?? byText ?? cardFallback)?.focus();
      }, 0);
    }
  }

  private renderMysticBackdrop(container: HTMLElement): void {
    const backdrop = container.createDiv({
      cls: "daymark-mystic-backdrop",
      attr: { "aria-hidden": "true" },
    });
    for (const [index, item] of this.backdropSymbols.entries()) {
      const glyph = backdrop.createSpan({ cls: item.cls, text: item.symbol });
      const style = this.backdropStyles[index];
      glyph.style.setProperty("--glyph-x", style.x);
      glyph.style.setProperty("--glyph-y", style.y);
      glyph.style.setProperty("--glyph-scale", style.scale);
      glyph.style.opacity = style.opacity;
      glyph.style.color = style.color;
    }
  }

  private renderTopbar(container: HTMLElement): void {
    const topbar = container.createDiv("daymark-topbar");
    const brand = topbar.createDiv("daymark-brand");
    const mark = brand.createSpan({ cls: "daymark-brand-mark", attr: { "aria-hidden": "true" } });
    setIcon(mark, "sprout");
    const brandText = brand.createDiv();
    const titleRow = brandText.createDiv("daymark-brand-title-row");
    titleRow.createEl("h2", { text: "日迹" });
    this.liveClockElement = titleRow.createEl("time", {
      cls: "daymark-live-clock",
      attr: { "aria-label": "当前时间" },
    });
    this.liveClockTimeLabel = this.liveClockElement.createEl("strong");
    const brandMeta = brandText.createDiv("daymark-brand-meta");
    brandMeta.createSpan({ text: "让每一点积累，都有迹可循" });
    this.liveClockDateLabel = brandMeta.createSpan("daymark-live-date");
    const actions = topbar.createDiv("daymark-top-actions");
    if (this.controller.issues.length > 0) {
      const issueButton = actions.createEl("button", {
        cls: "clickable-icon daymark-issue-button",
        attr: { "aria-label": `${this.controller.issues.length} 个数据问题` },
      });
      setIcon(issueButton, "triangle-alert");
      issueButton.createSpan({ text: String(this.controller.issues.length) });
      issueButton.addEventListener("click", () => {
        new IssuesModal(this.app, this.controller.issues).open();
      });
    }
    const addButton = actions.createEl("button", {
      cls: "clickable-icon daymark-new-habit",
      attr: { "aria-label": "新建项目" },
    });
    setIcon(addButton, "plus");
    addButton.createSpan({ text: "新建" });
    addButton.addEventListener("click", () => this.controller.openHabitEditor());
    const settingsButton = actions.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "日迹设置" },
    });
    setIcon(settingsButton, "settings-2");
    settingsButton.addEventListener("click", () => this.controller.openSettings());
  }

  private renderTabs(container: HTMLElement): void {
    const tabs = container.createDiv("daymark-tabs");
    tabs.setAttr("role", "tablist");
    for (const [tab, label, icon] of [
      ["today", "日常打卡", "circle-check-big"],
      ["history", "积累统计", "chart-no-axes-column-increasing"],
      ["gallery", "Blender 展柜", "box"],
    ] as const) {
      const button = tabs.createEl("button", {
        cls: this.activeTab === tab ? "is-active" : "",
        attr: {
          role: "tab",
          "aria-selected": String(this.activeTab === tab),
        },
      });
      const iconEl = button.createSpan();
      setIcon(iconEl, icon);
      button.createSpan({ text: label });
      button.addEventListener("click", () => {
        this.activeTab = tab;
        this.render();
      });
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const order: ViewTab[] = ["today", "history", "gallery"];
        this.activeTab = order[(order.indexOf(this.activeTab) + (event.key === "ArrowRight" ? 1 : 2)) % order.length];
        this.render();
        window.setTimeout(() => {
          this.contentEl
            .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
            ?.focus();
        }, 0);
      });
    }
  }

  private renderGallery(container: HTMLElement): void {
    const gallery = container.createDiv("daymark-gallery");
    gallery.createEl("h2", { text: "Blender 展柜" });
    gallery.createEl("p", { text: `光影与形体 · ${this.controller.galleryItems.length} 件作品` });
    gallery.createEl("p", { cls: "daymark-gallery-help", text: `导入渲染图片，或将图片放入 ${this.controller.settings.dataFolder}/Blender展柜。支持 PNG、JPG、WEBP、GIF、AVIF，每张最多 40 MB。` });
    const input = gallery.createEl("input", { attr: { type: "file", accept: ".png,.jpg,.jpeg,.webp,.gif,.avif", multiple: "", "aria-label": "选择渲染作品" } });
    input.hidden = true;
    const add = gallery.createEl("button", { cls: "mod-cta", text: "＋ 添加渲染作品" });
    add.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return;
      add.disabled = true;
      add.setText("正在导入…");
      try { await this.controller.importGalleryImages(files); }
      catch (error) { new Notice(error instanceof Error ? error.message : String(error)); }
      finally { add.disabled = false; add.setText("＋ 添加渲染作品"); input.value = ""; }
    });
    if (!this.controller.galleryItems.length) {
      gallery.createDiv({ cls: "daymark-gallery-empty", text: "展柜正等待第一束光。添加你的第一张渲染作品吧。" });
    }
    const grid = gallery.createDiv("daymark-gallery-grid");
    for (const item of this.controller.galleryItems) {
      const card = grid.createEl("article", { cls: "daymark-gallery-card" });
      const preview = card.createEl("button", { cls: "daymark-gallery-preview", attr: { "aria-label": `放大作品：${item.title}` } });
      const img = preview.createEl("img", { attr: { src: item.url, alt: item.title, loading: "lazy", decoding: "async" } });
      img.addEventListener("error", () => { img.remove(); preview.setText("图片未就绪，请检查文件是否已同步"); }, { once: true });
      preview.addEventListener("click", () => new GalleryImageModal(this.app, item).open());
      card.createEl("h3", { text: item.title });
      card.createEl("p", { text: item.description || "还没有作品说明" });
      if (item.warning) card.createEl("p", { text: item.warning });
      card.createEl("button", { text: "编辑说明", attr: { "aria-label": `编辑作品：${item.title}` } }).addEventListener("click", () =>
        new GalleryEditModal(this.app, item, (title, description) => this.controller.saveGalleryDetails(item.path, title, description)).open(),
      );
    }
  }

  private renderRunningTimer(container: HTMLElement): void {
    container.createDiv("daymark-rest-banner").createSpan({
      cls: "daymark-rest-countdown",
      text: "每 30 分钟提醒休息 · 独立运行",
      attr: { "data-rest-countdown": "true" },
    });
    const running = this.controller.deviceState.runningTimer;
    if (!running) return;
    const habit = this.controller.habits.find((item) => item.id === running.habitId);
    if (!habit) return;
    const banner = container.createDiv("daymark-running-banner");
    const heading = banner.createDiv("daymark-focus-heading");
    const pulse = heading.createSpan("daymark-running-pulse");
    pulse.setAttr("aria-hidden", "true");
    heading.createSpan({ text: running.pausedAt === undefined ? "正在专注" : "休息中 · 任务已暂停" });
    heading.createSpan({ cls: "daymark-focus-date", text: running.date });
    const body = banner.createDiv("daymark-focus-body");
    const copy = body.createDiv("daymark-focus-copy");
    copy.createEl("strong", { cls: "daymark-focus-name", text: `${habit.emoji} ${habit.name}` });
    const clock = copy.createDiv("daymark-focus-clock");
    clock.createSpan({ text: "本次计时" });
    clock.createEl("strong", { cls: "daymark-timer-label", text: "00:00" });
    banner.dataset.timerStarted = String(running.startedAt);
    banner.dataset.timerPrefix = "";
    const stop = body.createEl("button", {
      cls: "daymark-focus-stop",
      text: "停止并保存",
      attr: { "aria-label": `停止 ${habit.name} 的计时并保存` },
    });
    stop.addEventListener("click", async () => {
      stop.disabled = true;
      try {
        await this.controller.toggleTimer(habit, running.date);
        this.announce(`${habit.name} 的计时已保存`);
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
        stop.disabled = false;
      }
    });
  }

  private renderDateNavigator(container: HTMLElement): void {
    const nav = container.createDiv("daymark-date-nav");
    const previous = nav.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "前一天" },
    });
    setIcon(previous, "chevron-left");
    previous.addEventListener("click", () => {
      this.selectedDate = addDays(this.selectedDate, -1);
      this.render();
    });

    const dateWrap = nav.createDiv("daymark-date-label");
    dateWrap.createEl("strong", { text: formatDateLabel(this.selectedDate) });
    dateWrap.createSpan({ text: this.selectedDate });
    const input = dateWrap.createEl("input", {
      type: "date",
      attr: {
        value: this.selectedDate,
        max: todayKey(new Date(), this.controller.settings.timezone),
        "aria-label": "选择打卡日期",
      },
    });
    input.addEventListener("change", () => {
      if (input.value) {
        this.selectedDate = input.value;
        this.render();
      }
    });

    const next = nav.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "后一天" },
    });
    setIcon(next, "chevron-right");
    const today = todayKey(new Date(), this.controller.settings.timezone);
    next.disabled = this.selectedDate >= today;
    next.addEventListener("click", () => {
      if (this.selectedDate < today) {
        this.selectedDate = addDays(this.selectedDate, 1);
        this.render();
      }
    });
    if (this.selectedDate !== today) {
      const todayButton = nav.createEl("button", {
        cls: "daymark-today-button",
        text: "今天",
      });
      todayButton.addEventListener("click", () => {
        this.selectedDate = today;
        this.render();
      });
    }
  }

  private renderToday(container: HTMLElement): void {
    this.renderDateNavigator(container);
    this.renderActivityList(container);
    const today = todayKey(new Date(), this.controller.settings.timezone);
    if (this.selectedDate === today) {
      this.renderDailyIChing(container, today);
      this.renderDailyRitualCheckIn(container, today);
    }
    const habits = this.controller.habits;
    const events = this.controller.events.filter((event) => event.occurredOn === this.selectedDate);
    const summary = summarizeDay(this.selectedDate, habits, events);
    const summaryEl = container.createDiv("daymark-daily-summary");
    const copy = summaryEl.createDiv("daymark-summary-copy");
    copy.createSpan({ cls: "daymark-eyebrow", text: "记录 · 积累 · 成长" });
    copy.createEl("h1", {
      text: this.selectedDate === todayKey(new Date(), this.controller.settings.timezone)
        ? "给今天一点积累"
        : "每一天，都有迹可循",
    });
    copy.createEl("p", {
      text: summary.hasActivity ? "学习、运动与生活，走过的每一步都算数。" : "从一件小事开始，慢慢成为想成为的自己。",
    });
    const metrics = copy.createDiv("daymark-summary-metrics");
    metrics.createSpan({
      text: summary.scheduled === 0
        ? "这天没有安排"
        : `已达成 ${summary.completed} / ${summary.scheduled} 项`,
    });
    const savedDuration = habits
      .filter((habit) => habit.type === "duration")
      .reduce((total, habit) => total + Number(projectHabitDay(habit, this.selectedDate, events).value), 0);
    metrics.createSpan({ text: `当日已记录 ${formatDuration(savedDuration)}` });
    const ring = summaryEl.createDiv("daymark-progress-ring");
    ring.setAttr("aria-label", `当日完成率 ${Math.round(summary.ratio * 100)}%`);
    ring.style.setProperty("--daymark-progress", `${summary.ratio * 360}deg`);
    const ringInner = ring.createDiv();
    ringInner.createEl("strong", {
      text: summary.scheduled === 0 ? "—" : `${Math.round(summary.ratio * 100)}%`,
    });
    ringInner.createSpan({ text: "完成率" });

    const visible = habits.filter((habit) => {
      const projection = projectHabitDay(habit, this.selectedDate, events);
      const enabledToday = effectiveRule(
        habit,
        todayKey(new Date(), this.controller.settings.timezone),
      )?.enabled;
      return isHabitScheduled(habit, this.selectedDate) || projection.activeEvents.length > 0 || enabledToday;
    });
    if (visible.length === 0) {
      const empty = container.createDiv("daymark-empty");
      const icon = empty.createDiv();
      setIcon(icon, "sprout");
      empty.createEl("h3", { text: "从第一个项目开始" });
      empty.createEl("p", { text: "可以记录锻炼、阅读、喝水，或任何想坚持的事情。" });
      const button = empty.createEl("button", { cls: "mod-cta", text: "新建项目" });
      button.addEventListener("click", () => this.controller.openHabitEditor());
      return;
    }

    const byCategory = new Map<string, Habit[]>();
    for (const habit of visible) {
      const category = habit.category || "日常";
      const group = byCategory.get(category) ?? [];
      group.push(habit);
      byCategory.set(category, group);
    }
    for (const [category, categoryHabits] of byCategory) {
      const section = container.createEl("section", { cls: "daymark-category" });
      const heading = section.createDiv("daymark-category-heading");
      heading.createEl("h3", { text: category });
      heading.createSpan({ text: `${categoryHabits.length} 个项目` });
      const list = section.createDiv("daymark-habit-list");
      for (const habit of categoryHabits) {
        this.renderHabitCard(list, habit, projectHabitDay(habit, this.selectedDate, events));
      }
    }
  }

  private renderDailyIChing(container: HTMLElement, today: string): void {
    const line = getDailyIChingLine(today, this.controller.dailyReflectionSeed);
    const section = container.createEl("section", {
      cls: "daymark-daily-iching",
      attr: {
        "aria-label": "今日一爻",
        "data-line-id": line.id,
      },
    });
    section.createSpan({
      cls: "daymark-iching-symbol",
      text: line.hexagramSymbol,
      attr: { "aria-hidden": "true" },
    });
    const content = section.createDiv("daymark-iching-content");
    const heading = content.createDiv("daymark-iching-heading");
    const headingCopy = heading.createDiv();
    headingCopy.createSpan({ cls: "daymark-eyebrow", text: `今日一爻 · ${today}` });
    headingCopy.createEl("h2", { text: `${line.hexagramName} · ${line.positionName}` });
    heading.createSpan({
      cls: "daymark-iching-index",
      text: `第 ${line.hexagramNumber} 卦`,
    });
    content.createEl("blockquote", {
      cls: "daymark-iching-original",
      text: line.original,
    });
    const explanation = content.createDiv("daymark-iching-explanation");
    explanation.createSpan({ text: "今日静思" });
    explanation.createEl("p", { text: line.explanation });
    content.createEl("small", {
      cls: "daymark-iching-disclaimer",
      text: `${ICHING_REFLECTION_DISCLAIMER} 同一天、同一份日迹数据内容固定。`,
    });
  }

  private renderDailyRitualCheckIn(container: HTMLElement, today: string): void {
    const passage = getDailyRitualPassage(today, this.controller.dailyReflectionSeed);
    const checkedIn = this.controller.dailyRitualCheckIns.some(
      (checkIn) => checkIn.occurredOn === today,
    );
    const status = checkedIn ? "今日已签到" : "今日未签到";
    const section = container.createEl("section", {
      cls: `daymark-daily-check-in${checkedIn ? " is-complete" : ""}`,
      attr: {
        "aria-label": `今日经典签到，${status}`,
        "data-check-in-state": checkedIn ? "signed" : "unsigned",
      },
    });
    const icon = section.createDiv("daymark-check-in-icon");
    icon.setAttr("aria-hidden", "true");
    setIcon(icon, checkedIn ? "badge-check" : "feather");

    const copy = section.createDiv("daymark-check-in-copy");
    const heading = copy.createDiv("daymark-check-in-heading");
    heading.createEl("h2", { text: status });
    heading.createSpan({ text: passage.source });
    copy.createEl("p", {
      text: checkedIn
        ? "签到记录已保存在 Vault；今日的普通打卡与里程碑保持独立。"
        : "可先朗读或抄写今日短章，再亲手完成签到。抄写内容不会保存。",
    });

    const action = section.createEl("button", {
      cls: `daymark-check-in-action${checkedIn ? " is-complete" : " mod-cta"}`,
      attr: { "aria-label": checkedIn ? "今日已签到" : "打开今日签到" },
    });
    const actionIcon = action.createSpan();
    actionIcon.setAttr("aria-hidden", "true");
    setIcon(actionIcon, checkedIn ? "check" : "book-open-text");
    action.createSpan({ text: checkedIn ? "已签到" : "打开签到" });
    action.disabled = checkedIn;
    if (!checkedIn) {
      action.addEventListener("click", () => this.controller.openDailyRitualCheckIn());
    }
  }

  private renderHabitCard(container: HTMLElement, habit: Habit, projection: HabitProjection): void {
    const card = container.createEl("article", {
      cls: `daymark-habit-card${projection.completed ? " is-complete" : ""}`,
      attr: {
        "aria-label": `${habit.name}，${projection.completed ? "这天已达成" : "这天未达成"}`,
        "data-habit-id": habit.id,
      },
    });
    card.style.setProperty("--daymark-habit-color", habit.color);
    const header = card.createDiv("daymark-habit-header");
    const grip = header.createEl("button", { cls: "daymark-card-grip", attr: { draggable: "true", "aria-label": `拖动排序 ${habit.name}`, title: "拖到同分类项目上排序，也可按上下方向键" } });
    setIcon(grip, "grip-vertical");
    card.draggable = true;
    card.addEventListener("dragstart", (event) => {
      const source = (event.target as HTMLElement).closest("button,input,textarea,select,a");
      if (source && source !== grip) { if (!source.classList.contains("daymark-activity-handle")) event.preventDefault(); return; }
      event.stopPropagation();
      event.dataTransfer?.setData("application/x-daymark-reorder", habit.id);
      if (habit.type === "duration" || habit.type === "count") writeActivityDrag(event.dataTransfer, habit.id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copyMove";
      card.addClass("is-sorting");
    });
    card.addEventListener("dragend", () => {
      card.removeClass("is-sorting");
      this.contentEl.querySelectorAll(".is-drop-before,.is-drop-after").forEach((item) => item.classList.remove("is-drop-before", "is-drop-after"));
    });
    const moveOne = (down: boolean): void => {
      const peers = this.controller.habits.filter((item) => habitCategory(item) === habitCategory(habit));
      const target = peers[peers.findIndex((item) => item.id === habit.id) + (down ? 1 : -1)];
      if (target) void this.controller.reorderHabit(habit.id, target.id, down).catch((error) => new Notice(String(error)));
    };
    grip.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); moveOne(event.key === "ArrowDown"); }
    });
    card.addEventListener("dragover", (event) => {
      if (!event.dataTransfer?.types.includes("application/x-daymark-reorder")) return;
      event.preventDefault(); event.dataTransfer.dropEffect = "move";
      const after = event.clientY > card.getBoundingClientRect().top + card.clientHeight / 2;
      card.toggleClass("is-drop-after", after); card.toggleClass("is-drop-before", !after);
    });
    card.addEventListener("dragleave", () => card.removeClass("is-drop-before", "is-drop-after"));
    card.addEventListener("drop", (event) => {
      const id = event.dataTransfer?.getData("application/x-daymark-reorder");
      if (!id) return;
      event.preventDefault(); event.stopPropagation();
      const after = event.clientY > card.getBoundingClientRect().top + card.clientHeight / 2;
      card.removeClass("is-drop-before", "is-drop-after");
      void this.controller.reorderHabit(id, habit.id, after).catch((error) => new Notice(String(error)));
    });
    header.createDiv({ cls: "daymark-habit-emoji", text: habit.emoji });
    const title = header.createDiv("daymark-habit-title");
    title.createEl("strong", { text: habit.name });
    const detail = targetLabel(habit, this.selectedDate);
    const kind = detail || (habit.type === "text" ? "文字记录" : "完成型");
    title.createSpan({
      text: `${isHabitScheduled(habit, this.selectedDate) ? "" : "非计划 · "}${kind}`,
    });
    if (projection.completed) {
      const done = header.createSpan({ cls: "daymark-done-badge", text: "已达成" });
      done.setAttr("aria-label", "这天目标已达成");
    }
    const edit = header.createEl("button", {
      cls: "clickable-icon daymark-card-edit",
      attr: { "aria-label": `编辑 ${habit.name}` },
    });
    setIcon(edit, "ellipsis");
    edit.addEventListener("click", () => this.controller.openHabitEditor(habit));

    if (habit.type === "checkbox") this.renderCheckboxControl(card, habit, projection);
    else if (habit.type === "text") this.renderTextControl(card, habit, projection);
    else this.renderNumberControl(card, habit, projection);
    const tools = card.createDiv("daymark-card-tools");
    for (const down of [false, true]) {
      const arrow = tools.createEl("button", { attr: { "aria-label": `${down ? "下移" : "上移"} ${habit.name}`, title: "只调整分类内顺序" } });
      setIcon(arrow, down ? "arrow-down" : "arrow-up");
      arrow.addEventListener("click", () => moveOne(down));
    }
    if (habit.type === "duration" || habit.type === "count") {
      const handle = tools.createEl("button", { cls: "daymark-activity-handle", text: "＋ 活动", attr: { draggable: "true", "aria-label": `添加 ${habit.name} 到活动列表`, title: "添加到今日活动，也可拖入悬浮窗" } });
      handle.addEventListener("dragstart", (event) => {
        event.stopPropagation();
        writeActivityDrag(event.dataTransfer, habit.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
      });
      handle.addEventListener("click", () => { void this.changeActivity(habit.id, true); });
    }
  }

  private async changeActivity(habitId: string, included: boolean): Promise<void> {
    if (this.activityBusy) return;
    const date = this.selectedDate;
    if (included && selectedActivityIds(this.controller.activitySelections, date).includes(habitId)) {
      new Notice("这个项目已经在活动列表中"); return;
    }
    this.activityBusy = true;
    try {
      await this.controller.setActivitySelected(date, habitId, included);
      new Notice(included ? "已添加到活动列表" : "已移除列表关联，原项目和记录保持不变");
    }
    catch (error) { new Notice(error instanceof Error ? error.message : String(error)); }
    finally { this.activityBusy = false; }
  }

  private renderActivityList(container: HTMLElement): void {
    const count = selectedActivityIds(this.controller.activitySelections, this.selectedDate).length;
    const launch = container.createEl("button", { cls: "daymark-activity-launch", attr: { "aria-label": "打开活动悬浮窗" } });
    setIcon(launch.createSpan("daymark-activity-launch-icon"), "panels-top-left");
    const copy = launch.createDiv();
    copy.createEl("strong", { text: "今日活动" });
    copy.createSpan({ text: count ? `${count} 项安排 · 独立悬浮面板` : "给今天留一点方向" });
    setIcon(launch.createSpan(), "arrow-up-right");
    launch.addEventListener("click", () => { void this.controller.openActivityView(this.selectedDate).catch((error) => new Notice(String(error))); });
    launch.addEventListener("dragover", (event) => {
      if (event.dataTransfer?.types.includes("application/x-daymark-habit")) event.preventDefault();
    });
    launch.addEventListener("drop", (event) => {
      event.preventDefault();
      const id = event.dataTransfer?.getData("application/x-daymark-habit");
      if (id) void this.changeActivity(id, true);
    });
  }

  private renderCheckboxControl(
    card: HTMLElement,
    habit: Habit,
    projection: HabitProjection,
  ): void {
    const button = card.createEl("button", {
      cls: "daymark-check-control",
      attr: {
        "aria-label": projection.completed ? `取消完成 ${habit.name}` : `完成 ${habit.name}`,
        "aria-pressed": String(projection.completed),
      },
    });
    const icon = button.createSpan("daymark-check-icon");
    setIcon(icon, projection.completed ? "check" : "circle");
    button.createSpan({ text: projection.completed ? "这天已完成" : "标记为完成" });
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await this.controller.recordCheckbox(habit, this.selectedDate, !projection.completed);
        this.announce(`${habit.name}${projection.completed ? "已取消完成" : "已完成"}`);
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
        button.disabled = false;
      }
    });
  }

  private renderNumberControl(
    card: HTMLElement,
    habit: Habit,
    projection: HabitProjection,
  ): void {
    const value = typeof projection.value === "number" ? projection.value : 0;
    if (habit.type === "duration") {
      card.addClass("daymark-duration-card");
      const total = card.createDiv("daymark-duration-total");
      const label = total.createDiv("daymark-duration-caption");
      const icon = label.createSpan();
      setIcon(icon, "hourglass");
      label.createSpan({ text: "累计投入 · 时:分:秒" });
      this.renderCumulativeDuration(total, habit);
      total.createSpan({
        cls: "daymark-duration-hint",
        text: this.controller.deviceState.runningTimer?.habitId === habit.id
          ? "包含本次正在进行的计时"
          : "每一次投入，都留在这里",
      });
    }
    const meter = card.createDiv("daymark-number-meter");
    const valueEl = meter.createDiv();
    const saved = valueEl.createDiv("daymark-saved-value");
    if (habit.type === "duration") saved.createSpan({ text: "当日已保存" });
    saved.createEl("strong", { text: displayValue(habit, value) });
    valueEl.createSpan({ text: targetLabel(habit, this.selectedDate) });
    const progress = meter.createDiv("daymark-linear-progress");
    const bar = progress.createDiv();
    bar.style.width = `${numericProgress(habit, this.selectedDate, value) * 100}%`;

    const controls = card.createDiv("daymark-number-controls");
    const today = todayKey(new Date(), this.controller.settings.timezone);
    if (habit.type === "duration" && this.selectedDate === today) {
      const running =
        this.controller.deviceState.runningTimer?.habitId === habit.id &&
        this.controller.deviceState.runningTimer.date === this.selectedDate;
      const timer = controls.createEl("button", {
        cls: running ? "daymark-timer is-running" : "daymark-timer",
        attr: {
          "aria-label": `${running ? "停止" : "开始"} ${habit.name} 的计时`,
        },
      });
      const timerIcon = timer.createSpan();
      setIcon(timerIcon, running ? "square" : "play");
      timer.createSpan({
        cls: "daymark-timer-label",
        text: running ? "停止 00:00" : "开始计时",
      });
      if (running) {
        timer.dataset.timerStarted = String(this.controller.deviceState.runningTimer?.startedAt ?? 0);
      }
      timer.addEventListener("click", async () => {
        timer.disabled = true;
        try {
          await this.controller.toggleTimer(habit, this.selectedDate);
          this.announce(`${habit.name}${running ? "计时已保存" : "开始计时"}`);
        } catch (error) {
          new Notice(error instanceof Error ? error.message : String(error));
          timer.disabled = false;
        }
      });
    }
    const add = controls.createEl("button", {
      cls: "mod-cta daymark-add-step",
      text:
        habit.type === "duration"
          ? `+${formatDuration(habit.step)}`
          : `+${habit.step} ${habit.unit}`.trim(),
      attr: { "aria-label": `为 ${habit.name} 快捷增加` },
    });
    add.addEventListener("click", async () => {
      add.disabled = true;
      try {
        await this.controller.recordNumber(habit, this.selectedDate, habit.step);
        this.announce(`${habit.name}已增加 ${displayValue(habit, habit.step)}`);
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
        add.disabled = false;
      }
    });
    const custom = controls.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": `自定义记录 ${habit.name}` },
    });
    setIcon(custom, "pencil-line");
    custom.addEventListener("click", () => {
      new NumericRecordModal(this.app, habit, (amount, note) =>
        this.controller.recordNumber(habit, this.selectedDate, amount, note).then(() => {
          this.announce(`${habit.name}的记录已添加`);
        }),
      ).open();
    });
    const retractable = latestRetractableEvent(projection);
    if (retractable) this.renderUndoButton(controls, habit, retractable, "撤销最近一次增加");
    if (habit.type === "duration") {
      card.createDiv({ cls: "daymark-timer-hint", text: "每 30 分钟提醒休息" });
    }
    const latestNote = [...projection.activeEvents].reverse().find((event) => event.note);
    if (latestNote?.note) card.createDiv({ cls: "daymark-entry-note", text: latestNote.note });
  }

  private renderTextControl(card: HTMLElement, habit: Habit, projection: HabitProjection): void {
    const add = card.createEl("button", {
      cls: "daymark-text-add",
      attr: { "aria-label": `为 ${habit.name} 写一条记录` },
    });
    const icon = add.createSpan();
    setIcon(icon, "square-pen");
    add.createSpan({ text: "写一条记录" });
    add.addEventListener("click", () => {
      new TextRecordModal(this.app, `${habit.name} · ${this.selectedDate}`, (value) =>
        this.controller.recordText(habit, this.selectedDate, value).then(() => {
          this.announce(`${habit.name}的文字记录已保存`);
        }),
      ).open();
    });
    if (projection.notes.length === 0) return;
    const notes = card.createDiv("daymark-note-list");
    for (const event of [...projection.notes].reverse()) {
      const row = notes.createDiv("daymark-note-row");
      row.createDiv({ text: String(event.value) });
      this.renderUndoButton(row, habit, event, "撤销这条文字记录");
    }
  }

  private renderUndoButton(
    container: HTMLElement,
    habit: Habit,
    event: TrackerEvent,
    label: string,
  ): void {
    const undo = container.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": `${label}：${habit.name}` },
    });
    setIcon(undo, "undo-2");
    undo.addEventListener("click", async () => {
      undo.disabled = true;
      try {
        await this.controller.retractEvent(habit, event);
        this.announce(`${habit.name}的记录已撤销`);
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
        undo.disabled = false;
      }
    });
  }

  private renderHistory(container: HTMLElement): void {
    const today = todayKey(new Date(), this.controller.settings.timezone);
    const range = resolveStatisticsRange(this.statisticsRange, today, this.controller.events);
    const rangeStatistics = buildRangeStatistics(
      this.controller.habits,
      this.controller.events,
      range.start,
      range.end,
    );
    const running = this.controller.deviceState.runningTimer;
    const runningHabit = running
      ? this.controller.habits.find((habit) => habit.id === running.habitId)
      : undefined;
    const runningInRange = Boolean(
      running &&
        runningHabit?.type === "duration" &&
        running.date >= range.start &&
        running.date <= range.end,
    );
    const runningSeconds = runningInRange && running ? elapsedTimerSeconds(running) : 0;
    this.statisticsLiveMinute = runningInRange ? Math.floor(runningSeconds / 60) : undefined;
    const runningDay = running
      ? rangeStatistics.daily.find((day) => day.date === running.date)
      : undefined;
    const liveActiveDays =
      rangeStatistics.activeDays + (runningInRange && (runningDay?.records ?? 0) === 0 ? 1 : 0);
    const dailyTrend = rangeStatistics.daily.map((day) => ({ ...day }));
    if (runningInRange && running) {
      const runningIndex = dailyTrend.findIndex((day) => day.date === running.date);
      if (runningIndex >= 0) {
        dailyTrend[runningIndex].durationSeconds += runningSeconds;
      } else {
        dailyTrend.push({
          date: running.date,
          durationSeconds: runningSeconds,
          completions: 0,
          records: 0,
        });
        dailyTrend.sort((left, right) => left.date.localeCompare(right.date));
      }
    }

    const intro = container.createEl("section", {
      cls: "daymark-statistics-intro",
      attr: { "aria-label": "积累统计" },
    });
    const introCopy = intro.createDiv("daymark-statistics-copy");
    introCopy.createSpan({ cls: "daymark-eyebrow", text: "时间会留下答案" });
    introCopy.createEl("h1", { text: "看见每一次积累" });
    introCopy.createEl("p", {
      text: `${range.start} 至 ${range.end} · 基于有效日迹记录，正在计时会实时加入总投入`,
    });
    this.renderStatisticsRangeSelector(intro);

    const overview = container.createEl("section", {
      cls: "daymark-overview",
      attr: { "aria-label": "累计概览" },
    });
    const totalDuration = overview.createEl("article", {
      cls: "daymark-overview-card daymark-overview-duration",
    });
    const durationHeading = totalDuration.createDiv("daymark-overview-label");
    const durationIcon = durationHeading.createSpan();
    setIcon(durationIcon, "timer");
    durationHeading.createSpan({ text: "总投入" });
    this.renderLiveDurationValue(
      totalDuration,
      rangeStatistics.durationSeconds,
      runningInRange ? running?.startedAt : undefined,
      "daymark-overview-value",
      `${range.start} 至 ${range.end} 的累计投入（时:分:秒）`,
    );
    const durationNote = totalDuration.createSpan("daymark-overview-note");
    if (liveActiveDays > 0 && rangeStatistics.durationSeconds + runningSeconds > 0) {
      const suffix = runningInRange ? " · 含正在计时" : "";
      durationNote.setText(
        `活跃日均 ${formatClock(
          (rangeStatistics.durationSeconds + runningSeconds) / liveActiveDays,
          true,
        )}${suffix}`,
      );
      this.liveAverageLabels.push({
        element: durationNote,
        savedSeconds: rangeStatistics.durationSeconds,
        activeDays: liveActiveDays,
        startedAt: runningInRange ? running?.startedAt : undefined,
        suffix,
      });
    } else {
      durationNote.setText("尚无时长记录");
    }

    this.renderOverviewMetric(
      overview,
      "calendar-days",
      "活跃天数",
      `${liveActiveDays} 天`,
      runningInRange ? "有有效记录或正在计时的日期" : "至少留下过一条有效记录的日期",
    );
    this.renderOverviewMetric(
      overview,
      "circle-check-big",
      "达成次数",
      `${rangeStatistics.completions} 次`,
      "达到当天目标的项目次数",
    );
    this.renderOverviewMetric(
      overview,
      "notebook-pen",
      "有效记录",
      `${rangeStatistics.records} 条`,
      "撤销后的记录不会计入",
    );

    this.renderStatisticsTrend(
      container,
      dailyTrend,
      rangeStatistics.durationSeconds + runningSeconds,
    );
    this.renderHabitStatistics(container, rangeStatistics.habits, range, runningInRange ? running : undefined);
    this.renderMilestoneJourney(container);

    const continuity = container.createEl("section", {
      cls: "daymark-continuity",
      attr: { "aria-label": "全部时间的连续记录" },
    });
    const continuityHeading = continuity.createDiv("daymark-section-heading");
    const continuityCopy = continuityHeading.createDiv();
    continuityCopy.createSpan({ cls: "daymark-eyebrow", text: "全部时间" });
    continuityCopy.createEl("h2", { text: "连续性" });
    const continuityStats = continuity.createDiv("daymark-stats-grid");
    this.renderStat(
      continuityStats,
      "flame",
      "当前连续有记录",
      `${currentActivityStreak(
        this.controller.habits,
        this.controller.events,
        this.controller.settings.timezone,
      )} 天`,
    );
    this.renderStat(
      continuityStats,
      "trophy",
      "最长连续有记录",
      `${bestActivityStreak(this.controller.habits, this.controller.events)} 天`,
    );

    this.renderMonthReview(container, today);
  }

  private renderStatisticsRangeSelector(container: HTMLElement): void {
    const selector = container.createDiv("daymark-range-selector");
    selector.setAttrs({ role: "group", "aria-label": "统计时间范围" });
    for (const [range, label] of [
      ["7d", "近7天"],
      ["30d", "近30天"],
      ["90d", "近90天"],
      ["all", "全部"],
    ] as const) {
      const button = selector.createEl("button", {
        cls: this.statisticsRange === range ? "is-active" : "",
        text: label,
        attr: {
          type: "button",
          "aria-label": `查看${label}统计`,
          "aria-pressed": String(this.statisticsRange === range),
          "data-statistics-range": range,
        },
      });
      button.addEventListener("click", () => {
        if (this.statisticsRange === range) return;
        this.statisticsRange = range;
        this.render();
        this.announce(`已切换为${label}统计`);
      });
    }
  }

  private renderOverviewMetric(
    container: HTMLElement,
    iconName: string,
    label: string,
    value: string,
    note: string,
  ): void {
    const card = container.createEl("article", { cls: "daymark-overview-card" });
    const heading = card.createDiv("daymark-overview-label");
    const icon = heading.createSpan();
    setIcon(icon, iconName);
    heading.createSpan({ text: label });
    card.createEl("strong", { cls: "daymark-overview-value", text: value });
    card.createSpan({ cls: "daymark-overview-note", text: note });
  }

  private renderStatisticsTrend(
    container: HTMLElement,
    days: DailyStatistics[],
    durationSeconds: number,
  ): void {
    const section = container.createEl("section", {
      cls: "daymark-trend-section",
      attr: { "aria-label": "每日投入时长趋势" },
    });
    const heading = section.createDiv("daymark-section-heading");
    const copy = heading.createDiv();
    copy.createSpan({ cls: "daymark-eyebrow", text: "已保存记录" });
    copy.createEl("h2", { text: "每日投入时长" });
    copy.createEl("p", { text: "折线按天展示投入时间的变化；正在计时按实际经过时间加入当天。" });

    if (durationSeconds <= 0 || days.length === 0) {
      const empty = section.createDiv("daymark-trend-empty");
      const icon = empty.createSpan();
      setIcon(icon, "trending-up");
      const emptyCopy = empty.createDiv();
      emptyCopy.createEl("strong", { text: "这段时间还没有时长数据" });
      emptyCopy.createSpan({ text: "记录学习、锻炼等计时后，这里会显示每日变化折线。" });
      return;
    }

    const chart = section.createDiv("daymark-trend-chart");
    chart.createEl("p", {
      cls: "daymark-sr-only",
      text: `每日投入时长折线：累计 ${formatClock(durationSeconds, true)}，共 ${days.length} 天。`,
    });
    const maxDuration = Math.max(1, ...days.map((day) => day.durationSeconds));
    const peak = days.reduce(
      (highest, day) => day.durationSeconds > highest.durationSeconds ? day : highest,
      days[0],
    );
    const summary = chart.createDiv("daymark-line-chart-summary");
    const maximum = summary.createDiv();
    maximum.createSpan({ text: "单日最高" });
    maximum.createEl("strong", { text: formatClock(maxDuration, true) });
    summary.createSpan({
      text: `${formatShortDate(peak.date)} · 共 ${days.length} 天 · 累计 ${formatClock(durationSeconds, true)}`,
    });

    const plot = chart.createDiv("daymark-line-chart-plot");
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.classList.add("daymark-line-chart-svg");
    svg.setAttribute("viewBox", "0 0 1000 220");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      `${days[0].date} 至 ${days[days.length - 1].date} 每日投入时长折线，单日最高 ${formatClock(maxDuration, true)}`,
    );
    svg.setAttribute("data-daily-points", String(days.length));
    for (const y of [16, 110, 204]) {
      const gridLine = document.createElementNS(namespace, "line");
      gridLine.classList.add("daymark-line-chart-grid");
      gridLine.setAttribute("x1", "0");
      gridLine.setAttribute("x2", "1000");
      gridLine.setAttribute("y1", String(y));
      gridLine.setAttribute("y2", String(y));
      svg.append(gridLine);
    }
    const coordinates = days.map((day, index) => {
      const x = days.length === 1 ? 0 : (index / (days.length - 1)) * 1000;
      const y = 204 - (day.durationSeconds / maxDuration) * 188;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    if (days.length === 1) {
      coordinates.push(`1000.00,${coordinates[0].split(",")[1]}`);
    }
    const line = document.createElementNS(namespace, "polyline");
    line.classList.add("daymark-line-chart-line");
    line.setAttribute("points", coordinates.join(" "));
    line.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(line);
    plot.append(svg);

    const labels = chart.createDiv("daymark-line-chart-labels");
    labels.createSpan({ text: formatShortDate(days[0].date) });
    labels.createSpan({ text: `峰值 ${formatShortDate(peak.date)}` });
    labels.createSpan({ text: formatShortDate(days[days.length - 1].date) });
  }

  private renderHabitStatistics(
    container: HTMLElement,
    statistics: HabitStatistics[],
    range: { start: string; end: string },
    running: { habitId: string; date: string; startedAt: number } | undefined,
  ): void {
    const section = container.createEl("section", {
      cls: "daymark-habit-statistics",
      attr: { "aria-label": "项目累计明细" },
    });
    const heading = section.createDiv("daymark-section-heading");
    const copy = heading.createDiv();
    copy.createSpan({ cls: "daymark-eyebrow", text: `${range.start} 至 ${range.end}` });
    copy.createEl("h2", { text: "项目累计" });
    copy.createEl("p", { text: "按记录类型和单位分别排列，数值只与同类项目比较。" });

    if (this.controller.habits.length === 0) {
      section.createDiv({ cls: "daymark-statistics-empty", text: "新建项目后，累计明细会显示在这里。" });
      return;
    }

    const byHabit = new Map(statistics.map((item) => [item.habitId, item]));
    const entries = this.controller.habits.map((habit) => ({
      habit,
      statistics: byHabit.get(habit.id) ?? {
        habitId: habit.id,
        total: 0,
        activeDays: 0,
        completedDays: 0,
        records: 0,
      },
    }));
    const groups: Array<{
      key: string;
      label: string;
      description: string;
      entries: typeof entries;
      value: (item: (typeof entries)[number]) => string;
      score: (item: (typeof entries)[number]) => number;
    }> = [];

    const durationEntries = entries.filter(({ habit }) => habit.type === "duration");
    if (durationEntries.length > 0) {
      groups.push({
        key: "duration",
        label: "时长投入",
        description: "按累计投入时长排列",
        entries: durationEntries,
        value: ({ statistics: item }) => formatClock(item.total, true),
        score: ({ statistics: item }) =>
          item.total + (running && running.habitId === item.habitId ? elapsedTimerSeconds(running) : 0),
      });
    }

    const countUnits = new Map<string, typeof entries>();
    for (const entry of entries.filter(({ habit }) => habit.type === "count")) {
      const unit = entry.habit.unit.trim() || "次";
      const group = countUnits.get(unit) ?? [];
      group.push(entry);
      countUnits.set(unit, group);
    }
    for (const [unit, countEntries] of countUnits) {
      groups.push({
        key: `count-${unit}`,
        label: `数量 · ${unit}`,
        description: `按累计${unit}数排列`,
        entries: countEntries,
        value: ({ statistics: item }) => `${formatNumber(item.total)} ${unit}`,
        score: ({ statistics: item }) => item.total,
      });
    }

    const checkboxEntries = entries.filter(({ habit }) => habit.type === "checkbox");
    if (checkboxEntries.length > 0) {
      groups.push({
        key: "checkbox",
        label: "完成型项目",
        description: "按完成天数排列",
        entries: checkboxEntries,
        value: ({ statistics: item }) => `${item.completedDays} 天`,
        score: ({ statistics: item }) => item.completedDays,
      });
    }

    const textEntries = entries.filter(({ habit }) => habit.type === "text");
    if (textEntries.length > 0) {
      groups.push({
        key: "text",
        label: "文字记录",
        description: "按有效记录条数排列",
        entries: textEntries,
        value: ({ statistics: item }) => `${item.records} 条`,
        score: ({ statistics: item }) => item.records,
      });
    }

    for (const group of groups) {
      const groupEl = section.createEl("section", {
        cls: "daymark-stat-group",
        attr: { "aria-label": `${group.label}，${group.description}` },
      });
      const groupHeading = groupEl.createDiv("daymark-stat-group-heading");
      const title = groupHeading.createDiv();
      title.createEl("h3", { text: group.label });
      title.createSpan({ text: group.description });
      groupHeading.createSpan({ text: `${group.entries.length} 项` });
      const list = groupEl.createEl("ol", {
        cls: "daymark-stat-list",
        attr: { role: "list" },
      });
      const sorted = [...group.entries].sort(
        (left, right) => group.score(right) - group.score(left) || left.habit.order - right.habit.order,
      );
      sorted.forEach((entry, index) => {
        const row = list.createEl("li", {
          cls: "daymark-stat-row",
          attr: { "data-habit-id": entry.habit.id },
        });
        row.style.setProperty("--daymark-habit-color", entry.habit.color);
        row.createSpan({ cls: "daymark-stat-rank", text: String(index + 1), attr: { "aria-hidden": "true" } });
        row.createSpan({ cls: "daymark-stat-emoji", text: entry.habit.emoji, attr: { "aria-hidden": "true" } });
        const rowCopy = row.createDiv("daymark-stat-row-copy");
        rowCopy.createEl("strong", { text: entry.habit.name });
        const isRunningDuration = entry.habit.type === "duration" && running?.habitId === entry.habit.id;
        const runningAddsActiveDay = Boolean(
          isRunningDuration &&
            running &&
            projectHabitDay(entry.habit, running.date, this.controller.events).activeEvents.length === 0,
        );
        const activeDays = entry.statistics.activeDays + (runningAddsActiveDay ? 1 : 0);
        const detailParts = [`活跃 ${activeDays} 天`];
        if (entry.habit.type !== "checkbox" && entry.statistics.completedDays > 0) {
          detailParts.push(`达成 ${entry.statistics.completedDays} 天`);
        }
        if (entry.habit.type !== "text" && entry.statistics.records > 0) {
          detailParts.push(`${entry.statistics.records} 条有效记录`);
        }
        if (isRunningDuration) detailParts.push("正在计时");
        rowCopy.createSpan({ text: detailParts.join(" · ") });
        if (entry.habit.type === "duration") {
          this.renderLiveDurationValue(
            row,
            entry.statistics.total,
            running?.habitId === entry.habit.id ? running.startedAt : undefined,
            "daymark-stat-row-value",
            `${entry.habit.name}在所选范围内的累计投入（时:分:秒）`,
          );
        } else {
          row.createEl("strong", { cls: "daymark-stat-row-value", text: group.value(entry) });
        }
      });
    }
  }

  private renderMilestoneJourney(container: HTMLElement): void {
    const now = Date.now();
    const saved = buildMilestoneProgress(
      this.controller.habits,
      this.controller.events,
      undefined,
      now,
    );
    const running = this.controller.deviceState.runningTimer;
    const runningHabit = running
      ? this.controller.habits.find(
          (habit) => habit.id === running.habitId && habit.type === "duration",
        )
      : undefined;
    const startedAt = runningHabit ? running?.startedAt : undefined;
    const elapsed = running && startedAt ? elapsedTimerSeconds(running, now) : 0;
    const progress = evaluateMilestoneProgress(saved.totalSeconds + elapsed);
    const stepSeconds = HEXAGRAM_STEP_HOURS * 60 * 60;
    const hexagramPercent = Math.floor(progress.hexagramProgress * 100);
    const cyclePercent = Math.floor(progress.cycleProgress * 100);
    const hexagramElapsedSeconds = Math.max(
      0,
      Math.min(stepSeconds, stepSeconds - progress.remainingHexagramSeconds),
    );
    const completedStageIds = new Set(progress.completedStages.map((stage) => stage.id));
    const stageByReward = new Map(
      MILESTONE_STAGES.map((stage) => [`${stage.systemId}:${stage.reward.id}`, stage]),
    );

    const section = container.createEl("section", {
      cls: "daymark-milestone-journey",
      attr: { "aria-label": "全部时间里程碑" },
    });
    const heading = section.createDiv("daymark-section-heading");
    const headingCopy = heading.createDiv();
    headingCopy.createSpan({ cls: "daymark-eyebrow", text: "全部时间 · 不受上方范围影响" });
    headingCopy.createEl("h2", { text: "修行里程碑" });
    headingCopy.createEl("p", {
      text: `汇总所有时长型项目；每累计 ${HEXAGRAM_STEP_HOURS} 小时依次完成一卦，走完六十四卦解锁一个符号。`,
    });

    const hero = section.createDiv("daymark-milestone-hero");
    const current = hero.createDiv("daymark-milestone-current");
    const currentSymbols = current.createDiv({
      cls: "daymark-milestone-symbols",
      attr: { "aria-hidden": "true" },
    });
    currentSymbols.createSpan({
      cls: "daymark-milestone-hexagram-current",
      text: progress.currentHexagram.symbol,
    });
    const currentCopy = current.createDiv();
    currentCopy.createSpan({
      cls: "daymark-milestone-kicker",
      text: `第 ${progress.currentCycle} 轮 · 当前第 ${progress.currentHexagram.number} / ${MILESTONE_HEXAGRAMS.length} 卦`,
    });
    currentCopy.createEl("h3", {
      text: `${progress.currentHexagram.symbol} ${progress.currentHexagram.name}`,
    });
    currentCopy.createEl("p", {
      text: `本轮已完成 ${progress.completedHexagramsInCycle} 卦；按文王卦序继续行进。`,
    });

    const summary = hero.createDiv("daymark-milestone-summary");
    const total = summary.createDiv("daymark-milestone-total");
    total.createSpan({ text: "全部时长项目累计" });
    const totalElement = total.createEl("strong", {
      text: formatClock(progress.totalSeconds, true),
    });
    total.createSpan({
      text: `已完成 ${progress.completedCycles} 轮 · 解锁 ${progress.completedStages.length} / ${MILESTONE_STAGES.length}`,
    });

    const nextReward = summary.createDiv("daymark-milestone-next-reward");
    nextReward.createSpan({ text: "本轮完成后解锁" });
    const nextRewardBody = nextReward.createDiv("daymark-milestone-next-reward-body");
    if (progress.nextStage) {
      this.renderRewardGlyph(nextRewardBody, progress.nextStage.reward, "daymark-milestone-next-glyph");
      const nextRewardCopy = nextRewardBody.createDiv();
      nextRewardCopy.createEl("strong", { text: progress.nextStage.reward.name });
      nextRewardCopy.createSpan({ text: progress.nextStage.systemName });
    } else {
      nextRewardBody.createSpan({ cls: "daymark-milestone-next-glyph", text: "✦" });
      const nextRewardCopy = nextRewardBody.createDiv();
      nextRewardCopy.createEl("strong", { text: "符号长阶已完成" });
      nextRewardCopy.createSpan({ text: "六十四卦仍会继续轮回" });
    }

    const progressStack = section.createDiv("daymark-milestone-progress-stack");
    const hexagramProgressCard = progressStack.createDiv(
      "daymark-milestone-progress-card is-hexagram",
    );
    const hexagramProgressCopy = hexagramProgressCard.createDiv(
      "daymark-milestone-progress-copy",
    );
    hexagramProgressCopy.createSpan({
      text: `卦内进度 · ${formatClock(hexagramElapsedSeconds, true)} / ${formatClock(stepSeconds, true)}`,
    });
    const hexagramProgressLabel = hexagramProgressCopy.createEl("strong", {
      text: `${hexagramPercent}%`,
    });
    const hexagramProgressElement = hexagramProgressCard.createDiv({
      cls: "daymark-milestone-progress",
      attr: {
        role: "progressbar",
        "aria-label": `第${progress.currentHexagram.number}卦${progress.currentHexagram.name}的卦内计时进度`,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(hexagramPercent),
        "aria-valuetext": `已进行${formatClock(hexagramElapsedSeconds, true)}，还需${formatClock(progress.remainingHexagramSeconds, true)}`,
      },
    });
    const hexagramProgressFill = hexagramProgressElement.createDiv(
      "daymark-milestone-progress-fill",
    );
    hexagramProgressFill.style.width = `${progress.hexagramProgress * 100}%`;
    const hexagramRemainingElement = hexagramProgressCard.createEl("p", {
      text: `完成当前卦还需 ${formatClock(progress.remainingHexagramSeconds, true)}`,
    });

    const cycleProgressCard = progressStack.createDiv(
      "daymark-milestone-progress-card is-cycle",
    );
    const cycleProgressCopy = cycleProgressCard.createDiv("daymark-milestone-progress-copy");
    cycleProgressCopy.createSpan({
      text: `本轮六十四卦 · 已完成 ${progress.completedHexagramsInCycle} / ${MILESTONE_HEXAGRAMS.length}`,
    });
    const cycleProgressLabel = cycleProgressCopy.createEl("strong", {
      text: `${cyclePercent}%`,
    });
    const cycleProgressElement = cycleProgressCard.createDiv({
      cls: "daymark-milestone-progress",
      attr: {
        role: "progressbar",
        "aria-label": `第${progress.currentCycle}轮六十四卦进度`,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(cyclePercent),
        "aria-valuetext": `本轮已完成${progress.completedHexagramsInCycle}卦，当前第${progress.currentHexagram.number}卦${progress.currentHexagram.name}`,
      },
    });
    const cycleProgressFill = cycleProgressElement.createDiv("daymark-milestone-progress-fill");
    cycleProgressFill.style.width = `${progress.cycleProgress * 100}%`;
    const cycleRemainingElement = cycleProgressCard.createEl("p", {
      text: progress.nextStage
        ? `距解锁 ${progress.nextStage.reward.name} 还需 ${formatClock(progress.remainingRewardSeconds, true)}`
        : "全部符号已经解锁；六十四卦仍按顺序继续轮回。",
    });

    const hexagramCycle = section.createDiv("daymark-hexagram-cycle");
    const hexagramHeading = hexagramCycle.createDiv("daymark-milestone-subheading");
    hexagramHeading.createEl("strong", { text: "本轮六十四卦" });
    hexagramHeading.createSpan({
      text: `第 ${progress.currentCycle} 轮 · 文王卦序 1—${MILESTONE_HEXAGRAMS.length}`,
    });
    const hexagramGrid = hexagramCycle.createEl("ol", {
      cls: "daymark-hexagram-grid",
      attr: { "aria-label": `第${progress.currentCycle}轮六十四卦顺序进度` },
    });
    for (const hexagram of MILESTONE_HEXAGRAMS) {
      const isCompleted = hexagram.number <= progress.completedHexagramsInCycle;
      const isCurrent = hexagram.number === progress.currentHexagram.number;
      const status = isCompleted ? "已完成" : isCurrent ? "当前" : "未完成";
      const cell = hexagramGrid.createEl("li", {
        cls: `daymark-hexagram-cell${isCompleted ? " is-completed" : ""}${isCurrent ? " is-current" : ""}`,
        attr: {
          "aria-label": `本轮第${hexagram.number}小时对应第${hexagram.number}卦${hexagram.name}，${status}`,
          title: `第 ${hexagram.number} 小时 → 第 ${hexagram.number} 卦 · ${hexagram.name} · ${status}`,
          ...(isCurrent ? { "aria-current": "step" } : {}),
        },
      });
      cell.createSpan({
        text: hexagram.symbol,
        attr: { "aria-hidden": "true" },
      });
      cell.createEl("small", {
        text: `${hexagram.number}h`,
        attr: { "aria-hidden": "true" },
      });
    }
    const hexagramLegend = hexagramCycle.createDiv("daymark-hexagram-legend");
    hexagramLegend.createSpan({
      cls: "is-completed",
      text: `已完成 ${progress.completedHexagramsInCycle}`,
    });
    hexagramLegend.createSpan({ cls: "is-current", text: "当前 1" });
    hexagramLegend.createSpan({
      text: `未完成 ${Math.max(0, MILESTONE_HEXAGRAMS.length - progress.completedHexagramsInCycle - 1)}`,
    });

    const systems = section.createDiv("daymark-reward-systems");
    const systemsHeading = systems.createDiv("daymark-milestone-subheading");
    systemsHeading.createEl("strong", { text: "符号长阶" });
    systemsHeading.createSpan({
      text: `每走完一轮六十四卦，依次解锁一个符号 · ${progress.completedStages.length} / ${MILESTONE_STAGES.length}`,
    });
    const systemList = systems.createDiv("daymark-symbol-system-list");
    for (const system of MILESTONE_SYMBOL_SYSTEMS) {
      const systemStages = MILESTONE_STAGES.filter((stage) => stage.systemId === system.id);
      const unlockedCount = systemStages.filter((stage) => completedStageIds.has(stage.id)).length;
      const isComplete = unlockedCount === systemStages.length;
      const isCurrent = progress.nextStage?.systemId === system.id;
      const systemStatus = isComplete ? "已完成" : isCurrent ? "当前体系" : "待开启";
      const systemCard = systemList.createEl("section", {
        cls: `daymark-symbol-system${isComplete ? " is-completed" : ""}${isCurrent ? " is-current" : ""}`,
        attr: { "aria-label": `${system.name}，已解锁${unlockedCount}/${systemStages.length}，${systemStatus}` },
      });
      const systemHeader = systemCard.createDiv("daymark-symbol-system-heading");
      systemHeader.createEl("strong", { text: system.name });
      systemHeader.createSpan({ text: `${unlockedCount} / ${systemStages.length} · ${systemStatus}` });
      systemCard.createEl("p", { text: system.description });
      const symbolGrid = systemCard.createDiv({
        cls: "daymark-symbol-grid",
        attr: { role: "list", "aria-label": `${system.name}符号总览` },
      });
      for (const reward of system.symbols) {
        const stage = stageByReward.get(`${system.id}:${reward.id}`);
        if (!stage) continue;
        const unlocked = completedStageIds.has(stage.id);
        const isNext = progress.nextStage?.id === stage.id;
        const status = unlocked ? "已解锁" : isNext ? "下一奖励" : "未解锁";
        const symbol = symbolGrid.createDiv({
          cls: `daymark-symbol-tile${unlocked ? " is-unlocked" : ""}${isNext ? " is-next" : ""}`,
          attr: {
            role: "listitem",
            "aria-label": `${reward.symbol} ${reward.name}${reward.sound ? `，${reward.soundLabel ?? "读音"}${reward.sound}` : ""}，象征主题${reward.meaning}，${status}`,
            title: `${reward.name} · ${status}`,
          },
        });
        this.renderRewardGlyph(symbol, reward, "daymark-reward-glyph");
      }
    }

    const archive = section.createEl("details", { cls: "daymark-symbol-archive" });
    archive.createEl("summary", {
      text: `查看全部符号的名称、读音或原名与含义 · 已解锁 ${progress.completedStages.length} / ${MILESTONE_STAGES.length}`,
    });
    const archiveBody = archive.createDiv("daymark-symbol-archive-body");
    for (const system of MILESTONE_SYMBOL_SYSTEMS) {
      const systemStages = MILESTONE_STAGES.filter((stage) => stage.systemId === system.id);
      const unlockedCount = systemStages.filter((stage) => completedStageIds.has(stage.id)).length;
      const group = archiveBody.createEl("section", { cls: "daymark-symbol-archive-group" });
      const groupHeading = group.createDiv("daymark-symbol-archive-heading");
      groupHeading.createEl("h3", { text: system.name });
      groupHeading.createSpan({ text: `${unlockedCount} / ${systemStages.length}` });
      group.createEl("p", { text: system.description });
      const list = group.createEl("ol", {
        cls: "daymark-symbol-archive-list",
        attr: { "aria-label": `${system.name}符号释义` },
      });
      for (const stage of systemStages) {
        const unlocked = completedStageIds.has(stage.id);
        const isNext = progress.nextStage?.id === stage.id;
        const status = unlocked ? "已解锁" : isNext ? "下一奖励" : "未解锁";
        const item = list.createEl("li", {
          cls: `daymark-symbol-archive-item${unlocked ? " is-unlocked" : ""}${isNext ? " is-next" : ""}`,
          attr: {
            "aria-label": `第${stage.cycle}轮，${stage.reward.name}${stage.reward.sound ? `，${stage.reward.soundLabel ?? "读音"}${stage.reward.sound}` : ""}，象征主题${stage.reward.meaning}，${status}`,
          },
        });
        this.renderRewardGlyph(item, stage.reward, "daymark-symbol-archive-glyph");
        const itemCopy = item.createDiv("daymark-symbol-archive-copy");
        itemCopy.createEl("strong", { text: stage.reward.name });
        if (stage.reward.sound) {
          itemCopy.createSpan({
            text: `${stage.reward.soundLabel ?? "读音"} ${stage.reward.sound}`,
          });
        }
        itemCopy.createEl("small", { text: `象征主题：${stage.reward.meaning}` });
        const itemMeta = item.createDiv("daymark-symbol-archive-meta");
        itemMeta.createEl("strong", { text: `第 ${stage.cycle} 轮` });
        itemMeta.createSpan({ text: `${formatDuration(stage.thresholdSeconds)} · ${status}` });
      }
    }

    this.milestoneLive = {
      savedSeconds: saved.totalSeconds,
      startedAt,
      completedRewardCount: progress.completedStages.length,
      completedCycles: progress.completedCycles,
      completedHexagramsInCycle: progress.completedHexagramsInCycle,
      totalElement,
      hexagramProgressElement,
      hexagramProgressFill,
      hexagramProgressLabel,
      hexagramRemainingElement,
      cycleProgressElement,
      cycleProgressFill,
      cycleProgressLabel,
      cycleRemainingElement,
    };
  }

  private renderRewardGlyph(
    container: HTMLElement,
    reward: RewardSymbol,
    className: string,
  ): HTMLElement {
    const glyph = container.createSpan({
      cls: className,
      attr: { "aria-hidden": "true" },
    });
    if (!reward.pattern) {
      glyph.setText(reward.symbol);
      return glyph;
    }

    glyph.addClass("is-geomantic");
    const pattern = glyph.createSpan("daymark-geomantic-pattern");
    for (const count of reward.pattern) {
      const row = pattern.createSpan("daymark-geomantic-row");
      for (let index = 0; index < Number(count); index += 1) {
        row.createSpan("daymark-geomantic-dot");
      }
    }
    return glyph;
  }

  private renderMonthReview(container: HTMLElement, today: string): void {
    const monthStart = startOfMonth(this.selectedDate);
    const monthEnd = endOfMonth(this.selectedDate);
    const eventsByDate = new Map<string, TrackerEvent[]>();
    for (const event of this.controller.events) {
      if (event.occurredOn < monthStart || event.occurredOn > monthEnd) continue;
      const group = eventsByDate.get(event.occurredOn) ?? [];
      group.push(event);
      eventsByDate.set(event.occurredOn, group);
    }
    const review = container.createEl("section", {
      cls: "daymark-month-review",
      attr: { "aria-label": "月度回顾" },
    });
    const reviewHeading = review.createDiv("daymark-section-heading");
    const reviewCopy = reviewHeading.createDiv();
    reviewCopy.createSpan({ cls: "daymark-eyebrow", text: "每日足迹" });
    reviewCopy.createEl("h2", { text: "月度回顾" });
    reviewCopy.createEl("p", { text: "点击日期可以回到当天补记或查看详情。" });
    const monthNav = review.createDiv("daymark-month-nav");
    const previous = monthNav.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "上个月" },
    });
    setIcon(previous, "chevron-left");
    previous.addEventListener("click", () => {
      this.selectedDate = addMonths(this.selectedDate, -1);
      this.render();
    });
    monthNav.createEl("h3", { text: formatMonthLabel(this.selectedDate) });
    const next = monthNav.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "下个月" },
    });
    setIcon(next, "chevron-right");
    const thisMonth = startOfMonth(today);
    next.disabled = monthStart >= thisMonth;
    next.addEventListener("click", () => {
      if (monthStart < thisMonth) {
        this.selectedDate = addMonths(this.selectedDate, 1);
        this.render();
      }
    });

    const calendar = review.createDiv("daymark-calendar");
    const weekdays =
      this.controller.settings.firstDayOfWeek === "monday"
        ? ["一", "二", "三", "四", "五", "六", "日"]
        : ["日", "一", "二", "三", "四", "五", "六"];
    for (const label of weekdays) calendar.createDiv({ cls: "daymark-calendar-weekday", text: label });
    const nativeOffset = keyToDate(monthStart).getUTCDay();
    const offset =
      this.controller.settings.firstDayOfWeek === "monday" ? (nativeOffset + 6) % 7 : nativeOffset;
    for (let index = 0; index < offset; index += 1) {
      calendar.createDiv("daymark-calendar-spacer");
    }
    for (const date of daysBetweenInclusive(monthStart, monthEnd)) {
      const summary = summarizeDay(date, this.controller.habits, eventsByDate.get(date) ?? []);
      const day = calendar.createEl("button", {
        cls: `daymark-calendar-day${date === today ? " is-today" : ""}${
          date === this.selectedDate ? " is-selected" : ""
        }`,
        attr: {
          "aria-label": `${date}，完成 ${summary.completed} / ${summary.scheduled}`,
          "aria-current": date === today ? "date" : "false",
          "aria-pressed": String(date === this.selectedDate),
        },
      });
      day.style.setProperty("--daymark-day-strength", String(summary.ratio));
      day.createSpan({ text: String(keyToDate(date).getUTCDate()) });
      day.createEl("small", {
        text: summary.hasActivity ? `${summary.completed}/${summary.scheduled}` : "",
      });
      day.disabled = date > today;
      day.addEventListener("click", () => {
        this.selectedDate = date;
        this.activeTab = "today";
        this.render();
      });
    }
  }

  private renderStat(
    container: HTMLElement,
    iconName: string,
    label: string,
    value: string,
  ): void {
    const card = container.createDiv("daymark-stat-card");
    const icon = card.createDiv();
    setIcon(icon, iconName);
    card.createEl("strong", { text: value });
    card.createSpan({ text: label });
  }

  private updateRunningTimerLabels(): void {
    const now = Date.now();
    const taskNow = this.controller.deviceState.runningTimer?.pausedAt ?? now;
    for (const element of this.contentEl.querySelectorAll<HTMLElement>("[data-timer-started]")) {
      const started = Number(element.dataset.timerStarted);
      const label = element.querySelector<HTMLElement>(".daymark-timer-label");
      if (label && Number.isFinite(started)) {
        const prefix = element.dataset.timerPrefix ?? "停止 ";
        label.setText(`${prefix}${formatClock((taskNow - started) / 1_000)}`);
      }
    }
    for (const label of this.liveDurationLabels) {
      const current = label.startedAt
        ? Math.max(0, Math.floor((taskNow - label.startedAt) / 1_000))
        : 0;
      label.element.setText(formatClock(label.savedSeconds + current, true));
    }
    for (const label of this.liveAverageLabels) {
      const current = label.startedAt
        ? Math.max(0, Math.floor((taskNow - label.startedAt) / 1_000))
        : 0;
      label.element.setText(
        `活跃日均 ${formatClock(
          (label.savedSeconds + current) / label.activeDays,
          true,
        )}${label.suffix}`,
      );
    }
    if (this.updateMilestoneLabels(taskNow)) return;
    const running = this.controller.deviceState.runningTimer;
    if (running) {
      const elapsed = elapsedTimerSeconds(running, now);
      if (
        this.activeTab === "history" &&
        this.statisticsLiveMinute !== undefined &&
        Math.floor(elapsed / 60) !== this.statisticsLiveMinute
      ) {
        // Rebuild once per minute so a running task moves when it overtakes a peer.
        this.render();
        return;
      }
    }
    const restTimer = this.controller.deviceState.restTimer;
    if (restTimer) {
      const nextReminder = (restTimer.lastRestReminderSeconds ?? 0) + REST_INTERVAL_SECONDS;
      const remaining = Math.max(0, nextReminder - elapsedTimerSeconds(restTimer, now));
      for (const label of this.contentEl.querySelectorAll<HTMLElement>("[data-rest-countdown]")) {
        label.setText(remaining > 0 ? `距下次休息提醒 ${formatClock(remaining)}` : "休息倒计时已暂停 · 关闭提醒后重新开始");
      }
    }
  }

  private updateMilestoneLabels(now: number): boolean {
    const live = this.milestoneLive;
    if (!live) return false;
    const elapsed = live.startedAt
      ? Math.max(0, Math.floor((now - live.startedAt) / 1_000))
      : 0;
    const progress = evaluateMilestoneProgress(live.savedSeconds + elapsed);
    if (
      progress.completedStages.length !== live.completedRewardCount ||
      progress.completedCycles !== live.completedCycles ||
      progress.completedHexagramsInCycle !== live.completedHexagramsInCycle
    ) {
      this.render();
      return true;
    }

    const stepSeconds = HEXAGRAM_STEP_HOURS * 60 * 60;
    const hexagramElapsedSeconds = Math.max(
      0,
      Math.min(stepSeconds, stepSeconds - progress.remainingHexagramSeconds),
    );
    const hexagramPercent = Math.floor(progress.hexagramProgress * 100);
    const cyclePercent = Math.floor(progress.cycleProgress * 100);
    live.totalElement.setText(formatClock(progress.totalSeconds, true));
    live.hexagramProgressFill.style.width = `${progress.hexagramProgress * 100}%`;
    live.hexagramProgressElement.setAttr("aria-valuenow", String(hexagramPercent));
    live.hexagramProgressElement.setAttr(
      "aria-valuetext",
      `已进行${formatClock(hexagramElapsedSeconds, true)}，还需${formatClock(progress.remainingHexagramSeconds, true)}`,
    );
    live.hexagramProgressLabel.setText(`${hexagramPercent}%`);
    live.hexagramRemainingElement.setText(
      `完成当前卦还需 ${formatClock(progress.remainingHexagramSeconds, true)}`,
    );
    live.cycleProgressFill.style.width = `${progress.cycleProgress * 100}%`;
    live.cycleProgressElement.setAttr("aria-valuenow", String(cyclePercent));
    live.cycleProgressElement.setAttr(
      "aria-valuetext",
      `本轮已完成${progress.completedHexagramsInCycle}卦，当前第${progress.currentHexagram.number}卦${progress.currentHexagram.name}`,
    );
    live.cycleProgressLabel.setText(`${cyclePercent}%`);
    live.cycleRemainingElement.setText(
      progress.nextStage
        ? `距解锁 ${progress.nextStage.reward.name} 还需 ${formatClock(progress.remainingRewardSeconds, true)}`
        : "全部符号已经解锁；六十四卦仍按顺序继续轮回。",
    );
    return false;
  }

  private updateLiveClock(now = new Date()): void {
    if (!this.liveClockElement || !this.liveClockTimeLabel || !this.liveClockDateLabel) return;
    const time = liveTimeFormatter.format(now);
    const date = liveDateFormatter.format(now);
    this.liveClockElement.dateTime = now.toISOString();
    this.liveClockElement.setAttr("aria-label", `当前时间 ${date} ${time}`);
    this.liveClockElement.setAttr("title", `本机时间：${date} ${time}`);
    this.liveClockTimeLabel.setText(time);
    this.liveClockDateLabel.setText(date);
  }

  private renderCumulativeDuration(container: HTMLElement, habit: Habit): void {
    const saved = this.cumulativeDurations.get(habit.id) ?? 0;
    const running = this.controller.deviceState.runningTimer;
    this.renderLiveDurationValue(
      container,
      saved,
      running?.habitId === habit.id ? running.startedAt : undefined,
      "daymark-cumulative-value",
      "所有日期的累计时长（时:分:秒），包含本次正在进行的计时",
    );
  }

  private renderLiveDurationValue(
    container: HTMLElement,
    savedSeconds: number,
    startedAt: number | undefined,
    className: string,
    title: string,
  ): HTMLElement {
    const now = this.controller.deviceState.runningTimer?.pausedAt ?? Date.now();
    const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1_000)) : 0;
    const value = container.createEl("strong", {
      cls: className,
      text: formatClock(savedSeconds + elapsed, true),
      attr: {
        "data-cumulative-seconds": String(savedSeconds),
        title,
      },
    });
    if (startedAt) value.dataset.cumulativeStarted = String(startedAt);
    this.liveDurationLabels.push({ element: value, savedSeconds, startedAt });
    return value;
  }

  private announce(message: string): void {
    if (!this.liveRegion) return;
    this.liveRegion.setText("");
    window.setTimeout(() => this.liveRegion?.setText(message), 20);
  }
}
