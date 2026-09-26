// Preview-only adapters for Obsidian's DOM helpers and host components.
// The rendered application is the real src/view.ts and src/modals.ts.
type ElementOptions = string | { cls?: string; text?: string; type?: string; attr?: Record<string, string> };

function applyOptions(element: HTMLElement, options: ElementOptions = {}): HTMLElement {
  if (typeof options === "string") element.className = options;
  else {
    if (options.cls) element.className = options.cls;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.type) element.setAttribute("type", options.type);
    for (const [key, value] of Object.entries(options.attr ?? {})) element.setAttribute(key, value);
  }
  return element;
}

Object.assign(HTMLElement.prototype, {
  createEl(this: HTMLElement, tag: string, options?: ElementOptions) {
    const element = applyOptions(document.createElement(tag), options);
    this.append(element);
    return element;
  },
  createDiv(this: HTMLElement, options?: ElementOptions) { return this.createEl("div", options); },
  createSpan(this: HTMLElement, options?: ElementOptions) { return this.createEl("span", options); },
  empty(this: HTMLElement) { this.replaceChildren(); },
  addClass(this: HTMLElement, ...names: string[]) { this.classList.add(...names); },
  removeClass(this: HTMLElement, ...names: string[]) { this.classList.remove(...names); },
  toggleClass(this: HTMLElement, name: string, force: boolean) { this.classList.toggle(name, force); },
  setText(this: HTMLElement, text: string) { this.textContent = text; },
  setAttr(this: HTMLElement, name: string, value: string) { this.setAttribute(name, value); },
  setAttrs(this: HTMLElement, attrs: Record<string, string>) {
    for (const [name, value] of Object.entries(attrs)) this.setAttribute(name, value);
  },
});

export class App {
  vault = { getName: () => "日迹预览库" };
}
export class WorkspaceLeaf { constructor(public previewContainer?: HTMLElement) {} }
export class ItemView {
  app = new App();
  contentEl = document.getElementById("preview-content")!;
  constructor(_leaf: WorkspaceLeaf) { if (_leaf.previewContainer) this.contentEl = _leaf.previewContainer; }
  registerInterval(_id: number): void {}
}

export class Notice {
  constructor(message: string) {
    const notice = document.body.createDiv({ cls: "preview-notice", text: message });
    window.setTimeout(() => notice.remove(), 3500);
  }
}

export class Modal {
  containerEl = document.createElement("div");
  modalEl = this.containerEl.createDiv("modal");
  contentEl = this.modalEl.createDiv("modal-content");
  constructor(public app: App) { this.containerEl.className = "modal-container"; }
  setTitle(value: string): void {
    let title = this.modalEl.querySelector(".modal-title");
    if (!title) {
      title = document.createElement("h2");
      title.className = "modal-title";
      this.modalEl.prepend(title);
    }
    title.textContent = value;
  }
  open(): void {
    document.body.append(this.containerEl);
    this.onOpen();
    this.containerEl.addEventListener("click", (event) => {
      if (event.target === this.containerEl) this.close();
    });
  }
  close(): void { this.onClose(); this.containerEl.remove(); }
  onOpen(): void {}
  onClose(): void {}
}

class InputComponent {
  inputEl: HTMLInputElement | HTMLTextAreaElement;
  constructor(container: HTMLElement, type: "input" | "textarea" = "input") {
    this.inputEl = container.createEl(type) as HTMLInputElement | HTMLTextAreaElement;
  }
  setValue(value: string): this { this.inputEl.value = value; return this; }
  setPlaceholder(value: string): this { this.inputEl.placeholder = value; return this; }
  setDisabled(value: boolean): this { this.inputEl.disabled = value; return this; }
  onChange(callback: (value: string) => void): this {
    this.inputEl.addEventListener("input", () => callback(this.inputEl.value));
    return this;
  }
}
export class TextComponent extends InputComponent {}
export class ColorComponent extends InputComponent {
  constructor(container: HTMLElement) { super(container); this.inputEl.type = "color"; }
}
class DropdownComponent {
  selectEl: HTMLSelectElement;
  constructor(container: HTMLElement) { this.selectEl = container.createEl("select"); }
  addOptions(options: Record<string, string>): this {
    for (const [value, text] of Object.entries(options)) this.selectEl.createEl("option", { text, attr: { value } });
    return this;
  }
  setValue(value: string): this { this.selectEl.value = value; return this; }
  setDisabled(value: boolean): this { this.selectEl.disabled = value; return this; }
  onChange(callback: (value: string) => void): this {
    this.selectEl.addEventListener("change", () => callback(this.selectEl.value)); return this;
  }
}
class ButtonComponent {
  buttonEl: HTMLButtonElement;
  constructor(container: HTMLElement) { this.buttonEl = container.createEl("button"); }
  setButtonText(value: string): this { this.buttonEl.textContent = value; return this; }
  setCta(): this { this.buttonEl.classList.add("mod-cta"); return this; }
  setWarning(): this { this.buttonEl.classList.add("mod-warning"); return this; }
  setDisabled(value: boolean): this { this.buttonEl.disabled = value; return this; }
  onClick(callback: () => void): this { this.buttonEl.addEventListener("click", callback); return this; }
}
export class Setting {
  settingEl: HTMLElement;
  controlEl: HTMLElement;
  private infoEl: HTMLElement;
  constructor(container: HTMLElement) {
    this.settingEl = container.createDiv("setting-item");
    this.infoEl = this.settingEl.createDiv("setting-item-info");
    this.controlEl = this.settingEl.createDiv("setting-item-control");
  }
  setName(value: string): this { this.infoEl.createDiv({ cls: "setting-item-name", text: value }); return this; }
  setDesc(value: string): this { this.infoEl.createDiv({ cls: "setting-item-description", text: value }); return this; }
  addText(callback: (component: TextComponent) => void): this { callback(new TextComponent(this.controlEl)); return this; }
  addTextArea(callback: (component: InputComponent) => void): this { callback(new InputComponent(this.controlEl, "textarea")); return this; }
  addColorPicker(callback: (component: ColorComponent) => void): this { callback(new ColorComponent(this.controlEl)); return this; }
  addDropdown(callback: (component: DropdownComponent) => void): this { callback(new DropdownComponent(this.controlEl)); return this; }
  addButton(callback: (component: ButtonComponent) => void): this { callback(new ButtonComponent(this.controlEl)); return this; }
}

const icons: Record<string, string> = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  "settings-2": '<path d="M20 7h-9M14 17H4M4 7h1M20 17h-1"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  "circle-check-big": '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3"/>',
  "chart-no-axes-column-increasing": '<path d="M8 20v-6M14 20V9M20 20V3"/>',
  "trending-up": '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  ellipsis: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  play: '<path d="m7 3 14 9-14 9Z"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  "pencil-line": '<path d="m16 3 5 5-13 13H3v-5ZM14 5l5 5M12 21h9"/>',
  "square-pen": '<path d="m16 3 5 5-10 10-5 1 1-5ZM12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>',
  "undo-2": '<path d="M3 10h11a7 7 0 0 1 0 14M3 10l5-5M3 10l5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  timer: '<circle cx="12" cy="14" r="8"/><path d="M10 2h4M12 14v-4M18 7l2-2"/>',
  coffee: '<path d="M4 8h14v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM18 8h1a3 3 0 1 1 0 6h-1M8 2v2M12 2v2M16 2v2"/>',
  flame: '<path d="M12 3c1 5-5 5-5 10a5 5 0 0 0 10 0c0-2-1-4-2-5 0 3-2 3-2 3 1-4 0-6-1-8Z"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 14v7M8 21h8"/>',
};
export function setIcon(element: HTMLElement, name: string): void {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({ width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", class: `svg-icon lucide-${name}`, "aria-hidden": "true" })) svg.setAttribute(key, value);
  svg.innerHTML = icons[name] ?? icons.circle;
  element.replaceChildren(svg);
}
