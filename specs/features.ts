import { defineFeatures, defineOwnerDecisions } from "../factory/spec/define.ts";

/** v0.1 功能，拆成可判斷的子句（來源：docs/v2/01 §5，負責人 2026-11-24 同意） */
export const features = defineFeatures([
  { id: "v0.1/F1", title: "訪客找真人", clauses: { a: "打開就看得到「找真人」", b: "按下後進入等候" } },
  { id: "v0.1/F2", title: "專員接起", clauses: { a: "專員看到有人在等", b: "按下接起就接通", c: "先來先服務", d: "一次服務一位" } },
  { id: "v0.1/F3", title: "互傳文字", clauses: { a: "雙方互傳文字", b: "兩邊順序一致", c: "不重複" } },
  { id: "v0.1/F4", title: "訊息狀態", clauses: { a: "看得出送出中", b: "看得出已送達", c: "看得出失敗", d: "失敗可以重送" } },
  { id: "v0.1/F5", title: "斷線", clauses: { a: "斷線看得到提示", b: "連回自動補齊" } },
  { id: "v0.1/F6", title: "重新整理", clauses: { a: "重新整理後對話還在" } },
  { id: "v0.1/F7", title: "結束", clauses: { a: "可以結束", b: "結束後只能看" } },
]);

/** 負責人 2026-11-24 在對話中的回答 */
export const owner = defineOwnerDecisions([
  { id: "v0.1/Q1", text: "兩邊都可以結束；訪客要再確認一次", on: "2026-11-24" },
  { id: "v0.1/Q2", text: "同一個分頁看得到；再找真人就是新對話；結束後只能看，不能恢復；資料要留存", on: "2026-11-24" },
  { id: "v0.1/Q3", text: "沒有專員在線用「忙線中」回覆（服務時間與留言在 v0.2）", on: "2026-11-24" },
  { id: "v0.1/Q4", text: "忙線中就排隊（隊號在 v0.2）", on: "2026-11-24" },
  { id: "v0.1/Q5", text: "文案短、親切、用「你」，錯誤一定說下一步", on: "2026-11-24" },
  { id: "forward-only", text: "狀態機不要反覆回頭", on: "2026-11-24" },
]);