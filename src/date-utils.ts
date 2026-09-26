export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date(), timezone?: string): string {
  if (!timezone) return dateToKey(now);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const values = new Map(parts.map((part) => [part.type, part.value]));
    return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
  } catch {
    return dateToKey(now);
  }
}

export function keyToDate(key: string): Date {
  if (!DATE_KEY_PATTERN.test(key)) {
    throw new Error(`Invalid date key: ${key}`);
  }
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${key}`);
  }
  return date;
}

export function addDays(key: string, amount: number): string {
  if (!Number.isInteger(amount) || !Number.isFinite(amount)) {
    throw new Error(`Invalid day offset: ${amount}`);
  }
  const date = keyToDate(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function startOfMonth(key: string): string {
  const date = keyToDate(key);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function endOfMonth(key: string): string {
  const date = keyToDate(key);
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(
    end.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function addMonths(key: string, amount: number): string {
  if (!Number.isInteger(amount) || !Number.isFinite(amount)) {
    throw new Error(`Invalid month offset: ${amount}`);
  }
  const date = keyToDate(key);
  const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function daysBetweenInclusive(start: string, end: string): string[] {
  keyToDate(start);
  keyToDate(end);
  if (start > end) return [];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    if (dates.length >= 20_000) throw new Error("Date range is too large");
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function formatDateLabel(key: string): string {
  const date = keyToDate(key);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatMonthLabel(key: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(keyToDate(key));
}

export function weekdayIndex(key: string): number {
  return keyToDate(key).getUTCDay();
}

export function isFutureDate(key: string, now = new Date(), timezone?: string): boolean {
  return key > todayKey(now, timezone);
}
