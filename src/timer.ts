import type { RunningTimer } from "./types";

export const REST_INTERVAL_SECONDS = 30 * 60;

export function elapsedTimerSeconds(timer: Pick<RunningTimer, "startedAt" | "pausedAt">, now = Date.now()): number {
  if (!Number.isFinite(timer.startedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor(((timer.pausedAt ?? now) - timer.startedAt) / 1_000));
}

/** Return only the latest due boundary after sleep, never a backlog of dialogs. */
export function dueRestReminderSeconds(timer: Pick<RunningTimer, "startedAt" | "lastRestReminderSeconds">, now = Date.now()): number | undefined {
  const elapsed = elapsedTimerSeconds(timer, now);
  const boundary = Math.floor(elapsed / REST_INTERVAL_SECONDS) * REST_INTERVAL_SECONDS;
  const stored = timer.lastRestReminderSeconds;
  const previous = typeof stored === "number" && Number.isFinite(stored) ? Math.max(0, stored) : 0;
  return boundary > previous ? boundary : undefined;
}
