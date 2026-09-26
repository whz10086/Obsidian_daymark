type AudioContextConstructor = new () => AudioContext;
export type RestSoundMode = "bell" | "wood";

interface AudioContextHost {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

interface BellPartial {
  ratio: number;
  gain: number;
  durationSeconds: number;
}

interface BellVoice {
  oscillator: OscillatorNode;
  envelope: GainNode;
}

interface ActiveBell {
  master: GainNode;
  voices: BellVoice[];
  released: boolean;
}

const FUNDAMENTAL_HZ = 146.83;
const ATTACK_SECONDS = 0.016;
const SILENCE_GAIN = 0.0001;
const MASTER_GAIN = 0.58;
const PARTIALS: readonly BellPartial[] = [
  { ratio: 0.5, gain: 0.07, durationSeconds: 10.4 },
  { ratio: 1, gain: 0.23, durationSeconds: 10.1 },
  { ratio: 1.01, gain: 0.12, durationSeconds: 9.6 },
  { ratio: 1.5, gain: 0.10, durationSeconds: 8.4 },
  { ratio: 2.02, gain: 0.07, durationSeconds: 7.2 },
  { ratio: 2.74, gain: 0.042, durationSeconds: 6.1 },
  { ratio: 4.08, gain: 0.024, durationSeconds: 4.8 },
];

export class RestReminderChime {
  private context?: AudioContext;
  private activeBell?: ActiveBell;
  private playSequence = 0;

  /** Call from a user gesture so browsers can unlock audio for later reminders. */
  prime(): void {
    const context = this.getOrCreateContext();
    if (!context || context.state === "running" || context.state === "closed") return;

    try {
      void context.resume().catch(() => undefined);
    } catch {
      // A later user gesture may call prime again.
    }
  }

  async play(mode: RestSoundMode = "bell"): Promise<boolean> {
    const sequence = ++this.playSequence;
    this.releaseActiveBell(true);
    const context = this.getOrCreateContext();
    if (!context) return false;

    try {
      if (context.state !== "running") await context.resume();
      if (context.state !== "running" || sequence !== this.playSequence) return false;

      this.activeBell = this.scheduleBell(context, mode);
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    this.playSequence += 1;
    this.releaseActiveBell(true);
    const context = this.context;
    this.context = undefined;
    if (!context || context.state === "closed") return;

    try {
      void context.close().catch(() => undefined);
    } catch {
      // Closing audio must never block plugin unload.
    }
  }

  private getOrCreateContext(): AudioContext | undefined {
    if (this.context && this.context.state !== "closed") return this.context;
    this.context = undefined;

    const host = globalThis as unknown as AudioContextHost;
    const Context = host.AudioContext ?? host.webkitAudioContext;
    if (!Context) return undefined;

    try {
      this.context = new Context();
      return this.context;
    } catch {
      return undefined;
    }
  }

  private scheduleBell(context: AudioContext, mode: RestSoundMode): ActiveBell {
    const startedAt = context.currentTime;
    const master = context.createGain();
    const bell: ActiveBell = { master, voices: [], released: false };
    let finalVoice: BellVoice | undefined;
    let finalStopTime = Number.NEGATIVE_INFINITY;

    try {
      master.gain.setValueAtTime(MASTER_GAIN, startedAt);
      master.connect(context.destination);

      const partials = mode === "wood" ? [
        { ratio: 1, gain: 0.42, durationSeconds: 0.28 },
        { ratio: 1.63, gain: 0.24, durationSeconds: 0.17 },
        { ratio: 2.71, gain: 0.10, durationSeconds: 0.09 },
      ] : PARTIALS;
      for (const partial of partials) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const voice = { oscillator, envelope };
        const stoppedAt = startedAt + partial.durationSeconds;
        bell.voices.push(voice);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime((mode === "wood" ? 620 : FUNDAMENTAL_HZ) * partial.ratio, startedAt);
        envelope.gain.setValueAtTime(SILENCE_GAIN, startedAt);
        envelope.gain.exponentialRampToValueAtTime(partial.gain, startedAt + (mode === "wood" ? 0.002 : ATTACK_SECONDS));
        envelope.gain.exponentialRampToValueAtTime(SILENCE_GAIN, stoppedAt);

        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(startedAt);
        oscillator.stop(stoppedAt);

        if (stoppedAt > finalStopTime) {
          finalStopTime = stoppedAt;
          finalVoice = voice;
        }
      }

      if (!finalVoice) throw new Error("Bell has no voices");
      finalVoice.oscillator.onended = () => this.releaseBell(bell, false);
      return bell;
    } catch (error) {
      this.releaseBell(bell, true);
      throw error;
    }
  }

  private releaseActiveBell(stop: boolean): void {
    if (this.activeBell) this.releaseBell(this.activeBell, stop);
  }

  private releaseBell(bell: ActiveBell, stop: boolean): void {
    if (bell.released) return;
    bell.released = true;
    if (this.activeBell === bell) this.activeBell = undefined;

    for (const { oscillator, envelope } of bell.voices) {
      oscillator.onended = null;
      if (stop) {
        try {
          oscillator.stop();
        } catch {
          // A voice may already have ended or may not have started yet.
        }
      }
      this.disconnect(oscillator);
      this.disconnect(envelope);
    }
    this.disconnect(bell.master);
  }

  private disconnect(node: AudioNode): void {
    try {
      node.disconnect();
    } catch {
      // Some Web Audio implementations throw when a node is already detached.
    }
  }
}
