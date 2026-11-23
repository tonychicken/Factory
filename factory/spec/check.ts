// 型別擋不住的檢查（02 §6）。
import type { AnyCell, Content, Decision, Flow, Rule, Spec } from "./define.ts";

export const LIMITS = { states: 8, events: 12, assumptions: 5, minText: 2, strength: 0.6 } as const;

export interface Problem {
  readonly where: string;
  readonly code: string;
  readonly message: string;
}

const SAME = "沒有變化";
const short = (t: string): boolean => t.trim().length < LIMITS.minText;
export const row = (flow: Flow, s: string): readonly (readonly [string, AnyCell])[] => Object.entries(flow.matrix[s] ?? {});
const targets = (flow: Flow, s: string): readonly string[] => row(flow, s).flatMap(([, c]) => ("to" in c && c.to !== s ? [c.to] : []));
const titleOf = (e: string | { readonly title: string }): string => (typeof e === "string" ? e : e.title);
export const eventTitle = (flow: Flow, e: string): string => titleOf(flow.events[e] ?? e);

function reach(flow: Flow, from: string): ReadonlySet<string> {
  const seen = new Set([from]);
  const todo = [from];
  for (const s of todo) { for (const t of targets(flow, s)) { if (!seen.has(t)) { seen.add(t); todo.push(t); } } }
  return seen;
}

function findCycle(flow: Flow): readonly string[] | null {
  const done = new Set<string>();
  const visit = (s: string, path: readonly string[]): readonly string[] | null => {
    const i = path.indexOf(s);
    if (i >= 0) { return [...path.slice(i), s]; }
    if (done.has(s)) { return null; }
    for (const t of targets(flow, s)) { const found = visit(t, [...path, s]); if (found !== null) { return found; } }
    done.add(s);
    return null;
  };
  for (const s of Object.keys(flow.states)) { const found = visit(s, []); if (found !== null) { return found; } }
  return null;
}

/** 什麼都不做的實作會被幾成的格子抓到 */
export function strength(flow: Flow): number {
  const cells = Object.keys(flow.states).flatMap((s) => row(flow, s).map(([, c]) => ({ s, c }))).filter(({ c }) => !("never" in c));
  const caught = cells.filter(({ s, c }) => "refuse" in c || ("to" in c && (c.to !== s || c.effects.length > 0)));
  return cells.length === 0 ? 0 : caught.length / cells.length;
}

export function checkFlow(flow: Flow): readonly Problem[] {
  const out: Problem[] = [];
  const add = (code: string, message: string, at = ""): void => { out.push({ where: `${flow.id}${at}`, code, message }); };
  const states = Object.keys(flow.states);
  const events = Object.keys(flow.events);
  if (states.length > LIMITS.states) { add("TOO_BIG", `狀態 ${String(states.length)} 個，上限 ${String(LIMITS.states)}，請拆開`); }
  if (events.length > LIMITS.events) { add("TOO_BIG", `事件 ${String(events.length)} 個，上限 ${String(LIMITS.events)}，請拆開`); }
  for (const [e, v] of Object.entries(flow.events)) {
    if (/離線|斷線|中斷/.test(titleOf(v)) && (typeof v === "string" || !(v.back in flow.events))) { add("NO_BACK", `「${titleOf(v)}」沒有對應的恢復事件`, ` [${e}]`); }
  }

  for (const [who, text] of Object.entries(flow.start.see)) { if (short(text)) { add("EMPTY", `沒有寫${flow.audience[who] ?? who}一開始看到什麼`, " [一開始]"); } }
  const usedBy = new Set<string>([flow.start.by]);
  const usedEffect = new Set<string>();
  for (const s of states) {
    for (const [e, c] of row(flow, s)) {
      const at = ` [${s} × ${e}]`;
      usedBy.add(c.by);
      const kinds = ["to", "refuse", "never"].filter((k) => k in c);
      if (kinds.length !== 1) { add("BOTH", "一格只能選一種：會發生、拒絕、不會發生", at); }
      if ("never" in c) {
        if (flow.kind === "lifecycle") { add("NEVER_IN_SERVER", "伺服器什麼都可能收到，改用 refuse", at); }
        if (short(c.never)) { add("EMPTY", "不會發生的理由是空的", at); }
        if (/若|如果|萬一|可能/.test(c.never)) { add("MAYBE", "理由裡有若、如果、萬一、可能，代表會發生", at); }
      }
      if ("refuse" in c && short(c.refuse)) { add("EMPTY", "沒有寫被拒絕的人看到什麼", at); }
      if ("to" in c) {
        for (const x of c.effects) { usedEffect.add(x); }
        for (const [who, text] of Object.entries(c.see)) { if (short(text)) { add("EMPTY", `沒有寫${flow.audience[who] ?? who}看到什麼`, at); } }
        const changes = Object.values(c.see).some((t) => t !== SAME);
        if (changes && c.to === s && c.effects.length === 0) { add("NO_EFFECT", "畫面有變化，但沒有可比對的效果", at); }
        if (!changes && c.effects.length > 0) { add("HIDDEN_EFFECT", "有效果，但沒有人看到任何變化", at); }
        if (c.temporary !== undefined && short(c.temporary.recoverWhen)) { add("EMPTY", "暫行解沒有回收條件", at); }
      }
    }
  }
  const seen = reach(flow, flow.initial);
  for (const s of states) { if (!seen.has(s)) { add("UNREACHABLE", `到不了的狀態：${s}`); } }
  for (const d of Object.keys(flow.decisions)) { if (!usedBy.has(d)) { add("UNUSED", `沒有被引用的決定：${d}`); } }
  for (const x of Object.keys(flow.effects)) { if (!usedEffect.has(x)) { add("UNUSED", `沒有被用到的效果：${x}`); } }

  if (flow.kind === "lifecycle") {
    const ends = new Set<string>(flow.ends);
    if (ends.size === 0) { add("NO_END", "沒有終點"); }
    const cycle = findCycle(flow);
    if (cycle !== null) { add("GO_BACK", `狀態往回走：${cycle.join(" → ")}。改成新增一段，不要回頭`); }
    for (const s of states) {
      if (ends.has(s) && targets(flow, s).length > 0) { add("LEAVE_END", `終點 ${s} 還可以離開`); }
      if (!ends.has(s) && ![...reach(flow, s)].some((x) => ends.has(x))) { add("STUCK", `${s} 走不到任何終點`); }
    }
    if (strength(flow) < LIMITS.strength) { add("WEAK", `什麼都不做的實作只會被 ${String(Math.round(strength(flow) * 100))}% 的格子抓到`); }
  } else {
    for (const s of states) { if (states.length > 1 && targets(flow, s).length === 0 && !(flow.ends ?? []).includes(s)) { add("STUCK", `${s} 出不去`); } }
  }
  return out;
}

const checkRule = (r: Rule): readonly Problem[] =>
  [r.title, r.statement, ...r.examples.flatMap((x) => [x.given, x.then])].some(short) ? [{ where: r.id, code: "EMPTY", message: "規則或例子是空的" }] : [];

const checkContent = (c: Content): readonly Problem[] =>
  (["maintainer", "refresh", "whenEmpty", "whenError"] as const).filter((k) => short(c[k])).map((k) => ({ where: c.id, code: "EMPTY", message: `內容缺少 ${k}` }));

const decisions = (spec: Spec): readonly { readonly where: string; readonly d: Decision }[] => [
  ...spec.flows.flatMap((f) => Object.entries(f.decisions).map(([k, d]) => ({ where: `${f.id} ${k}`, d }))),
  ...[...spec.rules, ...spec.contents].map((x) => ({ where: x.id, d: x.by })),
];

export function assumptions(spec: Spec): readonly Extract<Decision, { from: "assumption" }>[] {
  const byQuestion = new Map<string, Extract<Decision, { from: "assumption" }>>();
  for (const { d } of decisions(spec)) { if (d.from === "assumption") { byQuestion.set(d.question, d); } }
  return [...byQuestion.values()];
}

/** 全部規格一起查：每個子句都有對應、引用都真的存在、假設不超過上限 */
export function checkSpec(spec: Spec): readonly Problem[] {
  const out: Problem[] = [...spec.flows.flatMap(checkFlow), ...spec.rules.flatMap(checkRule), ...spec.contents.flatMap(checkContent)];
  const ids = [...spec.flows, ...spec.rules, ...spec.contents].map((x) => x.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) { out.push({ where: id, code: "DUPLICATE", message: "編號重複" }); }

  const clauses = spec.features.flatMap((f) => Object.keys(f.clauses).map((k) => `${f.id}.${k}`));
  const ownerRefs = new Set([...clauses, ...spec.owner.map((o) => o.id)]);
  const ruleRefs = new Set(ids);
  for (const { where, d } of decisions(spec)) {
    if (d.from === "owner" && !ownerRefs.has(d.ref)) { out.push({ where, code: "NO_REF", message: `引用不存在的負責人決定 ${d.ref}` }); }
    if (d.from === "rule" && !ruleRefs.has(d.ref)) { out.push({ where, code: "NO_REF", message: `引用不存在的規格 ${d.ref}` }); }
    if (d.from === "convention" && /\d/.test(d.why)) { out.push({ where, code: "NUMBER", message: "數字不是慣例，要當成假設給負責人決定" }); }
  }
  const covered = new Set(decisions(spec).flatMap(({ d }) => (d.from === "owner" ? [d.ref] : [])));
  for (const c of [...clauses, ...spec.owner.map((o) => o.id)]) { if (!covered.has(c)) { out.push({ where: c, code: "NO_SPEC", message: "沒有任何規格對應" }); } }
  const asked = assumptions(spec);
  if (asked.length > LIMITS.assumptions) { out.push({ where: "spec", code: "TOO_MANY", message: `假設 ${String(asked.length)} 條，上限 ${String(LIMITS.assumptions)}，退回 01` }); }
  return out;
}