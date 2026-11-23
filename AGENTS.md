# AGENTS.md

只放機器擋不住的事。其他規則看 `npm run check` 的訊息。

- 開始前：`npm run check` 要全過。結束前：也要全過。
- 卡住就停。同一個檢查連續失敗 3 次，寫下原因，不要換方法硬闖，不要改規則來通過。
- 需要的元件或函式不存在，先提出來，不要自己在 apps 裡做。
- 不准改（要負責人核准）：`factory/`、`specs/`、`.npmrc`、`package.json`、`package-lock.json`、`tsconfig*`、`eslint.config.mjs`、`.dependency-cruiser.cjs`。
- 新增依賴是閘門。
- 不寫驗收測試又寫產品碼：出題和作答要分開。
- 一個階段一個 commit，寫清楚做了什麼、為什麼、怎麼驗證、還有什麼沒做。

| 要做什麼 | 用什麼 |
|---|---|
| 輸入停下來才做事 | `@f/ui` 的 `useDebounced` |
| 捲到最新訊息 | `@f/ui` 的 `MessageList` |
| 重試 | `@f/platform` 的 `retry` |
| 讀外部文字 | `@f/platform` 的 `parseJson` |
| 顯示時間、分日期 | `@f/platform` 的 `formatTime`、`dayKey` |
| 回報錯誤 | `@f/platform` 的 `reportError` |