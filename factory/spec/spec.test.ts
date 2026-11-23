import assert from "node:assert/strict";
import { test } from "node:test";
import { assumptions, checkFlow, checkSpec, LIMITS, strength } from "./check.ts";
import { cases, compare, diff, REFUSED, type Outcome } from "./cases.ts";
import { drift, freeze, sameBaseline, type Change } from "./freeze.ts";
import type { Flow, Spec } from "./define.ts";
import { spec } from "../../specs/index.ts";
import { conversation } from "../../specs/conversation.ts";
import { message, messageMark } from "../../specs/message.ts";

const codes = (x: readonly { readonly code: string }[]): string[] => [...new Set(x.map((p) => p.code))].sort();
const broken = (f: Flow, edit: (m: any) => void): Flow => { const c = structuredClone(f); edit(c); return c; };
const withSpec = (edit: (s: any) => void): Spec => { const c = structuredClone(spec); edit(c); return c; };

test("v0.1 真實規格全過，假設不超過上限", () => {
  assert.deepEqual(checkSpec(spec), []);
  assert.ok(assumptions(spec).length <= LIMITS.assumptions);
});

const bad: readonly (readonly [string, string, () => readonly { readonly code: string }[]])[] = [
  ["結束後又能恢復", "GO_BACK", () => checkFlow(broken(conversation, (m) => { m.matrix.ended.asksAgain.to = "talking"; }))],
  ["終點可以離開", "LEAVE_END", () => checkFlow(broken(conversation, (m) => { m.matrix.ended.asksAgain.to = "talking"; }))],
  ["對話中退回等候", "GO_BACK", () => checkFlow(broken(conversation, (m) => { m.matrix.talking.agentGone.to = "waiting"; }))],
  ["沒有終點", "NO_END", () => checkFlow(broken(conversation, (m) => { m.ends = []; }))],
  ["走不到終點", "STUCK", () => checkFlow(broken(conversation, (m) => { m.matrix.talking.visitorEnds.to = "talking"; m.matrix.talking.agentEnds.to = "talking"; }))],
  ["到不了的狀態", "UNREACHABLE", () => checkFlow(broken(conversation, (m) => { m.states.extra = "多的"; m.matrix.extra = m.matrix.ended; }))],
  ["伺服器寫不會發生", "NEVER_IN_SERVER", () => checkFlow(broken(conversation, (m) => { m.matrix.ended.accept = { never: "不會", by: "readOnly" }; }))],
  ["離線沒有連回", "NO_BACK", () => checkFlow(broken(conversation, (m) => { m.events.visitorGone = "訪客離線"; }))],
  ["沒寫某一方看到什麼", "EMPTY", () => checkFlow(broken(conversation, (m) => { m.matrix.waiting.accept.see.agent = " "; }))],
  ["沒寫一開始看到什麼", "EMPTY", () => checkFlow(broken(conversation, (m) => { m.start.see.visitor = ""; }))],
  ["拒絕沒有說明", "EMPTY", () => checkFlow(broken(conversation, (m) => { m.matrix.waiting.agentSends.refuse = ""; }))],
  ["畫面有變化但沒有效果", "NO_EFFECT", () => checkFlow(broken(conversation, (m) => { m.matrix.talking.visitorSends.effects = []; }))],
  ["有效果但沒人看到", "HIDDEN_EFFECT", () => checkFlow(broken(conversation, (m) => { m.matrix.ended.visitorGone.effects = ["markGone"]; }))],
  ["同時寫兩種", "BOTH", () => checkFlow(broken(conversation, (m) => { m.matrix.waiting.accept.refuse = "不收"; }))],
  ["不會發生卻寫若", "MAYBE", () => checkFlow(broken(messageMark, (m) => { m.matrix.sending.resend.never = "按鈕關閉；若仍按到就忽略"; }))],
  ["決定沒被引用", "UNUSED", () => checkFlow(broken(conversation, (m) => { m.decisions.x = { from: "convention", why: "無" }; }))],
  ["效果沒被用到", "UNUSED", () => checkFlow(broken(conversation, (m) => { m.effects.x = "無"; }))],
  ["畫面出不去", "STUCK", () => checkFlow(broken(messageMark, (m) => { m.ends = []; }))],
  ["狀態太多", "TOO_BIG", () => checkFlow(broken(conversation, (m) => { for (let i = 0; i < 9; i++) { m.states[`s${String(i)}`] = "x"; m.matrix[`s${String(i)}`] = {}; } }))],
  ["暫行解沒有回收條件", "EMPTY", () => checkFlow(broken(conversation, (m) => { m.matrix.waiting.accept.temporary = { recoverWhen: "" }; }))],
  ["大多格子空實作就能過", "WEAK", () => checkFlow(broken(conversation, (m) => { for (const s of ["waiting", "ended"]) { for (const e of Object.keys(m.matrix[s])) { if (!["accept", "visitorEnds"].includes(e) || s === "ended") { m.matrix[s][e] = { to: s, see: { visitor: "沒有變化", agent: "沒有變化" }, effects: [], by: "readOnly" }; } } } }))],
  ["子句沒有規格：先來先服務", "NO_SPEC", () => checkSpec(withSpec((s) => { s.rules = s.rules.filter((r: any) => r.id !== "queue.order"); }))],
  ["負責人的決定沒有規格", "NO_SPEC", () => checkSpec(withSpec((s) => { s.owner.push({ id: "v0.1/Q9", text: "新的", on: "2026-11-24" }); }))],
  ["引用不存在的負責人決定", "NO_REF", () => checkSpec(withSpec((s) => { s.rules[0].by = { from: "owner", ref: "v9.9/Q99" }; }))],
  ["引用不存在的規格", "NO_REF", () => checkSpec(withSpec((s) => { s.rules[0].by = { from: "rule", ref: "不存在" }; }))],
  ["把數字當慣例", "NUMBER", () => checkSpec(withSpec((s) => { s.rules[0].by = { from: "convention", why: "通常等 10 秒" }; }))],
  ["假設太多", "TOO_MANY", () => checkSpec(withSpec((s) => { s.rules[0].by = { from: "assumption", question: "新的？", chosen: "是" }; }))],
  ["編號重複", "DUPLICATE", () => checkSpec(withSpec((s) => { s.rules.push(s.rules[0]); }))],
  ["規則例子是空的", "EMPTY", () => checkSpec(withSpec((s) => { s.rules[0].examples[0].then = ""; }))],
  ["內容缺空態", "EMPTY", () => checkSpec(withSpec((s) => { s.contents[0].whenEmpty = ""; }))],
];
for (const [name, code, run] of bad) { test(`擋：${name}`, () => { assert.ok(codes(run()).includes(code), `應該出現 ${code}，實際 ${codes(run()).join(",")}`); }); }

// 照規格寫出來的正確實作（從規格推，只用來確認比對器本身正確；真的實作在 domain）
const ideal = (f: Flow) => (s: string, e: string): Outcome => { const c = cases(f).find((x) => x.from === s && x.event === e); return { to: c?.to ?? s, effects: c?.effects ?? [] }; };
const nothing = (s: string): Outcome => ({ to: s, effects: [] });
test("正確實作全過", () => { for (const f of spec.flows) { assert.deepEqual(compare(f, ideal(f)), []); } });
test("什麼都不做的實作：伺服器的狀態圖至少六成格子抓到", () => {
  for (const f of spec.flows.filter((x) => x.kind === "lifecycle")) {
    const caught = compare(f, nothing).length / cases(f).length;
    assert.ok(caught >= 0.6, `${f.id} 只抓到 ${String(caught)}`);
    assert.ok(Math.abs(caught - strength(f)) < 1e-9);
  }
});
const wrong: readonly (readonly [string, Flow, (s: string, e: string, o: Outcome) => Outcome])[] = [
  ["結束後找真人又恢復", conversation, (s, e, o) => (s === "ended" && e === "asksAgain" ? { ...o, to: "talking" } : o)],
  ["遲到的接起打開已結束的對話", conversation, (s, e, o) => (s === "ended" && e === "accept" ? { to: "talking", effects: ["connect"] } : o)],
  ["結束後的訊息默默丟掉，沒告訴訪客", conversation, (s, e, o) => (s === "ended" && e === "visitorSends" ? { ...o, effects: [] } : o)],
  ["接通了但沒離開等候清單", conversation, (s, e, o) => (s === "waiting" && e === "accept" ? { ...o, effects: ["connect"] } : o)],
  ["離線一下就結束", conversation, (s, e, o) => (s === "waiting" && e === "visitorGone" ? { to: "ended", effects: ["end"] } : o)],
  ["重送變成兩則", message, (s, e, o) => (s === "stored" && e === "arrivesAgain" ? { ...o, effects: ["save", "ack", "tellOther"] } : o)],
  ["收下了卻沒回覆", message, (s, e, o) => (s === "unseen" && e === "arrives" ? { ...o, effects: ["save", "tellOther"] } : o)],
  ["結束後才確認遺失的訊息改判沒送出", message, (s, e, o) => (s === "stored" && e === "arrivesAfterEnd" ? { to: "rejected", effects: ["nack"] } : o)],
  ["斷線期間還在計時", messageMark, (s, e, o) => (s === "sending" && e === "lost" ? { ...o, effects: [] } : o)],
  ["連回沒有自動補送", messageMark, (s, e, o) => (s === "offline" && e === "back" ? { ...o, effects: ["startTimer"] } : o)],
];
for (const [name, f, twist] of wrong) { test(`抓到：${name}`, () => { assert.equal(compare(f, (s, e) => twist(s, e, ideal(f)(s, e))).length, 1); }); }
test("拒絕的格子要求回報拒絕", () => { assert.ok(cases(conversation).some((c) => c.effects.includes(REFUSED))); });
test("差異包含文字", () => { assert.deepEqual(diff(conversation, broken(conversation, (m) => { m.matrix.talking.agentGone.see.visitor = "別的文字"; })), ["talking × agentGone：修改"]); });

const files = new Map([["specs/a.ts", "一\n二\n"], ["specs/b.ts", "x"]]);
const base = freeze("v0.1-b1", files);
const edited = new Map([["specs/a.ts", "改了"], ["specs/c.ts", "新"]]);
const change: Change = { id: "1", from: "v0.1-b1", files: ["specs/a.ts", "specs/b.ts", "specs/c.ts"], why: "漏了空態", role: "測試", into: "v0.1" };
test("沒改就沒有漂移；換行不同不算改", () => { assert.deepEqual(drift(base, new Map([["specs/a.ts", "一\r\n二\r\n"], ["specs/b.ts", "x"]]), []), []); });
test("改、刪、增，沒有異動單 → 擋", () => { assert.equal(drift(base, edited, []).length, 3); });
test("有異動單 → 放行", () => { assert.deepEqual(drift(base, edited, [change]), []); });
test("異動單沒寫原因、對錯基準、漏列檔案 → 擋", () => {
  assert.equal(drift(base, edited, [{ ...change, why: " " }]).length, 3);
  assert.equal(drift(base, edited, [{ ...change, from: "v0.1-b0" }]).length, 3);
  assert.equal(drift(base, edited, [{ ...change, files: ["specs/a.ts"] }]).length, 2);
});
test("三處編號不一致 → 擋", () => { assert.deepEqual(sameBaseline(base, "v0.1-b1", ["v0.1-b1"]), []); assert.equal(sameBaseline(base, "v0.1-b2", [""]).length, 2); });