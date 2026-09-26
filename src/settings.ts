import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import { effectiveRule } from "./domain";
import { todayKey } from "./date-utils";
import { ConfirmModal } from "./modals";
import { validateDataFolder } from "./storage";
import type DaymarkPlugin from "./main";

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export class DaymarkSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly daymark: DaymarkPlugin,
  ) {
    super(app, daymark);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("daymark-settings");
    containerEl.createEl("h2", { text: "日迹设置" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "打卡记录保存在 Vault 的普通 Markdown 文件中；配置 Obsidian Sync、iCloud 等 Vault 同步后，项目和记录才会跨设备同步。正在运行的计时器只保存在当前设备。",
    });

    let folderDraft = this.daymark.settings.dataFolder;
    new Setting(containerEl)
      .setName("数据文件夹")
      .setDesc("更换后不会移动旧文件；如需迁移，请先在文件管理器中移动整个文件夹。")
      .addText((text) => {
        text.inputEl.setAttr("aria-label", "日迹数据文件夹");
        text.setValue(folderDraft).onChange((value) => {
          folderDraft = value;
        });
      })
      .addButton((button) =>
        button.setButtonText("应用").onClick(async () => {
          const problem = validateDataFolder(folderDraft);
          if (problem) {
            new Notice(problem);
            return;
          }
          const applyFolder = async (): Promise<void> => {
            try {
              button.setDisabled(true);
              await this.daymark.updateSettings({
                ...this.daymark.settings,
                dataFolder: folderDraft.trim(),
              });
              new Notice("日迹数据文件夹已更新");
              this.display();
            } catch (error) {
              button.setDisabled(false);
              throw error;
            }
          };
          const hasCurrentData = this.daymark.habits.length > 0 || this.daymark.events.length > 0;
          const isChanging = folderDraft.trim() !== this.daymark.settings.dataFolder;
          if (isChanging && (hasCurrentData || this.daymark.deviceState.runningTimer)) {
            new ConfirmModal(
              this.app,
              "切换数据文件夹？",
              "旧文件不会被移动或删除，但会暂时从日迹界面消失；正在运行的计时器也会停止且不写入。",
              "确认切换",
              applyFolder,
            ).open();
          } else {
            try {
              await applyFolder();
            } catch (error) {
              new Notice(error instanceof Error ? error.message : String(error));
            }
          }
        }),
      );

    new Setting(containerEl)
      .setName("每周起始日")
      .setDesc("影响统计日历的排列")
      .addDropdown((dropdown) => {
        dropdown.selectEl.setAttr("aria-label", "每周起始日");
        dropdown
          .addOptions({ monday: "星期一", sunday: "星期日" })
          .setValue(this.daymark.settings.firstDayOfWeek)
          .onChange(async (value) => {
            try {
              dropdown.setDisabled(true);
              await this.daymark.updateSettings({
                ...this.daymark.settings,
                firstDayOfWeek: value as "monday" | "sunday",
              });
            } catch (error) {
              new Notice(error instanceof Error ? error.message : String(error));
            } finally {
              dropdown.setDisabled(false);
            }
          });
      });

    let timezoneDraft = this.daymark.settings.timezone;
    new Setting(containerEl)
      .setName("统计时区")
      .setDesc("历史记录会保留写入时的日期；推荐两端使用相同设置，例如 Asia/Shanghai。")
      .addText((text) => {
        text.inputEl.setAttr("aria-label", "统计时区");
        text.setValue(timezoneDraft).onChange((value) => {
          timezoneDraft = value.trim();
        });
      })
      .addButton((button) =>
        button.setButtonText("应用").onClick(async () => {
          if (!isValidTimezone(timezoneDraft)) {
            new Notice("请输入有效的 IANA 时区，例如 Asia/Shanghai");
            return;
          }
          try {
            button.setDisabled(true);
            await this.daymark.updateSettings({
              ...this.daymark.settings,
              timezone: timezoneDraft,
            });
            new Notice("统计时区已更新");
            button.setDisabled(false);
          } catch (error) {
            button.setDisabled(false);
            new Notice(error instanceof Error ? error.message : String(error));
          }
        }),
      );

    new Setting(containerEl).setName("项目管理").setHeading();
    if (this.daymark.habits.length === 0) {
      containerEl.createEl("p", { text: "还没有项目。请从日迹面板右上角新建。" });
    }
    const today = todayKey(new Date(), this.daymark.settings.timezone);
    for (const habit of this.daymark.habits) {
      const rule = effectiveRule(habit, today);
      const setting = new Setting(containerEl)
        .setName(`${habit.emoji} ${habit.name}`)
        .setDesc(`${habit.category} · ${rule?.enabled ? "已启用" : "已归档"}`)
        .addButton((button) =>
          button
            .setIcon("pencil")
            .setTooltip("编辑")
            .onClick(() => this.daymark.openHabitEditor(habit)),
        );
      if (rule?.enabled) {
        setting.addButton((button) =>
          button
            .setIcon("archive")
            .setTooltip("归档；历史记录会保留")
            .onClick(async () => {
              try {
                button.setDisabled(true);
                await this.daymark.archiveHabit(habit);
                this.display();
              } catch (error) {
                button.setDisabled(false);
                new Notice(error instanceof Error ? error.message : String(error));
              }
            }),
        );
      } else {
        setting.addButton((button) =>
          button
            .setIcon("archive-restore")
            .setTooltip("恢复")
            .onClick(async () => {
              try {
                button.setDisabled(true);
                await this.daymark.restoreHabit(habit);
                this.display();
              } catch (error) {
                button.setDisabled(false);
                new Notice(error instanceof Error ? error.message : String(error));
              }
            }),
        );
      }
    }

    if (this.daymark.issues.length > 0) {
      new Setting(containerEl).setName("数据检查").setHeading();
      containerEl.createEl("p", {
        cls: "daymark-settings-warning",
        text: `检测到 ${this.daymark.issues.length} 个无效或冲突文件。插件没有覆盖这些文件，请从日迹面板的警告图标查看路径。`,
      });
    }
  }
}
