/** 依使用者時區取得「哪一天」，例如 2026-11-24 */
export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone, dateStyle: "short" }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("zh-TW", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}