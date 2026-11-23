// 給負責人看的中文版。產物，不准手改。
import { assumptions, checkSpec, eventTitle, row, strength } from "./check.ts";
import type { Decision, Flow, Spec } from "./define.ts";

const from = (d: Decision): string => (d.from === "owner" ? d.ref : d.from === "rule" ? d.ref : d.from === "convention" ? "慣例" : "**假設**");

function flowText(flow: Flow): string {
  const who = Object.entries(flow.audience);
  const parts = Object.entries(flow.states).map(([s, title]) => {
    const rows = row(flow, s).flatMap(([e, c]) => {
      const src = from(flow.decisions[c.by] ?? { from: "convention", why: "" });
      if ("to" in c) {
        const to = c.to === s ? "不變" : `→ ${flow.states[c.to] ?? c.to}`;
        return [`| ${eventTitle(flow, e)} | ${to} | ${who.map(([k]) => c.see[k] ?? "").join(" | ")}${c.temporary === undefined ? "" : "（暫行）"} | ${src} |`];
      }
      return "refuse" in c ? [`| ${eventTitle(flow, e)} | 拒絕 | ${who.map((_, i) => (i === 0 ? `只有送出請求的人看到：${c.refuse}` : "沒有變化")).join(" | ")} | ${src} |`] : [];
    });
    const never = row(flow, s).flatMap(([e, c]) => ("never" in c ? [`${eventTitle(flow, e)}（${c.never}）`] : []));
    return [`### ${title}`, "", `| 發生 | 狀態 | ${who.map(([, t]) => `${t}看到`).join(" | ")} | 誰決定 |`, `|---|---|${who.map(() => "---").join("|")}|---|`, ...rows, ...(never.length > 0 ? ["", `不會發生：${never.join("；")}`] : []), ""].join("\n");
  });
  return [`## ${flow.title}`, "", flow.kind === "lifecycle" ? `只往前走；什麼都不做的實作會被 ${String(Math.round(strength(flow) * 100))}% 的格子抓到。` : "畫面狀態，可以來回。", "", `一開始：${who.map(([k, t]) => `${t}看到${flow.start.see[k] ?? ""}`).join("；")}`, "", ...parts].join("\n");
}

export function render(title: string, spec: Spec): string {
  const problems = checkSpec(spec);
  const asked = assumptions(spec);
  return [
  `# ${title}（由規格自動產生，不要手改）`, "",
  `檢查結果：${problems.length === 0 ? "全過" : problems.map((p) => `${p.where} ${p.message}`).join("；")}`, "",
  "## 等負責人決定的假設", "", "| # | 問題 | 目前選 |", "|---|---|---|", ...asked.map((a, i) => `| S${String(i + 1)} | ${a.question} | ${a.chosen} |`), "",
  "## 業務規則", "", "| 規則 | 內容 | 例子 | 誰決定 |", "|---|---|---|---|",
  ...spec.rules.map((r) => `| ${r.title} | ${r.statement} | ${r.examples.map((x) => `${x.given} → ${x.then}`).join("<br>")} | ${from(r.by)} |`), "",
  "## 內容從哪來", "", "| 內容 | 維護者 | 更新 | 沒有內容時 | 出錯時 |", "|---|---|---|---|---|",
  ...spec.contents.map((c) => `| ${c.title} | ${c.maintainer} | ${c.refresh} | ${c.whenEmpty} | ${c.whenError} |`), "",
  ...spec.flows.map(flowText),
].join("\n");
}
