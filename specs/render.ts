// 產生給負責人看的 preview.md，並回報規格問題
import { writeFileSync } from "node:fs";
import { assumptions, checkSpec } from "../factory/spec/check.ts";
import { render } from "../factory/spec/render.ts";
import { spec } from "./index.ts";

const problems = checkSpec(spec);
writeFileSync(new URL("./preview.md", import.meta.url), render("v0.1 規格預覽", spec));
console.log(`問題 ${String(problems.length)}，假設 ${String(assumptions(spec).length)}`);
for (const p of problems) { console.log(`${p.code} ${p.where}：${p.message}`); }
process.exitCode = problems.length === 0 ? 0 : 1;