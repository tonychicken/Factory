// 由規格的矩陣產生測案。比對狀態，也比對效果。
import type { Flow } from "./define.ts";
import { row } from "./check.ts";

export interface Case {
  readonly id: string;
  readonly from: string;
  readonly event: string;
  readonly to: string;
  readonly effects: readonly string[];
}
export interface Outcome {
  readonly to: string;
  readonly effects: readonly string[];
}
export const REFUSED = "refused";

/** 「不會發生」的格子也要測：故意送出，狀態與效果都不能變 */
export function cases(flow: Flow): readonly Case[] {
  return Object.keys(flow.states).flatMap((from) =>
    row(flow, from).map(([event, c]) => ({
      id: `${flow.id}/${from}/${event}`, from, event,
      to: "to" in c ? c.to : from,
      effects: "to" in c ? c.effects : "refuse" in c ? [REFUSED] : [],
    })),
  );
}

export function compare(flow: Flow, step: (state: string, event: string) => Outcome): readonly string[] {
  const show = (o: Outcome): string => `${o.to}（${[...o.effects].sort().join("、")}）`;
  return cases(flow).flatMap((c) => {
    const got = step(c.from, c.event);
    return show(got) === show(c) ? [] : [`${c.id}：規格 ${show(c)}，實作 ${show(got)}`];
  });
}

/** 兩版規格差在哪，包含文字。給規格異動單用 */
export function diff(before: Flow, after: Flow): readonly string[] {
  const out: string[] = [];
  for (const s of new Set([...Object.keys(before.states), ...Object.keys(after.states)])) {
    const a = new Map(row(before, s));
    const b = new Map(row(after, s));
    for (const e of new Set([...a.keys(), ...b.keys()])) {
      const x = a.get(e);
      const y = b.get(e);
      if (x === undefined) { out.push(`${s} × ${e}：新增`); } else if (y === undefined) { out.push(`${s} × ${e}：移除`); } else if (JSON.stringify(x) !== JSON.stringify(y)) { out.push(`${s} × ${e}：修改`); }
    }
  }
  return out;
}