// 唯一的總檢查。本機與 CI 都只跑這一支。便宜的先跑；型別或 lint 失敗就不往下。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ESLint } from "eslint";
import { checkFiles } from "./rules/files.mjs";
import { checkExemptions, exempt } from "./rules/exemptions.mjs";
import { quiet } from "./rules/report.mjs";
import { measure, overBudget } from "./scan/budget.mjs";

const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const node = (args) => { const r = spawnSync(process.execPath, args, { encoding: "utf8", env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" } }); return { ok: r.status === 0, text: `${r.stdout}${r.stderr}`.trim() }; };
const bin = (p) => path.join("node_modules", ...p.split("/"));
const SKIP = new Set(["node_modules", ".git", ".types", "dist"]);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (SKIP.has(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name).replaceAll("\\", "/")]));
const CONFIG = /(^|\/)(tsconfig\.json|package\.json)$|\.tsbuildinfo$/;
const all = walk(".").map((p) => p.replace(/^\.\//, ""));
const text = new Map(all.filter((p) => /\.(tsx?|css|html|svg|mjs|json|md)$/.test(p) || /^(apps|contracts|domain|platform|server|data|ui)\//.test(p)).map((p) => [p, fs.readFileSync(p, "utf8")]));
const exemptions = JSON.parse(fs.readFileSync("factory/rules/exemptions.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);

const steps = [
  ["檔案類型", () => checkFiles(new Map([...text].filter(([p]) => !CONFIG.test(p))))],
  ["豁免", () => checkExemptions(exemptions, today)],
  ["最鬆三層的用量", () => overBudget(measure(text), JSON.parse(fs.readFileSync("factory/scan/budget.json", "utf8")))],
  ["型別與規則", async () => {
    const items = new Map();
    const add = (file, x) => items.set(file, [...(items.get(file) ?? []), x]);
    const tsc = node([bin("typescript/bin/tsc"), "-b", "--pretty", "false"]);
    let parsed = 0;
    for (const l of tsc.text.split("\n")) { const m = /^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/.exec(l.trim()); if (m) { parsed += 1; add(m[1].replaceAll("\\", "/"), { line: Number(m[2]), rule: m[3], message: m[4] }); } }
    if (!tsc.ok && parsed === 0) return [tsc.text.slice(0, 500)];
    for (const r of await new ESLint().lintFiles(["."])) {
      const file = path.relative(root, r.filePath).replaceAll("\\", "/");
      for (const m of r.messages) if (!exempt(exemptions, file, m.ruleId ?? "")) add(file, { line: m.line, rule: m.ruleId ?? "eslint", message: m.message });
    }
    return [...items].flatMap(([file, list]) => quiet(list).map((x) => `${file}:${x.line} ${x.rule} ${x.message}`));
  }, "stop"],
  ["工廠自己的型別", () => { const r = node([bin("typescript/bin/tsc"), "-p", "factory/tsconfig.json", "--pretty", "false"]); return r.ok ? [] : r.text.split("\n").slice(0, 10); }],
  ["引用方向", () => { const r = node([bin("dependency-cruiser/bin/dependency-cruiser.mjs"), "--config", ".dependency-cruiser.cjs", "contracts", "domain", "platform", "server", "ui", "apps", "factory", "specs"]); return r.ok ? [] : r.text.split("\n").filter((l) => /error|→/.test(l)); }],
  ["重複碼", () => { const r = node([bin("jscpd/run-jscpd.js"), "contracts", "domain", "platform", "server", "ui", "apps", "factory", "--threshold", "0", "--min-tokens", "50", "--reporters", "console", "--ignore", "**/.types/**,**/*.json,**/*.test.*,**/cases/**"]); return r.ok ? [] : r.text.split("\n").filter((l) => /Clone found|\[\d+:\d+ -|ERROR/.test(l)); }],
  ["死碼", () => { const r = node([bin("knip/bin/knip.js"), "--no-progress"]); return r.ok ? [] : r.text.split("\n").slice(0, 20); }],
  ["樣式", () => { if (!all.some((p) => p.endsWith(".css"))) return []; const r = node([bin("stylelint/bin/stylelint.mjs"), "**/*.css"]); return r.ok ? [] : r.text.split("\n").slice(0, 20); }],
  ["規格", () => { const old = fs.existsSync("specs/preview.md") ? fs.readFileSync("specs/preview.md", "utf8") : ""; const r = node(["specs/render.ts"]); if (!r.ok) return r.text.split("\n"); return fs.readFileSync("specs/preview.md", "utf8") === old.replaceAll("\r\n", "\n") ? [] : ["specs/preview.md 不是最新的（已重新產生，請一起提交）"]; }],
  ["工廠與規格的測試", () => { const files = all.filter((p) => /^(factory|specs)\/.*\.test\.(mjs|ts)$/.test(p)); const r = node(["--test", "--test-reporter=tap", ...files]); return r.ok ? [] : r.text.split("\n").filter((l) => /^not ok/.test(l)).slice(0, 15); }],
  ["產品的測試", () => { const r = node([bin("vitest/vitest.mjs"), "run"]); return r.ok ? [] : r.text.split("\n").filter((l) => /FAIL|Error|×/.test(l)).slice(0, 15); }],
  ["建置", () => { const r = node([bin("vite/bin/vite.js"), "build", "apps/visitor", "--logLevel", "warn"]); return r.ok && r.text === "" ? [] : r.text.split("\n").slice(0, 10); }],
];

// 只跑指定的幾道（給演練用）；不能當成通過總檢查
const only = process.argv.slice(2);
let failed = 0;
const t0 = performance.now();
for (const [name, run, mode] of steps.filter(([n]) => only.length === 0 || only.includes(n))) {
  const t = performance.now();
  let problems;
  try { problems = await run(); } catch (e) { problems = [`檢查本身出錯：${e instanceof Error ? e.message : String(e)}`]; }
  console.log(`${problems.length === 0 ? "通過" : "失敗"}  ${name}  ${Math.round(performance.now() - t)} ms`);
  for (const p of problems) console.log(`      ${p}`);
  if (problems.length > 0) { failed += 1; if (mode === "stop") { console.log("型別或規則沒過，後面不跑"); break; } }
}
console.log(`\n${failed === 0 ? (only.length === 0 ? "全部通過" : "指定的項目通過（不是總檢查）") : `${failed} 項失敗`}，共 ${((performance.now() - t0) / 1000).toFixed(1)} 秒`);
process.exit(failed === 0 ? 0 : 1);