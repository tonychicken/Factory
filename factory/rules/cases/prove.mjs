// 規則突變：逐條關掉，看有沒有案例會發現。沒人發現的規則等於沒有測試（07 §5）
import { cases, lint, prepare } from "./run.mjs";
import { rulesFor } from "../config.mjs";

const prepared = cases.map((c, i) => ({ c, p: prepare(c, i) })).filter(({ c }) => c.expect === "block" && !c.knownGap);
const base = (c, p) => rulesFor(c.layer, { programs: [p.program] }, c.kind ?? "code");
const now = prepared.map(({ c, p }) => ({ c, p, config: base(c, p), items: lint(c, p, base(c, p)) }));
const key = (m) => `${m.rule}|${m.message}`;
const targets = new Map();
for (const { config } of now) for (const x of config) for (const [rule, v] of Object.entries(x.rules ?? {})) {
  if (v === "off" || v === 0) continue;
  if (rule === "no-restricted-syntax" || rule === "no-restricted-properties") for (const o of v.slice(1)) targets.set(`${rule}|${o.selector ?? `${o.object ?? "*"}.${o.property}`}`, { rule, pick: JSON.stringify(o) });
  else if (/^(f|e)\//.test(rule) || /^no-(eval|unsafe-finally|empty-function)$/.test(rule) || /^no-unsanitized/.test(rule)) targets.set(rule, { rule });
}
// 突變後：只要有一個案例「完全沒有東西擋它」，就算被發現（殺死）；訊息變少但仍被別條擋住，算「有重疊」
const out = { killed: [], overlap: [], silent: [] };
for (const [name, t] of targets) {
  let killed = false, touched = false;
  for (const { c, p, config, items } of now) {
    if (!items.some((m) => m.rule === t.rule)) continue;
    const mutated = config.map((x) => {
      if (!x.rules?.[t.rule]) return x;
      const v = x.rules[t.rule];
      return { ...x, rules: { ...x.rules, [t.rule]: t.pick ? [v[0], ...v.slice(1).filter((o) => JSON.stringify(o) !== t.pick)] : "off" } };
    });
    const after = lint(c, p, mutated);
    if (after.length < items.length) touched = true;
    if (after.length + p.types.length === 0) { killed = true; break; }
  }
  (killed ? out.killed : touched ? out.overlap : out.silent).push(name);
}
console.log(`規則 ${targets.size} 條：關掉會被案例發現 ${out.killed.length}，有其他規則重疊 ${out.overlap.length}，沒有任何案例碰到 ${out.silent.length}`);
console.log("\n沒有案例：\n" + out.silent.map((x) => "  " + x).join("\n"));
console.log("\n重疊：\n" + out.overlap.map((x) => "  " + x).join("\n"));