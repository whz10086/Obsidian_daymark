import { App, Modal, Notice, setIcon } from "obsidian";

import type { DailyRitualPassage } from "./daily-ritual";

interface DailyRitualModalOptions {
  date: string;
  passage: DailyRitualPassage;
  onCheckIn: () => Promise<void>;
  onDismiss: () => void;
}

export class DailyRitualModal extends Modal {
  private showing = false;

  constructor(app: App, private readonly options: DailyRitualModalOptions) {
    super(app);
  }

  onOpen(): void {
    this.showing = true;
    this.modalEl.addClass("daymark-modal", "daymark-ritual-modal");
    this.setTitle("今日签到 · 抄读入定");

    const icon = this.contentEl.createDiv("daymark-ritual-icon");
    icon.setAttr("aria-hidden", "true");
    setIcon(icon, "feather");

    const source = this.contentEl.createDiv("daymark-ritual-source");
    source.createSpan({ text: this.options.passage.source });
    source.createEl("time", { text: this.options.date, attr: { datetime: this.options.date } });

    this.contentEl.createEl("blockquote", {
      cls: "daymark-ritual-original",
      text: this.options.passage.original,
    });
    const translation = this.contentEl.createDiv("daymark-ritual-translation");
    translation.createEl("strong", { text: "今译" });
    translation.createEl("p", { text: this.options.passage.translation });

    this.contentEl.createEl("p", {
      cls: "daymark-ritual-instruction",
      text: "建议先缓慢朗读三遍，再在下方抄写一遍。抄写为选填，内容仅留在本次窗口，不会保存。",
    });
    const transcription = this.contentEl.createEl("textarea", {
      cls: "daymark-ritual-transcription",
      attr: {
        "aria-label": "今日签到篇章抄写区（选填，不保存）",
        placeholder: "选填：在这里抄写原文（不会保存）……",
        rows: "5",
      },
    });
    transcription.setAttr("spellcheck", "false");

    const actions = this.contentEl.createDiv("daymark-ritual-actions");
    const done = actions.createEl("button", { cls: "mod-cta", text: "完成今日签到" });
    let saving = false;
    done.addEventListener("click", async () => {
      if (saving) return;
      saving = true;
      done.disabled = true;
      try {
        await this.options.onCheckIn();
        this.close();
      } catch (error) {
        new Notice(`签到未保存：${error instanceof Error ? error.message : String(error)}`);
        saving = false;
        done.disabled = false;
      }
    });
  }

  onClose(): void {
    if (!this.showing) return;
    this.showing = false;
    this.contentEl.empty();
    this.options.onDismiss();
  }
}
