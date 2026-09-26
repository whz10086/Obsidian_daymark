const MIME = "application/x-daymark-habit";
const PREFIX = "daymark-habit:";

export function writeActivityDrag(data: DataTransfer | null, id: string): void {
  data?.setData(MIME, id);
  // Native popout windows do not consistently preserve custom MIME formats.
  data?.setData("text/plain", PREFIX + id);
}
export function canDropActivity(data: DataTransfer | null): boolean {
  return !!data && (Array.from(data.types).includes(MIME) || Array.from(data.types).includes("text/plain"));
}
export function readActivityDrag(data: DataTransfer | null): string | undefined {
  const custom = data?.getData(MIME);
  if (custom) return custom;
  const plain = data?.getData("text/plain") ?? "";
  return plain.startsWith(PREFIX) ? plain.slice(PREFIX.length) || undefined : undefined;
}
