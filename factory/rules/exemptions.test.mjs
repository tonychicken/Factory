import assert from "node:assert/strict";
import { test } from "node:test";
import { checkExemptions, exempt } from "./exemptions.mjs";

const good = { rule: "f/x", file: "apps/a.ts", reason: "r", owner: "o", until: "2026-12-01", recoverWhen: "w" };
test("合格", () => assert.deepEqual(checkExemptions([good], "2026-11-24"), []));
test("過期 → 擋", () => assert.equal(checkExemptions([good], "2026-12-02").length, 1));
test("缺欄位、萬用字元、日期格式 → 擋", () => {
  assert.equal(checkExemptions([{ ...good, reason: " " }], "2026-11-24").length, 1);
  assert.equal(checkExemptions([{ ...good, file: "apps/**" }], "2026-11-24").length, 1);
  assert.equal(checkExemptions([{ ...good, until: "永遠" }], "2026-11-24").length, 1);
});
test("只豁免指定的檔案與規則", () => {
  assert.equal(exempt([good], "apps/a.ts", "f/x"), true);
  assert.equal(exempt([good], "apps/b.ts", "f/x"), false);
});