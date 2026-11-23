// 演練：對每一道檢查故意放入違規，確認真的會失敗。會暫時改檔案，結束一定還原。工作目錄要乾淨才准跑。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const status = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
if (status.status !== 0 || status.stdout.trim() !== "") { console.log("工作目錄不乾淨，先提交再演練"); process.exit(2); }

const A = "apps/visitor/src";
const naive = `import { useEffect, useState } from "react";
interface Props { onSearch: (query: string) => void }
export function SearchBox({ onSearch }: Props) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(id);
  }, [query, onSearch]);
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
`;
const block = (n) => `export function total${n}(xs: readonly number[]): number {\n  let sum = 0;\n  for (const x of xs) { if (x > 10) { sum += x * 2; } else if (x > 5) { sum += x + 1; } else { sum -= x; } }\n  const half = sum / 2;\n  return half > 100 ? half - 100 : half + 100;\n}\n`;
const edit = (f, a, b) => ({ [f]: (t) => { if (!t.includes(a)) throw new Error(`${f} 找不到 ${a}`); return t.replace(a, b); } });
const drills = [
  ["檔案類型", "放 .js 檔", { [`${A}/evil.js`]: "setTimeout(() => {}, 0);\n" }],
  ["檔案類型", "放 .d.ts", { [`${A}/globals.d.ts`]: "declare function setTimeout(f: () => void): void;\n" }],
  ["檔案類型", "HTML 加行內 script", edit("apps/visitor/index.html", "</body>", "<script>1</script></body>")],
  ["豁免", "過期的豁免", { "factory/rules/exemptions.json": () => JSON.stringify([{ rule: "f/x", file: "a.ts", reason: "r", owner: "o", until: "2020-01-01", recoverWhen: "w" }]) }],
  ["最鬆三層的用量", "platform 多一個 timer", { "platform/extra.ts": "export const later = (f: () => void): void => { setTimeout(f, 1); };\n" }],
  ["最鬆三層的用量", "ui 多一個 effect", edit("ui/message-list.tsx", "  return <div", "  useEffect(() => undefined, []);\n  return <div")],
  ["型別與規則", "183 個 timer 的起點（自然寫法）", { [`${A}/search.tsx`]: naive }],
  ["型別與規則", "apps 用 document", { [`${A}/a.ts`]: "export const t = document.title;\n" }],
  ["型別與規則", "apps 用 setTimeout", { [`${A}/a.ts`]: "export function f(): void { setTimeout(() => undefined, 0); }\n" }],
  ["型別與規則", "apps 引用別的 app", { [`${A}/a.ts`]: 'export { x } from "../../gateway/src/x";\n' }],
  ["型別與規則", "行內關規則", { [`${A}/a.ts`]: "/* eslint-disable */\nexport const n = Math.random();\n" }],
  ["型別與規則", "入口檔多做事", edit(`${A}/main.tsx`, "mount(<App />);", "mount(<App />);\nmount(null);\nString(1);")],
  ["工廠自己的型別", "規格少一格", edit("specs/conversation.ts", 'agentSends: { refuse: "這段對話還沒有接起", by: "accept" },', "")],
  ["引用方向", "工廠引用產品", { "factory/bad.mjs": 'import "../domain/conversation.ts";\n' }],
  ["引用方向", "產品引用規格", { [`${A}/a.ts`]: 'import { spec } from "../../../specs/index.ts";\nexport const s = spec;\n' }],
  ["引用方向", "循環", { "domain/c1.ts": 'import { b } from "./c2";\nexport const a = (): number => b();\n', "domain/c2.ts": 'import { a } from "./c1";\nexport const b = (): number => a();\n' }],
  ["重複碼", "複製一段", { "domain/d1.ts": block(1), "domain/d2.ts": block(2) }],
  ["死碼", "沒人用的檔案", { "factory/unused.mjs": "export const x = 1;\n" }],
  ["樣式", "寫死顏色", { "ui/a.css": ".a { color: #ff0000; }\n" }],
  ["樣式", "用 CSS 延遲", { "ui/a.css": ".a { transition-delay: 500ms; }\n" }],
  ["規格", "狀態往回走", edit("specs/conversation.ts", 'asksAgain: { to: "ended"', 'asksAgain: { to: "waiting"')],
  ["規格", "刪掉先來先服務", edit("specs/rules.ts", 'ref: "v0.1/F2.c"', 'ref: "v0.1/F2.d"')],
  ["工廠與規格的測試", "關掉一條規則", edit("factory/rules/config.mjs", '"f/no-dynamic-key": "error",', "")],
  ["產品的測試", "改壞 retry", edit("platform/clock.ts", "i < times", "i <= times")],
  ["建置", "入口壞掉", edit("apps/visitor/index.html", "/src/main.tsx", "/src/missing.tsx")],
];

const preview = fs.readFileSync("specs/preview.md"); // 規格那一道會重新產生它
let bad = 0;
for (const [step, name, files] of drills) {
  const saved = new Map();
  try {
    for (const [f, v] of Object.entries(files)) {
      saved.set(f, fs.existsSync(f) ? fs.readFileSync(f) : null);
      fs.writeFileSync(f, typeof v === "function" ? v(saved.get(f)?.toString("utf8") ?? "") : v);
    }
    const r = spawnSync(process.execPath, ["factory/check.mjs", step], { encoding: "utf8" });
    const caught = r.status === 1 && r.stdout.includes(`失敗  ${step}`) && !r.stdout.includes("檢查本身出錯");
    if (!caught) bad += 1;
    console.log(`${caught ? "擋下" : "漏掉"}  ${step}：${name}${caught ? "" : `\n${r.stdout.slice(0, 400)}`}`);
  } finally {
    saved.set("specs/preview.md", preview);
    for (const [f, b] of saved) { if (b === null) fs.rmSync(f, { force: true }); else fs.writeFileSync(f, b); }
  }
}
const after = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" }).stdout.trim();
console.log(`\n${drills.length - bad}/${drills.length} 擋下；工作目錄${after === "" ? "已還原" : `沒有還原：\n${after}`}`);
process.exit(bad === 0 && after === "" ? 0 : 1);