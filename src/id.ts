export function generateId(
  prefix: "device" | "habit" | "rule" | "event" | "checkin" | "vault" | "render" | "activity",
): string {
  const time = Date.now().toString(36);
  let random = "";
  try {
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    random = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    random = Math.random().toString(36).slice(2, 14);
  }
  return `${prefix}_${time}_${random}`;
}
