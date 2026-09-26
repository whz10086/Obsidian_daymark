interface PinnableWindow {
  id?: number;
  isMaximized?(): boolean;
  unmaximize?(): void;
  setAlwaysOnTop(value: boolean): void;
  isAlwaysOnTop(): boolean;
}

/** Never pin Obsidian's main window. Restore the old state when a leaf moves/closes. */
export class ActivityWindowPin {
  private host?: PinnableWindow;
  private previous = false;
  bind(owner: Window | null, main: Window, enabled: boolean): boolean {
    const host = owner && owner !== main
      ? (owner as unknown as { electronWindow?: PinnableWindow }).electronWindow : undefined;
    const mainHost = (main as unknown as { electronWindow?: PinnableWindow }).electronWindow;
    if (host && (host === mainHost || (host.id !== undefined && host.id === mainHost?.id))) { this.dispose(); return false; }
    if (host === this.host) return this.set(enabled);
    this.dispose();
    if (!host) return false;
    try {
      this.previous = host.isAlwaysOnTop();
      this.host = host;
      return this.set(enabled);
    } catch { return false; }
  }
  set(enabled: boolean): boolean {
    try {
      if (!this.host) return false;
      // Obsidian disables its own always-on-top command while maximized.
      if (enabled && this.host.isMaximized?.()) this.host.unmaximize?.();
      if (this.host.isAlwaysOnTop() !== enabled) this.host.setAlwaysOnTop(enabled);
      return this.host.isAlwaysOnTop() === enabled;
    }
    catch { return false; }
  }
  dispose(): void {
    try { this.host?.setAlwaysOnTop(this.previous); } catch { /* Window has closed. */ }
    this.host = undefined;
  }
}
