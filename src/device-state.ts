import type { App } from "obsidian";

import { generateId } from "./id";
import type { DeviceState } from "./types";

export class DeviceStateStore {
  private readonly key: string;
  state: DeviceState;

  constructor(app: App) {
    this.key = `daymark-life-tracker:${encodeURIComponent(app.vault.getName())}:device-state`;
    this.state = this.read();
  }

  private read(): DeviceState {
    try {
      const raw = window.localStorage.getItem(this.key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DeviceState>;
        if (typeof parsed.deviceId === "string") return parsed as DeviceState;
      }
    } catch {
      // A locked-down mobile WebView can disable localStorage. The in-memory fallback still works.
    }
    return { deviceId: generateId("device") };
  }

  save(): void {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(this.state));
    } catch {
      // Keep the state in memory when persistent WebView storage is unavailable.
    }
  }
}
