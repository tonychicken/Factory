// 驗收測試先寫、先失敗，又不讓主線變紅：
//   預期失敗清單（acceptance/expected-red.json）裡的測試必須真的失敗；其他測試必須全過。
//   清單只有「只改驗收測試」的提交可以加長；版本收尾時必須清空。
//   同一次提交不准同時改驗收測試與產品碼（出題和作答分開）。
const ACCEPT = /^acceptance\//;
const PRODUCT = /^(apps|contracts|domain|platform|server|data|ui)\//;
export const RED = "acceptance/expected-red.json";

/** results：[{ name, ok, reason }]。reason 是失敗原因：assert（斷言失敗）或 crash（連跑都跑不起來） */
export function judge(results, red) {
  const out = [];
  const byName = new Map(results.map((r) => [r.name, r]));
  for (const r of results) if (!r.ok && !red.includes(r.name)) out.push(`失敗：${r.name}`);
  for (const n of red) {
    const r = byName.get(n);
    if (r === undefined) out.push(`清單裡的測試不存在：${n}`);
    else if (r.ok) out.push(`已經會過了，請從清單移除：${n}`);
    else if (r.reason !== "assert") out.push(`不是斷言失敗，而是跑不起來，不算先失敗：${n}`);
  }
  if (new Set(red).size !== red.length) out.push("清單有重複");
  return out;
}

/** changed：這次提交改到的檔案；before、after：清單改動前後 */
export function separate(changed, before, after) {
  const out = [];
  const tests = changed.filter((f) => ACCEPT.test(f) && f !== RED);
  const product = changed.filter((f) => PRODUCT.test(f));
  if (tests.length > 0 && product.length > 0) out.push(`同一次提交同時改了驗收測試（${tests[0]}）與產品碼（${product[0]}），請分開`);
  const added = after.filter((n) => !before.includes(n));
  if (added.length > 0 && product.length > 0) out.push(`改產品碼的提交不准加長預期失敗清單：${added.join("、")}`);
  return out;
}

/** 把 vitest 的 JSON 結果轉成 judge 要的樣子 */
export function fromVitest(json) {
  return json.testResults.flatMap((f) =>
    f.assertionResults.length === 0 && f.status === "failed"
      ? [{ name: `${f.name}（整個檔案）`, ok: false, reason: "crash" }]
      : f.assertionResults.map((t) => ({ name: t.fullName, ok: t.status === "passed", reason: /AssertionError/.test(t.failureMessages?.join("\n") ?? "") ? "assert" : "crash" })));
}