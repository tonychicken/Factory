import type { z } from "zod";

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: "notJson" | "wrongShape"; readonly error: unknown };

/** 外部文字 → 驗證過的資料。不丟例外，失敗也是一種結果。 */
export function parseJson<S extends z.ZodType>(text: string, schema: S): Parsed<z.output<S>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: "notJson", error };
  }
  const result = schema.safeParse(raw);
  return result.success ? { ok: true, value: result.data } : { ok: false, reason: "wrongShape", error: result.error };
}

export function toJson(value: JsonValue): string {
  return JSON.stringify(value);
}