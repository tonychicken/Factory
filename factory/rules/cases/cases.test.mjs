import assert from "node:assert/strict";
import { test } from "node:test";
import { cases, lint, prepare } from "./run.mjs";
import { rulesFor } from "../config.mjs";
import { quiet } from "../report.mjs";

for (const [i, c] of cases.entries()) {
  test(`${c.knownGap ? "已知缺口" : c.expect === "block" ? "擋" : "放行"}｜${c.name}`, () => {
    const p = prepare(c, i);
    const items = [...p.types, ...lint(c, p, rulesFor(c.layer, { programs: [p.program] }, c.kind ?? "code"))];
    assert.ok(!items.some((x) => x.fatal), "解析失敗");
    if (c.expect === "allow") { assert.deepEqual(items.map((x) => `${x.line} ${x.rule} ${x.message}`), []); return; }
    // 已知缺口：目前擋不住。哪天擋住了，這裡會失敗，提醒把缺口拿掉
    if (c.knownGap) { assert.equal(items.length, 0, "缺口已補，請移除 knownGap 並更新 03 §6"); return; }
    assert.ok(items.length > 0, "沒有擋下");
    if (c.mustBe) { assert.ok(items.some((x) => x.rule === c.mustBe), `應該由 ${c.mustBe} 擋下`); }
    assert.ok(quiet(items).length > 0, "過濾後沒有任何訊息");
  });
}