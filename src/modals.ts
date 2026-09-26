import {
  App,
  ColorComponent,
  Modal,
  Notice,
  Setting,
  TextComponent,
} from "obsidian";

import { createHabit } from "./defaults";
import { effectiveRule } from "./domain";
import { generateId } from "./id";
import type { DataIssue, Habit, HabitType } from "./types";

const WEEKDAYS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 0, label: "日" },
];

interface HabitModalOptions {
  habit?: Habit;
  effectiveDate: string;
  nextOrder: number;
  onSubmit: (habit: Habit) => Promise<void>;
}

export class HabitModal extends Modal {
  constructor(
    app: App,
    private readonly options: HabitModalOptions,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("daymark-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", {
      text: this.options.habit ? "编辑项目" : "新建项目",
    });
    if (this.options.habit) {
      contentEl.createEl("p", {
        cls: "setting-item-description",
        text: `目标与执行星期的修改从 ${this.options.effectiveDate} 起生效。`,
      });
    }

    const original = this.options.habit;
    const activeRule = original ? effectiveRule(original, this.options.effectiveDate) : undefined;
    let name = original?.name ?? "";
    let type: HabitType = original?.type ?? "checkbox";
    let category = original?.category ?? "日常";
    let emoji = original?.emoji ?? "✨";
    let color = original?.color ?? "#7c6fcd";
    let unit = original?.unit ?? "";
    let target = String(
      original?.type === "duration"
        ? (activeRule?.target ?? 1_800) / 60
        : activeRule?.target ?? 1,
    );
    let step = String(
      original?.type === "duration" ? original.step / 60 : original?.step ?? 1,
    );
    const weekdays = new Set(activeRule?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);

    new Setting(contentEl).setName("名称").addText((text) => {
      text.inputEl.setAttrs({ "aria-label": "项目名称", maxlength: "80" });
      text
        .setPlaceholder("例如：锻炼")
        .setValue(name)
        .onChange((value) => {
          name = value;
        });
    });

    const typeSetting = new Setting(contentEl).setName("记录方式");
    typeSetting.addDropdown((dropdown) => {
      dropdown.selectEl.setAttr("aria-label", "记录方式");
      dropdown
        .addOptions({
          checkbox: "完成型",
          count: "次数型",
          duration: "时长型",
          text: "文字型",
        })
        .setValue(type)
        .setDisabled(Boolean(original))
        .onChange((value) => {
          type = value as HabitType;
          if (type === "duration") {
            unit = "分钟";
            target = "30";
            step = "5";
          } else if (type === "count") {
            unit = "次";
            target = "1";
            step = "1";
          }
          updateConditionalFields();
        });
    });
    if (original) typeSetting.setDesc("已有项目暂不支持更改类型");

    new Setting(contentEl).setName("分类").addText((text) => {
      text.inputEl.setAttrs({ "aria-label": "项目分类", maxlength: "40" });
      text.setValue(category).onChange((value) => {
        category = value;
      });
    });

    new Setting(contentEl).setName("图标").setDesc("推荐使用一个 Emoji").addText((text) => {
      text.inputEl.setAttrs({ "aria-label": "项目图标", maxlength: "16" });
      text.setValue(emoji).onChange((value) => {
        emoji = value;
      });
    });

    new Setting(contentEl).setName("颜色").addColorPicker((picker: ColorComponent) =>
      picker.setValue(color).onChange((value) => {
        color = value;
      }),
    );

    let targetInput: TextComponent;
    const targetSetting = new Setting(contentEl)
      .setName("每日目标")
      .addText((text) => {
        targetInput = text;
        text.inputEl.type = "number";
        text.inputEl.min = "0.02";
        text.inputEl.step = "any";
        text.inputEl.setAttr("aria-label", "每日目标；时长按分钟填写");
        text.setValue(target).onChange((value) => {
          target = value;
        });
      });

    let stepInput: TextComponent;
    const stepSetting = new Setting(contentEl)
      .setName("快捷增加")
      .setDesc("时长按分钟填写")
      .addText((text) => {
        stepInput = text;
        text.inputEl.type = "number";
        text.inputEl.min = "0.02";
        text.inputEl.step = "any";
        text.inputEl.setAttr("aria-label", "快捷增加值；时长按分钟填写");
        text.setValue(step).onChange((value) => {
          step = value;
        });
      });

    let unitInput: TextComponent;
    const unitSetting = new Setting(contentEl).setName("单位").addText((text) => {
      unitInput = text;
      text
        .setValue(unit)
        .setDisabled(Boolean(original))
        .onChange((value) => {
          unit = value;
        });
      text.inputEl.setAttrs({ "aria-label": "计数单位", maxlength: "16" });
    });
    if (original) unitSetting.setDesc("为避免改变历史记录含义，已有项目不能更改单位");

    const scheduleSetting = new Setting(contentEl)
      .setName("执行星期")
      .setDesc("未选择的日期不计入完成率");
    const schedule = scheduleSetting.controlEl.createDiv("daymark-weekdays");
    for (const day of WEEKDAYS) {
      const label = schedule.createEl("label", { cls: "daymark-weekday" });
      const input = label.createEl("input", { type: "checkbox" });
      input.setAttr("aria-label", `星期${day.label}`);
      input.checked = weekdays.has(day.value);
      input.addEventListener("change", () => {
        if (input.checked) weekdays.add(day.value);
        else weekdays.delete(day.value);
      });
      label.createSpan({ text: day.label });
    }

    const updateConditionalFields = (): void => {
      const showNumberFields = type === "count" || type === "duration";
      targetSetting.settingEl.toggleClass("daymark-hidden", !showNumberFields);
      stepSetting.settingEl.toggleClass("daymark-hidden", !showNumberFields);
      unitSetting.settingEl.toggleClass("daymark-hidden", type !== "count");
      targetInput?.setValue(target);
      stepInput?.setValue(step);
      unitInput?.setValue(unit);
    };
    updateConditionalFields();

    new Setting(contentEl)
      .addButton((button) =>
        button.setButtonText("取消").onClick(() => {
          this.close();
        }),
      )
      .addButton((button) =>
        button
          .setButtonText("保存")
          .setCta()
          .onClick(async () => {
            const cleanName = name.trim();
            if (!cleanName) {
              new Notice("请填写项目名称");
              return;
            }
            if (weekdays.size === 0) {
              new Notice("请至少选择一天");
              return;
            }
            const parsedTarget = Number(target);
            const parsedStep = Number(step);
            const normalizedTarget =
              type === "duration" ? Math.round(parsedTarget * 60) : type === "count" ? parsedTarget : 1;
            const normalizedStep =
              type === "duration" ? Math.round(parsedStep * 60) : type === "count" ? parsedStep : 1;
            if (
              (type === "count" || type === "duration") &&
              (!Number.isFinite(normalizedTarget) ||
                normalizedTarget <= 0 ||
                !Number.isFinite(normalizedStep) ||
                normalizedStep <= 0)
            ) {
              new Notice(type === "duration" ? "目标和快捷增加值至少为 1 秒" : "目标和快捷增加值必须大于 0");
              return;
            }

            const habit = original
              ? {
                  ...original,
                  rules: original.rules.map((rule) => ({ ...rule, weekdays: [...rule.weekdays] })),
                }
              : createHabit(cleanName, type, this.options.effectiveDate, this.options.nextOrder);
            habit.name = cleanName;
            habit.category = category.trim() || "日常";
            habit.emoji = emoji.trim() || "✨";
            habit.color = color;
            habit.unit = type === "duration" ? "分钟" : type === "count" ? unit.trim() || "次" : "";
            habit.step = normalizedStep;
            habit.updatedAt = new Date().toISOString();
            const desiredDays = [...weekdays].sort((a, b) => a - b);
            const previousRule = effectiveRule(habit, this.options.effectiveDate);
            const desiredEnabled = previousRule?.enabled ?? true;
            const ruleChanged =
              !previousRule ||
              previousRule.target !== normalizedTarget ||
              previousRule.weekdays.join(",") !== desiredDays.join(",");
            if (ruleChanged) {
              const now = new Date().toISOString();
              habit.rules.push({
                id: generateId("rule"),
                effectiveFrom: this.options.effectiveDate,
                enabled: desiredEnabled,
                weekdays: desiredDays,
                target: normalizedTarget,
                createdAt: now,
              });
            }
            try {
              button.setDisabled(true);
              await this.options.onSubmit(habit);
              this.close();
            } catch (error) {
              button.setDisabled(false);
              new Notice(error instanceof Error ? error.message : String(error));
            }
          }),
      );
  }
}

export class TextRecordModal extends Modal {
  constructor(
    app: App,
    private readonly title: string,
    private readonly onSubmit: (value: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("daymark-modal");
    this.contentEl.createEl("h2", { text: this.title });
    let value = "";
    new Setting(this.contentEl).setName("记录内容").addTextArea((area) => {
      area
        .setPlaceholder("写下这天的记录……")
        .onChange((next) => {
          value = next;
        });
      area.inputEl.rows = 6;
      area.inputEl.setAttrs({ "aria-label": "文字记录内容", maxlength: "10000" });
      area.inputEl.addClass("daymark-record-textarea");
      window.setTimeout(() => area.inputEl.focus(), 50);
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("取消").onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText("保存记录")
          .setCta()
          .onClick(async () => {
            if (!value.trim()) {
              new Notice("记录内容不能为空");
              return;
            }
            try {
              button.setDisabled(true);
              await this.onSubmit(value.trim());
              this.close();
            } catch (error) {
              button.setDisabled(false);
              new Notice(error instanceof Error ? error.message : String(error));
            }
          }),
      );
  }
}

export class NumericRecordModal extends Modal {
  constructor(
    app: App,
    private readonly habit: Habit,
    private readonly onSubmit: (baseValue: number, note: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("daymark-modal");
    this.contentEl.createEl("h2", { text: `记录 ${this.habit.name}` });
    let value = this.habit.type === "duration" ? String(this.habit.step / 60) : String(this.habit.step);
    let note = "";
    new Setting(this.contentEl)
      .setName(this.habit.type === "duration" ? "增加时长（分钟）" : `增加数量（${this.habit.unit}）`)
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = this.habit.type === "duration" ? "0.02" : "0.001";
        text.inputEl.step = "any";
        text.inputEl.setAttr("aria-label", this.habit.type === "duration" ? "增加分钟数" : "增加数量");
        text.setValue(value).onChange((next) => {
          value = next;
        });
      });
    new Setting(this.contentEl).setName("备注（可选）").addTextArea((area) => {
      area.inputEl.setAttrs({ "aria-label": "记录备注", maxlength: "1000" });
      area.onChange((next) => {
        note = next;
      });
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("取消").onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText("添加")
          .setCta()
          .onClick(async () => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              new Notice("请输入大于 0 的数字");
              return;
            }
            const baseValue = this.habit.type === "duration" ? Math.round(parsed * 60) : parsed;
            if (!Number.isFinite(baseValue) || baseValue <= 0) {
              new Notice(this.habit.type === "duration" ? "时长至少为 1 秒" : "请输入大于 0 的数字");
              return;
            }
            try {
              button.setDisabled(true);
              await this.onSubmit(baseValue, note.trim());
              this.close();
            } catch (error) {
              button.setDisabled(false);
              new Notice(error instanceof Error ? error.message : String(error));
            }
          }),
      );
  }
}

export class ConfirmModal extends Modal {
  constructor(
    app: App,
    private readonly title: string,
    private readonly message: string,
    private readonly confirmText: string,
    private readonly onConfirm: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("daymark-modal");
    this.contentEl.createEl("h2", { text: this.title });
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("取消").onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText(this.confirmText)
          .setWarning()
          .onClick(async () => {
            try {
              button.setDisabled(true);
              await this.onConfirm();
              this.close();
            } catch (error) {
              button.setDisabled(false);
              new Notice(error instanceof Error ? error.message : String(error));
            }
          }),
      );
  }
}

export class IssuesModal extends Modal {
  constructor(
    app: App,
    private readonly issues: DataIssue[],
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("daymark-modal");
    this.contentEl.createEl("h2", { text: "数据检查" });
    this.contentEl.createEl("p", {
      text: "以下文件未被自动改写，请手动检查。其他有效记录仍可正常使用。",
    });
    const list = this.contentEl.createEl("ul", { cls: "daymark-issues" });
    for (const issue of this.issues) {
      const item = list.createEl("li");
      item.createEl("strong", { text: issue.path });
      item.createEl("div", { text: issue.message });
    }
  }
}
