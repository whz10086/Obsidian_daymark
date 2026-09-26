import type { GalleryItem } from "./gallery";
import type { ActivitySelection } from "./activity-list";
import type {
  DailyRitualCheckIn,
  DataIssue,
  DaymarkSettings,
  DeviceState,
  Habit,
  TrackerEvent,
} from "./types";

export interface DaymarkController {
  readonly settings: DaymarkSettings;
  readonly dailyReflectionSeed: string;
  readonly deviceState: DeviceState;
  readonly habits: Habit[];
  readonly events: TrackerEvent[];
  readonly dailyRitualCheckIns: DailyRitualCheckIn[];
  readonly issues: DataIssue[];
  readonly galleryItems: GalleryItem[];
  readonly activitySelections: ActivitySelection[];
  setActivitySelected(date: string, habitId: string, included: boolean): Promise<void>;
  openActivityView(date?: string): Promise<void>;
  setActivityWindowPinned(pinned: boolean): void;
  reorderHabit(sourceId: string, targetId: string, after?: boolean): Promise<void>;
  importGalleryImages(files: File[]): Promise<void>;
  saveGalleryDetails(path: string, title: string, description: string): Promise<void>;
  updateSettings(settings: DaymarkSettings): Promise<void>;
  openHabitEditor(habit?: Habit): void;
  archiveHabit(habit: Habit): Promise<void>;
  restoreHabit(habit: Habit): Promise<void>;
  recordCheckbox(habit: Habit, date: string, value: boolean): Promise<void>;
  recordNumber(habit: Habit, date: string, value: number, note?: string): Promise<void>;
  recordText(habit: Habit, date: string, value: string): Promise<void>;
  retractEvent(habit: Habit, event: TrackerEvent): Promise<void>;
  toggleTimer(habit: Habit, date: string): Promise<void>;
  openDailyRitualCheckIn(): void;
  openSettings(): void;
}
