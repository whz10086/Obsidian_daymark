import { DaymarkView } from "../../src/view";
import { ActivityView } from "../../src/activity-view";
import { applyHabitOrder, moveHabitIds } from "../../src/habit-order";
import { createHabit } from "../../src/defaults";
import { todayKey, addDays } from "../../src/date-utils";
import { HabitModal } from "../../src/modals";
import { DailyRitualModal } from "../../src/daily-ritual-modal";
import { getDailyRitualPassage } from "../../src/daily-ritual";
import { RestReminderModal } from "../../src/rest-modal";
import { Notice } from "obsidian";
import type { DaymarkController } from "../../src/controller";
import type {
  DailyRitualCheckIn,
  Habit,
  TrackerEvent,
  TrackerEventType,
} from "../../src/types";

const params = new URLSearchParams(location.search);
document.body.className = params.get("theme") === "dark" ? "theme-dark" : "theme-light";
const today = todayKey(new Date(), "Asia/Shanghai");
const start = addDays(today, -125);
const habits = [
  createHabit("深度阅读", "duration", start, 0, { category: "学习与成长", emoji: "📖", color: "#7964cf", step: 300 }),
  createHabit("英语听力", "duration", start, 1, { category: "学习与成长", emoji: "🎧", color: "#5984d8", step: 600 }),
  createHabit("力量训练", "checkbox", start, 2, { category: "照顾自己", emoji: "🏋️", color: "#dc8956" }),
  createHabit("喝水", "count", start, 3, { category: "照顾自己", emoji: "💧", color: "#40a9b1", unit: "杯", step: 1 }),
  createHabit("生活随记", "text", start, 4, { category: "生活的片刻", emoji: "🌱", color: "#709858" }),
];
habits[1].rules[0].target = 1200;
habits[3].rules[0].target = 8;
const events: TrackerEvent[] = [];
let seq = 0;
function record(habit: Habit, date: string, type: TrackerEventType, value?: boolean | number | string, note = "", targetEventId?: string): void {
  events.push({ version: 1, id: `preview-event-${++seq}`, habitId: habit.id, type, value, targetEventId, occurredOn: date, recordedAt: new Date(Date.now() + seq).toISOString(), timezone: "Asia/Shanghai", deviceId: "preview-only", note });
}
const reflectionNotes = [
  "完成后比开始前更有精神，记住这种感觉。",
  "今天放慢了一点，但仍然留下了记录。",
  "把过程拆小之后，行动明显更轻松。",
  "晚间复盘：专注来自少做一件事。",
];
for (let offset = -125; offset < 0; offset++) {
  const date = addDays(today, offset);
  const dayIndex = offset + 125;

  // Make recent periods visibly stronger than older ones so the 7/30/90/all
  // range controls and trend comparison exercise genuinely different data.
  if (dayIndex % 11 !== 0) {
    const recentLift = offset >= -7 ? 1500 : offset >= -30 ? 900 : offset >= -90 ? 300 : 0;
    record(habits[0], date, "add", 900 + recentLift + (dayIndex % 5) * 240);
    if (dayIndex % 9 === 0) record(habits[0], date, "add", 420, "补记一小段专注阅读。 ");
  }
  if (dayIndex % 4 !== 0) {
    const listeningBase = offset >= -30 ? 1200 : 600;
    record(habits[1], date, "add", listeningBase + (dayIndex % 3) * 300);
  }
  if ((offset >= -30 && dayIndex % 5 !== 0) || (offset < -30 && dayIndex % 3 === 0)) {
    record(habits[2], date, "set", true);
  }
  if (dayIndex % 13 !== 0) {
    const cups = 3 + (dayIndex % 5) + (offset >= -30 ? 2 : 0);
    record(habits[3], date, "add", cups);
  }
  if (dayIndex % 4 === 0 || (offset >= -7 && dayIndex % 2 === 0)) {
    record(habits[4], date, "note", reflectionNotes[dayIndex % reflectionNotes.length]);
  }
}
record(habits[0], today, "add", 1200, "读完第二章，记下了三个值得实践的想法。");
record(habits[1], today, "add", 1200);
record(habits[2], today, "set", true);
record(habits[3], today, "add", 4);
record(habits[4], today, "note", "傍晚散步时看见一片很温柔的晚霞。给今天留一点空白，也是一种进步。");
const dailyRitualCheckIns: DailyRitualCheckIn[] = [];
let restChimeReplayCount = 0;
let view: DaymarkView;
let activityView: ActivityView | undefined;
const controller: DaymarkController = {
  settings: { dataFolder: "日迹", firstDayOfWeek: "monday", timezone: "Asia/Shanghai" },
  dailyReflectionSeed: "日迹",
  deviceState: { deviceId: "preview-only", restTimer: { startedAt: Date.now() - 23 * 60 * 1000 }, runningTimer: { habitId: habits[0].id, date: today, startedAt: Date.now() - 23 * 60 * 1000 - 16 * 1000 } },
  habits, events, dailyRitualCheckIns, issues: [],
  galleryItems: [],
  activitySelections: [],
  setActivityWindowPinned(pinned) { this.deviceState.activityWindowPinned = pinned; },
  async openActivityView(date) {
    if (!activityView) {
      const panel = document.body.createDiv("preview-activity-host");
      Object.assign(panel.style, { position: "fixed", top: "0", right: "0", width: "min(420px, 100vw)", height: "100vh", zIndex: "1000", boxShadow: "-20px 0 70px #0008", overflow: "auto" });
      activityView = new ActivityView({ previewContainer: panel } as never, controller);
      await activityView.onOpen();
    }
    if (date) await activityView.setState({ date });
  },
  async reorderHabit(sourceId, targetId, after) {
    const group = moveHabitIds(habits, sourceId, targetId, after);
    const sorted = applyHabitOrder(habits, [group]);
    habits.splice(0, habits.length, ...sorted); view.refresh(); activityView?.refresh();
  },
  async setActivitySelected(date, habitId, included) {
    this.activitySelections.push({ version: 1, id: `activity_${this.activitySelections.length}`, date, habitId, included, recordedAt: new Date().toISOString() });
    view.refresh(); activityView?.refresh();
  },
  async importGalleryImages(files) {
    for (const file of files) this.galleryItems.push({ path: file.name, url: URL.createObjectURL(file), title: file.name, description: "", createdAt: Date.now() });
    view.refresh(); activityView?.refresh();
  },
  async saveGalleryDetails(path, title, description) {
    const item = this.galleryItems.find((item) => item.path === path);
    if (item) Object.assign(item, { title, description });
    view.refresh(); activityView?.refresh();
  },
  async updateSettings(settings) { Object.assign(this.settings, settings); view.refresh(); activityView?.refresh(); },
  openHabitEditor(habit) {
    new HabitModal(view.app, { habit, effectiveDate: today, nextOrder: habits.length, onSubmit: async (next) => {
      const index = habits.findIndex((item) => item.id === next.id);
      if (index >= 0) habits[index] = next; else habits.push(next);
      view.refresh(); activityView?.refresh();
    } }).open();
  },
  async archiveHabit() {},
  async restoreHabit() {},
  async recordCheckbox(habit, date, value) { record(habit, date, "set", value); view.refresh(); activityView?.refresh(); },
  async recordNumber(habit, date, value, note) { record(habit, date, "add", value, note); view.refresh(); activityView?.refresh(); },
  async recordText(habit, date, value) { record(habit, date, "note", value); view.refresh(); activityView?.refresh(); },
  async retractEvent(habit, event) { record(habit, event.occurredOn, "retract", undefined, "", event.id); view.refresh(); activityView?.refresh(); },
  async toggleTimer(habit, date) {
    const running = this.deviceState.runningTimer;
    if (running) {
      if (running.habitId !== habit.id) throw new Error("请先停止正在进行的计时");
      record(habit, running.date, "add", Math.floor((Date.now() - running.startedAt) / 1000));
      delete this.deviceState.runningTimer;
    } else this.deviceState.runningTimer = { habitId: habit.id, date, startedAt: Date.now() };
    view.refresh(); activityView?.refresh();
  },
  openDailyRitualCheckIn() { openDailyRitualCheckIn(); },
  openSettings() { new Notice("预览模式：所有样例仅存在内存，不会修改仓库或设置。"); },
};

function openDailyRitualCheckIn(): void {
  const passage = getDailyRitualPassage(today, controller.dailyReflectionSeed);
  new DailyRitualModal(view.app, {
    date: today,
    passage,
    onCheckIn: async () => {
      if (!dailyRitualCheckIns.some((checkIn) => checkIn.occurredOn === today)) {
        dailyRitualCheckIns.push({
          version: 1,
          id: "checkin-preview-only",
          type: "daily-ritual",
          occurredOn: today,
          recordedAt: new Date().toISOString(),
          timezone: controller.settings.timezone,
          deviceId: controller.deviceState.deviceId,
          passageId: passage.id,
        });
      }
      view.refresh(); activityView?.refresh();
    },
    onDismiss: () => {},
  }).open();
}

view = new DaymarkView({} as never, controller);
(window as any).preview = {
  view,
  controller,
  get activityView() { return activityView; },
  openDailyRitual: openDailyRitualCheckIn,
  openRestReminder: () => new RestReminderModal(view.app, {
    habitName: habits[0].name,
    elapsedSeconds: 1800,
    onReplaySound: async () => {
      restChimeReplayCount += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      return true;
    },
    onStop: () => controller.toggleTimer(habits[0], today),
    onDismiss: () => {},
  }).open(),
  get restChimeReplayCount() { return restChimeReplayCount; },
};
view.onOpen().then(() => {
  (window as any).previewReady = true;
  if (params.get("modal") === "ritual") (window as any).preview.openDailyRitual();
});
