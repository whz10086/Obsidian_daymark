import { afterEach, describe, expect, it, vi } from "vitest";

import { RestReminderChime } from "../src/rest-chime";

interface AudioGlobals {
  AudioContext?: unknown;
  webkitAudioContext?: unknown;
}

class FakeAudioParam {
  readonly values: Array<{ method: "set" | "ramp"; value: number; time: number }> = [];

  setValueAtTime(value: number, time: number): this {
    this.values.push({ method: "set", value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.values.push({ method: "ramp", value, time });
    return this;
  }
}

class FakeOscillator {
  readonly frequency = new FakeAudioParam();
  readonly starts: number[] = [];
  readonly stops: Array<number | undefined> = [];
  readonly disconnect = vi.fn();
  onended: (() => void) | null = null;
  type = "sine";

  connect(): void {}

  start(time: number): void {
    this.starts.push(time);
  }

  stop(time?: number): void {
    this.stops.push(time);
  }

  finish(): void {
    this.onended?.();
  }
}

class FakeGain {
  readonly gain = new FakeAudioParam();
  readonly disconnect = vi.fn();

  connect(): void {}
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  readonly currentTime = 12.5;
  readonly destination = {};
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  readonly resume = vi.fn(async () => {
    this.state = "running";
  });
  readonly close = vi.fn(async () => {
    this.state = "closed";
  });
  state: "suspended" | "running" | "closed";

  constructor(state: "suspended" | "running" = "running") {
    this.state = state;
    FakeAudioContext.instances.push(this);
  }

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

const globals = globalThis as unknown as AudioGlobals;
const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
const originalWebkitAudioContext = Object.getOwnPropertyDescriptor(globalThis, "webkitAudioContext");

function setAudioGlobals(audioContext?: unknown, webkitAudioContext?: unknown): void {
  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: audioContext,
    writable: true,
  });
  Object.defineProperty(globalThis, "webkitAudioContext", {
    configurable: true,
    value: webkitAudioContext,
    writable: true,
  });
}

it("synthesizes a short wooden strike distinct from the long bell", async () => {
  setAudioGlobals(FakeAudioContext);
  const chime = new RestReminderChime();
  expect(await chime.play("wood")).toBe(true);
  const context = FakeAudioContext.instances[0];
  expect(context.oscillators).toHaveLength(3);
  expect(context.oscillators[0].frequency.values[0].value).toBe(620);
  expect(context.oscillators[0].stops[0]).toBeCloseTo(context.currentTime + 0.28);
  chime.dispose();
  expect(context.close).toHaveBeenCalledOnce();
});

function restoreProperty(name: "AudioContext" | "webkitAudioContext", descriptor?: PropertyDescriptor): void {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    Reflect.deleteProperty(globals, name);
  }
}

afterEach(() => {
  FakeAudioContext.instances.length = 0;
  restoreProperty("AudioContext", originalAudioContext);
  restoreProperty("webkitAudioContext", originalWebkitAudioContext);
});

describe("RestReminderChime", () => {
  it("quietly returns false when Web Audio is unavailable", async () => {
    setAudioGlobals(undefined, undefined);
    const chime = new RestReminderChime();

    expect(() => chime.prime()).not.toThrow();
    await expect(chime.play()).resolves.toBe(false);
    expect(() => chime.dispose()).not.toThrow();
  });

  it("primes a suspended context and can retry resume on a later gesture", async () => {
    const context = new FakeAudioContext("suspended");
    context.resume
      .mockRejectedValueOnce(new Error("gesture expired"))
      .mockImplementationOnce(async () => {
        context.state = "running";
      });
    setAudioGlobals(vi.fn(() => context));
    const chime = new RestReminderChime();

    expect(() => chime.prime()).not.toThrow();
    await Promise.resolve();
    chime.prime();
    await Promise.resolve();

    expect(context.resume).toHaveBeenCalledTimes(2);
    await expect(chime.play()).resolves.toBe(true);
  });

  it("schedules a low, softly mixed bell body with a ten-second tail", async () => {
    const context = new FakeAudioContext("running");
    setAudioGlobals(vi.fn(() => context));
    const chime = new RestReminderChime();

    await expect(chime.play()).resolves.toBe(true);

    expect(context.oscillators).toHaveLength(7);
    expect(context.gains).toHaveLength(8);
    const frequencies = context.oscillators.map((oscillator) => oscillator.frequency.values[0]?.value);
    [73.415, 146.83, 148.2983, 220.245, 296.5966, 402.3142, 599.0664].forEach((frequency, index) => {
      expect(frequencies[index]).toBeCloseTo(frequency, 5);
    });
    expect(context.oscillators.every((oscillator) => oscillator.starts[0] === context.currentTime)).toBe(true);
    const scheduledStops = context.oscillators.flatMap((oscillator) => oscillator.stops).filter((time) => time !== undefined);
    expect(Math.max(...scheduledStops) - context.currentTime).toBeCloseTo(10.4, 5);
    for (const envelope of context.gains.slice(1)) {
      expect(envelope.gain.values.map((event) => event.method)).toEqual(["set", "ramp", "ramp"]);
      expect(envelope.gain.values.at(-1)?.value).toBe(0.0001);
    }
  });

  it("stops and disconnects the previous bell before a rapid replay", async () => {
    const context = new FakeAudioContext("running");
    setAudioGlobals(vi.fn(() => context));
    const chime = new RestReminderChime();

    await chime.play();
    const firstOscillators = context.oscillators.slice();
    const firstGains = context.gains.slice();
    await chime.play();

    expect(context.oscillators).toHaveLength(14);
    expect(firstOscillators.every((oscillator) => oscillator.stops.at(-1) === undefined)).toBe(true);
    expect(firstOscillators.every((oscillator) => oscillator.disconnect.mock.calls.length === 1)).toBe(true);
    expect(firstGains.every((gain) => gain.disconnect.mock.calls.length === 1)).toBe(true);
    expect(context.oscillators.slice(7).every((oscillator) => oscillator.disconnect.mock.calls.length === 0)).toBe(true);
  });

  it("lets only the latest concurrent play continue after audio resumes", async () => {
    const context = new FakeAudioContext("suspended");
    const resumeResolvers: Array<() => void> = [];
    context.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resumeResolvers.push(() => {
            context.state = "running";
            resolve();
          });
        }),
    );
    setAudioGlobals(vi.fn(() => context));
    const chime = new RestReminderChime();

    const firstPlay = chime.play();
    const secondPlay = chime.play();
    expect(resumeResolvers).toHaveLength(2);
    resumeResolvers.forEach((resolve) => resolve());

    await expect(firstPlay).resolves.toBe(false);
    await expect(secondPlay).resolves.toBe(true);
    expect(context.oscillators).toHaveLength(7);
  });

  it("disconnects every node when the longest tail finishes", async () => {
    const context = new FakeAudioContext("running");
    setAudioGlobals(vi.fn(() => context));
    const chime = new RestReminderChime();

    await chime.play();
    context.oscillators[0]?.finish();

    expect(context.oscillators.every((oscillator) => oscillator.disconnect.mock.calls.length === 1)).toBe(true);
    expect(context.gains.every((gain) => gain.disconnect.mock.calls.length === 1)).toBe(true);
    await chime.play();
    expect(context.oscillators.slice(0, 7).every((oscillator) => oscillator.stops.length === 1)).toBe(true);
  });

  it("uses webkitAudioContext when the standard constructor is absent", async () => {
    const context = new FakeAudioContext("running");
    const webkitConstructor = vi.fn(() => context);
    setAudioGlobals(undefined, webkitConstructor);

    await expect(new RestReminderChime().play()).resolves.toBe(true);
    expect(webkitConstructor).toHaveBeenCalledOnce();
  });

  it("does not throw when construction or resume fails", async () => {
    setAudioGlobals(
      class {
        constructor() {
          throw new Error("construction failed");
        }
      },
    );
    const constructionFailure = new RestReminderChime();
    expect(() => constructionFailure.prime()).not.toThrow();
    await expect(constructionFailure.play()).resolves.toBe(false);

    const context = new FakeAudioContext("suspended");
    context.resume.mockRejectedValue(new Error("resume failed"));
    setAudioGlobals(vi.fn(() => context));
    const resumeFailure = new RestReminderChime();
    expect(() => resumeFailure.prime()).not.toThrow();
    await Promise.resolve();
    await expect(resumeFailure.play()).resolves.toBe(false);
  });

  it("closes the context once and tolerates repeated disposal", () => {
    const context = new FakeAudioContext("running");
    setAudioGlobals(vi.fn(() => context));
    const chime = new RestReminderChime();
    void chime.play();

    expect(() => {
      chime.dispose();
      chime.dispose();
    }).not.toThrow();
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.oscillators.every((oscillator) => oscillator.stops.at(-1) === undefined)).toBe(true);
    expect(context.oscillators.every((oscillator) => oscillator.disconnect.mock.calls.length === 1)).toBe(true);
    expect(context.gains.every((gain) => gain.disconnect.mock.calls.length === 1)).toBe(true);
  });
});
