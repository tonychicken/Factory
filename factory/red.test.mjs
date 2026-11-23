import assert from "node:assert/strict";
import { test } from "node:test";
import { judge, RED, separate } from "./red.mjs";

const r = (name, ok, reason = "assert") => ({ name, ok, reason });
test("全過、清單空", () => assert.deepEqual(judge([r("a", true)], []), []));
test("在清單裡而且斷言失敗：可以", () => assert.deepEqual(judge([r("a", true), r("b", false)], ["b"]), []));
test("不在清單裡的失敗 → 擋", () => assert.equal(judge([r("a", false)], []).length, 1));
test("清單裡的已經會過 → 要求移除", () => assert.match(judge([r("a", true)], ["a"])[0], /請從清單移除/));
test("清單裡的測試不存在（被刪掉）→ 擋", () => assert.match(judge([], ["a"])[0], /不存在/));
test("跑不起來不算先失敗 → 擋", () => assert.match(judge([r("a", false, "crash")], ["a"])[0], /跑不起來/));
test("重複 → 擋", () => assert.equal(judge([r("a", false)], ["a", "a"]).length, 1));
test("同一次提交改驗收測試與產品碼 → 擋", () => assert.equal(separate(["acceptance/a.test.ts", "domain/x.ts"], [], []).length, 1));
test("只改驗收測試、加長清單：可以", () => assert.deepEqual(separate(["acceptance/a.test.ts", RED], [], ["a"]), []));
test("改產品碼、縮短清單：可以", () => assert.deepEqual(separate(["domain/x.ts", RED], ["a", "b"], ["a"]), []));
test("改產品碼卻加長清單 → 擋", () => assert.equal(separate(["domain/x.ts", RED], [], ["a"]).length, 1));