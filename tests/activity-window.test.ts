import { describe, expect, it, vi } from "vitest";
import { ActivityWindowPin } from "../src/activity-window";
function makeHost(initial = false) {
  let pinned = initial;
  return { isAlwaysOnTop: () => pinned, setAlwaysOnTop: vi.fn((value: boolean) => { pinned = value; }) };
}
describe("activity window pinning", () => {
  it("never pins the main window or a mobile window", () => {
    const host = makeHost();
    const main = { electronWindow: host } as unknown as Window;
    const pin = new ActivityWindowPin();
    expect(pin.bind(main, main, true)).toBe(false);
    expect(pin.bind({} as Window, main, true)).toBe(false);
    expect(host.setAlwaysOnTop).not.toHaveBeenCalled();
  });
  it("pins the popout, toggles, and restores state on close or movement to main", () => {
    const host = makeHost();
    const main = {} as Window;
    const popout = { electronWindow: host } as unknown as Window;
    const pin = new ActivityWindowPin();
    expect(pin.bind(popout, main, true)).toBe(true);
    expect(host.setAlwaysOnTop).toHaveBeenLastCalledWith(true);
    expect(pin.set(false)).toBe(true);
    expect(host.setAlwaysOnTop).toHaveBeenLastCalledWith(false);
    pin.set(true);
    pin.bind(main, main, true);
    expect(host.setAlwaysOnTop).toHaveBeenLastCalledWith(false);
    expect(pin.set(true)).toBe(false);
  });
  it("preserves a previously pinned host and tolerates closing windows", () => {
    const host = makeHost(true);
    const pin = new ActivityWindowPin();
    pin.bind({ electronWindow: host } as unknown as Window, {} as Window, false);
    pin.dispose(); expect(host.setAlwaysOnTop).toHaveBeenLastCalledWith(true);
    host.setAlwaysOnTop.mockImplementation(() => { throw new Error("closed"); });
    expect(pin.bind({ electronWindow: host } as unknown as Window, {} as Window, false)).toBe(false);
  });
  it("reasserts a lost native pin and verifies readback", () => {
    const host = makeHost(); const main = {} as Window;
    const popup = { electronWindow: host } as unknown as Window;
    const pin = new ActivityWindowPin();
    pin.bind(popup, main, true); host.setAlwaysOnTop(false);
    expect(pin.bind(popup, main, true)).toBe(true);
    expect(host.isAlwaysOnTop()).toBe(true);
    pin.dispose();
    const rejected = { isAlwaysOnTop: () => false, setAlwaysOnTop: vi.fn() };
    expect(pin.bind({ electronWindow: rejected } as unknown as Window, main, true)).toBe(false);
  });
  it("does not pin an alias of the main native window", () => {
    const host = { ...makeHost(), id: 1 };
    const pin = new ActivityWindowPin();
    expect(pin.bind({ electronWindow: host } as unknown as Window, { electronWindow: host } as unknown as Window, true)).toBe(false);
    expect(host.setAlwaysOnTop).not.toHaveBeenCalled();
  });
});
