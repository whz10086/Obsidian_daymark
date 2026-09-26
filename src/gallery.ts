import { App, normalizePath, TFile, TFolder } from "obsidian";
import { generateId } from "./id";

export interface GalleryItem {
  path: string;
  url: string;
  title: string;
  description: string;
  createdAt: number;
  warning?: string;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif"]);
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

export function validateGalleryImage(name: string, size: number): string | undefined {
  if (!IMAGE_EXTENSIONS.has(name.split(".").pop()?.toLowerCase() ?? "")) {
    return "仅支持 PNG、JPG、WEBP、GIF、AVIF 渲染图片，不支持 .blend 文件";
  }
  if (!size || size > MAX_IMAGE_BYTES) return "图片不能为空，且每张不能超过 40 MB";
  return undefined;
}

export class GalleryStorage {
  constructor(private readonly app: App, private readonly root: string) {}
  get folder(): string { return normalizePath(`${this.root}/Blender展柜`); }

  async load(): Promise<GalleryItem[]> {
    const files = this.app.vault.getFiles().filter((file) =>
      file.path.startsWith(`${this.folder}/`) && IMAGE_EXTENSIONS.has(file.extension.toLowerCase()),
    );
    return Promise.all(files.sort((a, b) => b.stat.ctime - a.stat.ctime || a.path.localeCompare(b.path)).map(async (file) => {
      const item: GalleryItem = {
        path: file.path, url: this.app.vault.getResourcePath(file),
        title: file.basename, description: "", createdAt: file.stat.ctime,
      };
      const metadata = this.app.vault.getAbstractFileByPath(`${file.path}.json`);
      if (metadata instanceof TFile) {
        try {
          const parsed = JSON.parse(await this.app.vault.cachedRead(metadata));
          if (typeof parsed.title !== "string" || typeof parsed.description !== "string") throw new Error("invalid metadata");
          item.title = parsed.title;
          item.description = parsed.description;
        } catch { item.warning = "作品说明读取失败，原文件已保留"; }
      }
      return item;
    }));
  }

  private async ensureFolder(): Promise<void> {
    let cursor = "";
    for (const segment of this.folder.split("/")) {
      cursor = cursor ? `${cursor}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(cursor);
      if (existing && !(existing instanceof TFolder)) throw new Error(`${cursor} 不是文件夹`);
      if (!existing) {
        try { await this.app.vault.createFolder(cursor); }
        catch (error) { if (!(this.app.vault.getAbstractFileByPath(cursor) instanceof TFolder)) throw error; }
      }
    }
  }

  async importImage(file: File): Promise<void> {
    const problem = validateGalleryImage(file.name, file.size);
    if (problem) throw new Error(problem);
    await this.ensureFolder();
    const safeName = file.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(-160);
    const path = `${this.folder}/${generateId("render")}-${safeName}`;
    await this.app.vault.createBinary(path, await file.arrayBuffer());
    // A metadata failure does not delete the successfully imported original image.
    await this.saveDetails(path, file.name.replace(/\.[^.]+$/, ""), "");
  }

  async saveDetails(path: string, title: string, description: string): Promise<void> {
    if (!path.startsWith(`${this.folder}/`) || path.split("/").some((part) => part === ".." || part === ".")) {
      throw new Error("只能编辑展柜中的作品");
    }
    const image = this.app.vault.getAbstractFileByPath(path);
    if (!(image instanceof TFile) || !IMAGE_EXTENSIONS.has(image.extension.toLowerCase())) throw new Error("作品图片不存在");
    if (!title.trim() || title.length > 200 || description.length > 5000) throw new Error("标题需为 1–200 字，说明最多 5000 字");
    const content = JSON.stringify({ version: 1, title: title.trim(), description }, null, 2);
    const target = `${path}.json`;
    const existing = this.app.vault.getAbstractFileByPath(target);
    if (existing instanceof TFile) await this.app.vault.modify(existing, content);
    else if (existing) throw new Error("作品说明路径被文件夹占用");
    else await this.app.vault.create(target, content);
  }
}
