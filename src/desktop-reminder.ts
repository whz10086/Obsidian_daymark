import { Platform } from "obsidian";

interface DesktopWindow {
  isMinimized(): boolean;
  restore(): void;
  show(): void;
  focus(): void;
  flashFrame(flag: boolean): void;
  webContents: {
    getBackgroundThrottling(): boolean;
    setBackgroundThrottling(flag: boolean): void;
  };
}

/** Obsidian exposes its Electron window on desktop; never load Electron on mobile. */
export class DesktopReminder {
  private host?: DesktopWindow;
  private previousThrottling?: boolean;

  start(): void {
    if (!Platform.isDesktopApp) return;
    try {
      this.host = (window as unknown as { electronWindow?: DesktopWindow }).electronWindow;
      if (!this.host) return;
      this.previousThrottling = this.host.webContents.getBackgroundThrottling();
      this.host.webContents.setBackgroundThrottling(false);
    } catch {
      // A restricted host still gets ordinary foreground reminders.
    }
  }

  get supportsBackground(): boolean { return !!this.host; }

  reveal(): void {
    try {
      if (!this.host) return;
      if (this.host.isMinimized()) this.host.restore();
      this.host.show();
      this.host.focus();
      this.host.flashFrame(true);
    } catch { /* Keep the in-app dialog even if the OS denies focus. */ }
  }

  dismiss(): void {
    try { this.host?.flashFrame(false); } catch { /* Window may be closing. */ }
  }

  dispose(): void {
    this.dismiss();
    try {
      if (this.previousThrottling !== undefined) {
        this.host?.webContents.setBackgroundThrottling(this.previousThrottling);
      }
    } catch { /* Window may be closing. */ }
    this.host = undefined;
  }
}
