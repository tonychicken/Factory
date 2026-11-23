// 凍結：規格檔改了，又沒有規格異動單，就失敗。
import { createHash } from "node:crypto";

export interface Baseline {
  readonly id: string;
  readonly files: { readonly [path: string]: string };
}
/** 規格異動單：從哪個基準、改哪些檔、為什麼、誰提出、納入哪一版 */
export interface Change {
  readonly id: string;
  readonly from: string;
  readonly files: readonly string[];
  readonly why: string;
  readonly role: string;
  readonly into: string;
}

/** 換行統一，避免 Windows 與 Linux 算出不同的雜湊 */
export function hash(text: string): string {
  return createHash("sha256").update(text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n")).digest("hex");
}

export function freeze(id: string, files: ReadonlyMap<string, string>): Baseline {
  return { id, files: Object.fromEntries([...files].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, t]) => [p, hash(t)])) };
}

export function drift(base: Baseline, now: ReadonlyMap<string, string>, changes: readonly Change[]): readonly string[] {
  const allowed = new Set(changes.filter((c) => c.from === base.id && c.why.trim() !== "" && c.role.trim() !== "" && c.into.trim() !== "").flatMap((c) => c.files));
  const touched: string[] = [];
  for (const [p, h] of Object.entries(base.files)) {
    const t = now.get(p);
    if (t === undefined) { touched.push(`${p} 被刪除`); } else if (hash(t) !== h) { touched.push(`${p} 被修改`); }
  }
  for (const p of now.keys()) { if (!Object.hasOwn(base.files, p)) { touched.push(`${p} 是新增的`); } }
  return touched.filter((x) => !allowed.has(x.split(" ")[0] ?? "")).map((x) => `${x}，沒有規格異動單`);
}

/** 三個地方的編號要一致 */
export function sameBaseline(base: Baseline, pr: string, tests: readonly string[]): readonly string[] {
  return [["PR", pr] as const, ...tests.map((t, i) => [`測試 ${String(i + 1)}`, t] as const)]
    .flatMap(([where, id]) => (id === base.id ? [] : [`${where} 寫 ${id === "" ? "（空白）" : id}，基準是 ${base.id}`]));
}