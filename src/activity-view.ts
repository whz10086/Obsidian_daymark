import { ItemView, Notice, setIcon, WorkspaceLeaf } from "obsidian";
import type { DaymarkController } from "./controller";
import { activityProgress, selectedActivityIds } from "./activity-list";
import { effectiveRule } from "./domain";
import { todayKey } from "./date-utils";
import { ActivityWindowPin } from "./activity-window";
import { canDropActivity, readActivityDrag } from "./activity-drag";
import { elapsedTimerSeconds, REST_INTERVAL_SECONDS } from "./timer";
import type { Habit } from "./types";

export const VIEW_TYPE_ACTIVITY = "daymark-activity-window";
function duration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return safe >= 3600 ? `${Math.floor(safe / 3600)}时${Math.floor(safe % 3600 / 60)}分`
    : `${Math.floor(safe / 60)}分${String(safe % 60).padStart(2, "0")}秒`;
}

export class ActivityView extends ItemView {
  private date: string;
  private lastToday: string;
  private pinned = true;
  private pickerOpen = false;
  private busy = false;
  private interval?: number;
  private readonly pin = new ActivityWindowPin();
  private pinButton?: HTMLButtonElement;
  private summary?: HTMLElement;
  private ring?: HTMLElement;
  private count?: HTMLElement;
  private rest?: HTMLElement;
  private rows: Array<{ habit: Habit; row: HTMLElement; value: HTMLElement; fill: HTMLElement; check: HTMLElement; state: HTMLElement }> = [];
  constructor(leaf: WorkspaceLeaf, private readonly controller: DaymarkController) {
    super(leaf);
    this.date = this.lastToday = todayKey(new Date(), controller.settings.timezone);
    this.pinned = controller.deviceState.activityWindowPinned ?? true;
  }
  getViewType(): string { return VIEW_TYPE_ACTIVITY; }
  getDisplayText(): string { return "今日活动"; }
  getIcon(): string { return "list-checks"; }
  getState(): Record<string, unknown> { return { date: this.date, pinned: this.pinned }; }
  async setState(state: unknown): Promise<void> {
    const data = state as { date?: string; pinned?: boolean } | undefined;
    if (data?.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) this.date = data.date;
    if (typeof data?.pinned === "boolean") this.pinned = data.pinned;
    this.pin.set(this.pinned);
    this.render();
  }
  async onOpen(): Promise<void> {
    this.contentEl.addClass("daymark-activity-view");
    this.render();
    this.interval = window.setInterval(() => this.tick(), 1000);
  }
  async onClose(): Promise<void> {
    if (this.interval !== undefined) window.clearInterval(this.interval);
    this.interval = undefined;
    this.pin.dispose();
  }
  refresh(): void { this.render(); }
  private async change(id: string, included: boolean, date = this.date): Promise<void> {
    if (this.busy) return;
    if (included && selectedActivityIds(this.controller.activitySelections, date).includes(id)) return;
    this.busy = true;
    this.contentEl.setAttr("aria-busy", "true");
    try { await this.controller.setActivitySelected(date, id, included); }
    catch (error) { new Notice(error instanceof Error ? error.message : String(error)); }
    finally { this.busy = false; this.contentEl.removeAttribute("aria-busy"); }
  }
  private render(): void {
    const scroll = this.contentEl.scrollTop;
    this.contentEl.empty(); this.rows = [];
    const date = this.date;
    const ids = selectedActivityIds(this.controller.activitySelections, date);
    const panel = this.contentEl.createEl("section", { cls: "daymark-focus-panel", attr: { "aria-label": "每日活动列表" } });
    const header = panel.createDiv("daymark-focus-top");
    const brand = header.createDiv();
    brand.createSpan({ cls: "daymark-focus-kicker", text: "DAYMARK / FOCUS" });
    brand.createEl("h1", { text: "今日活动" });
    this.pinButton = header.createEl("button", { cls: "daymark-focus-icon", attr: { "aria-label": "切换窗口置顶", title: "切换窗口置顶" } });
    setIcon(this.pinButton, "pin");
    this.pinButton.addEventListener("click", () => {
      if (this.pin.set(!this.pinned)) {
        this.pinned = !this.pinned;
        this.controller.setActivityWindowPinned(this.pinned);
      }
      else new Notice("系统置顶仅在电脑端独立活动窗口中可用");
      this.tick();
    });
    const hero = panel.createDiv("daymark-focus-overview");
    const copy = hero.createDiv();
    const dateInput = copy.createEl("input", { cls: "daymark-focus-date-input", attr: { type: "date", value: date, max: todayKey(new Date(), this.controller.settings.timezone), "aria-label": "活动列表日期" } });
    dateInput.addEventListener("change", () => { if (dateInput.value && dateInput.value <= dateInput.max) { this.date = dateInput.value; this.render(); } });
    this.summary = copy.createEl("p", { cls: "daymark-focus-summary" });
    this.ring = hero.createDiv("daymark-focus-ring");
    this.count = this.ring.createEl("strong");
    const toolbar = panel.createDiv("daymark-focus-toolbar");
    toolbar.createSpan({ text: "我的安排" });
    const add = toolbar.createEl("button", { text: this.pickerOpen ? "收起" : "＋ 添加项目", attr: { "aria-expanded": String(this.pickerOpen) } });
    add.addEventListener("click", () => { this.pickerOpen = !this.pickerOpen; this.render(); });
    if (this.pickerOpen) {
      const picker = panel.createDiv("daymark-focus-picker");
      const select = picker.createEl("select", { attr: { "aria-label": "选择已有活动项目" } });
      select.createEl("option", { text: "选择已有计时 / 计次项目", attr: { value: "" } });
      for (const habit of this.controller.habits.filter((habit) =>
        (habit.type === "duration" || habit.type === "count") && !ids.includes(habit.id) && effectiveRule(habit, date)?.enabled)) {
        select.createEl("option", { text: `${habit.emoji} ${habit.name}`, attr: { value: habit.id } });
      }
      picker.createEl("button", { text: "添加", attr: { "aria-label": "添加已有项目" } }).addEventListener("click", () => { if (select.value) void this.change(select.value, true, date); });
    }
    panel.addEventListener("dragover", (event) => {
      if (canDropActivity(event.dataTransfer)) { event.preventDefault(); event.stopPropagation(); if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"; panel.addClass("is-dragover"); }
    }, true);
    panel.addEventListener("dragleave", () => panel.removeClass("is-dragover"));
    panel.addEventListener("drop", (event) => {
      panel.removeClass("is-dragover");
      const id = readActivityDrag(event.dataTransfer);
      if (!id) return;
      event.preventDefault(); event.stopPropagation();
      if (this.controller.habits.some((habit) => habit.id === id && (habit.type === "duration" || habit.type === "count"))) void this.change(id, true, date);
    }, true);
    const list = panel.createEl("ul", { cls: "daymark-focus-items" });
    if (!ids.length) {
      const empty = panel.createDiv("daymark-focus-empty");
      setIcon(empty.createDiv(), "orbit");
      empty.createEl("strong", { text: "给今天留一点方向" });
      empty.createEl("p", { text: "添加一个项目，或把原模块拖到这里。" });
    }
    for (const id of ids) {
      const habit = this.controller.habits.find((item) => item.id === id);
      const row = list.createEl("li", { cls: "daymark-activity-row", attr: { "data-activity-id": id } });
      row.createSpan({ cls: "daymark-focus-emoji", text: habit?.emoji ?? "·" });
      const body = row.createDiv("daymark-focus-task-body");
      const line = body.createDiv("daymark-focus-task-line");
      line.createEl("strong", { text: habit?.name ?? "原项目已不存在" });
      const state = line.createSpan("daymark-focus-task-state");
      const progress = body.createDiv("daymark-focus-task-progress");
      const fill = progress.createSpan();
      const value = body.createSpan("daymark-focus-task-value");
      const check = row.createSpan({ cls: "daymark-activity-check", attr: { role: "img" } });
      if (habit && (habit.type === "duration" || habit.type === "count")) this.rows.push({ habit, row, value, fill, check, state });
      else { value.setText("仅列表关联，可安全移除"); check.setText("—"); check.setAttr("aria-label", "项目不可用"); }
      const remove = row.createEl("button", { cls: "daymark-focus-remove", attr: { "aria-label": `从活动列表移除 ${habit?.name ?? id}`, title: "只移除列表关联" } });
      setIcon(remove, "x");
      remove.addEventListener("click", () => { void this.change(id, false, date); });
    }
    const footer = panel.createDiv("daymark-focus-footer");
    this.rest = footer.createSpan();
    footer.createSpan({ text: "自动同步 · 无需手动打勾" });
    this.tick();
    this.contentEl.scrollTop = scroll;
  }
  private tick(): void {
    const today = todayKey(new Date(), this.controller.settings.timezone);
    if (today !== this.lastToday) {
      if (this.date === this.lastToday) this.date = today;
      this.lastToday = today; this.render(); return;
    }
    const available = this.pin.bind(this.contentEl.ownerDocument.defaultView, window, this.pinned);
    if (this.pinButton) {
      // Permit retries instead of leaving a failed native pin permanently disabled.
      this.pinButton.disabled = this.contentEl.ownerDocument.defaultView === window;
      this.pinButton.setAttr("aria-pressed", String(available && this.pinned));
      this.pinButton.title = available ? (this.pinned ? "已置顶，点击取消" : "点击置顶") : "仅电脑端独立窗口支持置顶";
    }
    let completed = 0;
    const running = this.controller.deviceState.runningTimer;
    for (const entry of this.rows) {
      const result = activityProgress(entry.habit, this.date, this.controller.events, running);
      const format = (value: number) => entry.habit.type === "duration" ? duration(value) : `${value} ${entry.habit.unit || "次"}`;
      entry.value.setText(`${format(result.value)} / ${result.target === undefined ? "未设目标" : format(result.target)}`);
      const percent = result.target ? Math.min(100, Math.max(0, result.value / result.target * 100)) : 0;
      entry.fill.style.width = `${percent}%`;
      entry.check.setText(result.completed ? "✓" : "○");
      entry.check.setAttr("aria-label", result.completed ? "已自动完成" : "尚未达标");
      entry.row.toggleClass("is-complete", result.completed);
      const active = running?.habitId === entry.habit.id && running.date === this.date;
      entry.state.setText(active ? (running.pausedAt === undefined ? "进行中" : "休息中") : "");
      if (result.completed) completed += 1;
    }
    const total = selectedActivityIds(this.controller.activitySelections, this.date).length;
    this.summary?.setText(total ? (completed === total ? "今天的安排，全部完成。" : `还有 ${total - completed} 件事，慢慢完成。`) : "不必很多，选好今天想做的事。");
    this.count?.setText(`${completed}/${total}`);
    this.ring?.style.setProperty("--focus-progress", `${total ? completed / total * 100 : 0}%`);
    const rest = this.controller.deviceState.restTimer;
    const remaining = rest ? Math.max(0, (rest.lastRestReminderSeconds ?? 0) + REST_INTERVAL_SECONDS - elapsedTimerSeconds(rest)) : REST_INTERVAL_SECONDS;
    this.rest?.setText(remaining ? `下次休息 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "休息中 · 关闭提醒后继续");
  }
}
