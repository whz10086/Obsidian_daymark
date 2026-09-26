import { App, Modal, Notice, setIcon } from "obsidian";
import type { RestSoundMode } from "./rest-chime";

interface RestReminderOptions {
  habitName?: string;
  elapsedSeconds: number;
  soundMode?: RestSoundMode;
  onModeChange?: (mode: RestSoundMode) => void;
  onReplaySound: (mode: RestSoundMode) => Promise<boolean>;
  onStop: () => Promise<void>;
  onDismiss: () => void;
}

export class RestReminderModal extends Modal {
  private showing = false;
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  constructor(app: App, private readonly options: RestReminderOptions) {
    super(app);
  }

  onOpen(): void {
    this.showing = true;
    this.modalEl.addClass("daymark-modal", "daymark-rest-modal");
    this.setTitle("钟声已响 · 该休息了");
    let mode = this.options.soundMode ?? "bell";
    const chime = this.contentEl.createEl("button", { cls: "daymark-rest-chime daymark-rest-instrument" });
    chime.setAttr("type", "button");
    chime.createSpan("daymark-rest-chime-ring daymark-rest-chime-ring-one");
    chime.createSpan("daymark-rest-chime-ring daymark-rest-chime-ring-two");
    chime.createSpan("daymark-rest-chime-ring daymark-rest-chime-ring-three");
    const icon = chime.createDiv("daymark-rest-icon");
    setIcon(icon, "bell-ring");
    const seal = chime.createSpan({ cls: "daymark-rest-chime-seal", text: "鐘" });
    const feedback = this.contentEl.createDiv("daymark-rest-feedback");
    feedback.setAttr("role", "status");
    const switches = this.contentEl.createDiv("daymark-rest-modes");
    const bellButton = switches.createEl("button", { text: "钟" });
    const woodButton = switches.createEl("button", { text: "木鱼" });
    this.contentEl.createEl("p", {
      cls: "daymark-rest-heading",
      text: "30 分钟休息提醒已到",
    });
    this.contentEl.createEl("p", {
      cls: "daymark-rest-description",
      text: "抬眼、松肩、喝口水，让注意力随着钟声缓缓归位。",
    });
    const resonance = this.contentEl.createEl("p", {
      cls: "daymark-rest-resonance",
      text: "厚重余韵约 10 秒 · 点击钟，清净 +1",
    });
    this.contentEl.createEl("p", {
      cls: "daymark-rest-note",
      text: "休息倒计时与当前任务均已暂停。关闭弹窗后任务自动继续，并重新开始 30 分钟倒计时；休息时间不计入累计。",
    });

    const updateMode = (): void => {
      this.setTitle(mode === "bell" ? "钟声已响 · 该休息了" : "木鱼轻响 · 该休息了");
      chime.setAttr("aria-label", mode === "bell" ? "敲钟" : "敲木鱼");
      chime.setAttr("data-mode", mode);
      icon.empty();
      if (mode === "bell") setIcon(icon, "bell-ring");
      else icon.createSpan("daymark-woodfish");
      seal.setText(mode === "bell" ? "鐘" : "木");
      resonance.setText(mode === "bell" ? "厚重余韵约 10 秒 · 点击钟，清净 +1" : "一叩一念 · 点击木鱼，清净 +1");
      bellButton.setAttr("aria-pressed", String(mode === "bell"));
      woodButton.setAttr("aria-pressed", String(mode === "wood"));
    };
    for (const [button, value] of [[bellButton, "bell"], [woodButton, "wood"]] as const) {
      button.addEventListener("click", () => { mode = value; this.options.onModeChange?.(mode); updateMode(); });
    }
    updateMode();
    const replay = chime;
    replay.addEventListener("click", async () => {
      if (!this.showing || replay.disabled) return;
      replay.disabled = true;
      replay.setAttr("aria-busy", "true");
      try {
        const played = await this.options.onReplaySound(mode);
        if (played && this.showing) {
          clearTimeout(this.feedbackTimer);
          feedback.empty();
          feedback.createSpan({ cls: "daymark-rest-merit", text: "清净 +1" });
          this.feedbackTimer = setTimeout(() => feedback.empty(), 1400);
        }
        if (!played && this.showing) {
          new Notice("系统暂时无法播放钟声，请检查静音设置后重试。");
        }
      } catch {
        if (this.showing) {
          new Notice("系统暂时无法播放钟声，请检查静音设置后重试。");
        }
      } finally {
        if (this.showing) {
          replay.disabled = false;
          replay.removeAttribute("aria-busy");
        }
      }
    });

    const actions = this.contentEl.createDiv("daymark-rest-actions");
    const keepGoing = actions.createEl("button", { text: "知道了" });
    keepGoing.addEventListener("click", () => this.close());
    if (!this.options.habitName) return;
    const stop = actions.createEl("button", { cls: "mod-cta", text: "停止并保存，去休息" });
    stop.addEventListener("click", async () => {
      if (!this.showing || stop.disabled) return;
      replay.disabled = true;
      keepGoing.disabled = true;
      stop.disabled = true;
      try {
        await this.options.onStop();
        if (this.showing) this.close();
      } catch (error) {
        new Notice(`计时未保存：${error instanceof Error ? error.message : String(error)}`);
        replay.disabled = false;
        keepGoing.disabled = false;
        stop.disabled = false;
      }
    });
  }

  onClose(): void {
    if (!this.showing) return;
    this.showing = false;
    clearTimeout(this.feedbackTimer);
    this.contentEl.empty();
    this.options.onDismiss();
  }
}
