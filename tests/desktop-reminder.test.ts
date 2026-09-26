import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("obsidian", () => ({ Platform: { isDesktopApp: true } }));
import { Platform } from "obsidian";
import { DesktopReminder } from "../src/desktop-reminder";

afterEach(() => { Platform.isDesktopApp = true; vi.unstubAllGlobals(); });
describe("desktop reminder host", () => {
  it("does not access native windows on mobile", () => {
    Platform.isDesktopApp = false;
    const host = new DesktopReminder();
    host.start(); host.reveal(); host.dispose();
    expect(host.supportsBackground).toBe(false);
  });
  it("degrades safely when native capabilities are absent", () => {
    vi.stubGlobal("window", {});
    const host = new DesktopReminder();
    host.start(); host.reveal(); host.dispose();
    expect(host.supportsBackground).toBe(false);
  });
  it("restores the original throttling policy and does not leave the taskbar flashing", () => {
    const native = { isMinimized: () => false, restore: vi.fn(), show: vi.fn(), focus: vi.fn(), flashFrame: vi.fn(),
      webContents: { getBackgroundThrottling: () => false, setBackgroundThrottling: vi.fn() } };
    vi.stubGlobal("window", { electronWindow: native });
    const host = new DesktopReminder(); host.start(); host.reveal(); host.dispose();
    expect(native.restore).not.toHaveBeenCalled();
    expect(native.show).toHaveBeenCalledOnce();
    expect(native.focus).toHaveBeenCalledOnce();
    expect(native.flashFrame).toHaveBeenLastCalledWith(false);
    expect(native.webContents.setBackgroundThrottling).toHaveBeenLastCalledWith(false);
  });
});
