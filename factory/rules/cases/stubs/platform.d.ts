// 案例庫用的 platform 型別（比真的多幾個，例如 sendMessage）
import type { z } from "zod";
export interface Clock { readonly now: () => number }
export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: "notJson" | "wrongShape" };
export declare function parseJson<S extends z.ZodType>(text: string, schema: S): Parsed<z.output<S>>;
export declare function debounce<A extends readonly unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void;
export declare function retry<T>(job: () => Promise<T>, times: number): Promise<T>;
export declare function dayKey(iso: string, timeZone: string): string;
export declare function formatTime(iso: string, timeZone: string): string;
export declare function reportError(error: unknown): void;
export declare function sendMessage(text: string): Promise<void>;