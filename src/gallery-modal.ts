import { App, Modal, Notice } from "obsidian";
import type { GalleryItem } from "./gallery";

export class GalleryImageModal extends Modal {
  constructor(app: App, private readonly item: GalleryItem) { super(app); }
  onOpen(): void {
    this.modalEl.addClass("daymark-modal", "daymark-gallery-lightbox");
    this.setTitle(this.item.title);
    this.contentEl.createEl("img", { attr: { src: this.item.url, alt: this.item.title } });
    this.contentEl.createEl("p", { text: this.item.description });
    this.contentEl.createEl("button", { text: "关闭" }).addEventListener("click", () => this.close());
  }
  onClose(): void { this.contentEl.empty(); }
}

export class GalleryEditModal extends Modal {
  constructor(app: App, private readonly item: GalleryItem,
    private readonly save: (title: string, description: string) => Promise<void>) { super(app); }
  onOpen(): void {
    this.modalEl.addClass("daymark-modal");
    this.setTitle("编辑作品说明");
    const titleLabel = this.contentEl.createEl("label", { text: "作品标题" });
    const title = titleLabel.createEl("input", { attr: { type: "text", maxlength: "200" } });
    title.value = this.item.title;
    const descriptionLabel = this.contentEl.createEl("label", { text: "作品说明" });
    const description = descriptionLabel.createEl("textarea", { attr: { rows: "6", maxlength: "5000" } });
    description.value = this.item.description;
    const save = this.contentEl.createEl("button", { text: "保存作品说明", cls: "mod-cta" });
    save.addEventListener("click", async () => {
      save.disabled = true;
      try { await this.save(title.value, description.value); this.close(); }
      catch (error) { new Notice(error instanceof Error ? error.message : String(error)); save.disabled = false; }
    });
  }
  onClose(): void { this.contentEl.empty(); }
}
