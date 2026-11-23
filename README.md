# factory-lab

AI 工程工廠 v0.0：只有規則，沒有產品功能。規劃文件在上一層的 `docs/v2/`。

| 指令 | 做什麼 | 時間 |
|---|---|---|
| `npm run check` | 總檢查，14 道 | 約 16 秒 |
| `npm run drill` | 演練：故意放入 29 種違規，確認每一道都會擋 | 約 1 分鐘 |
| `npm run rules:prove` | 規則突變：逐條關掉規則，看有沒有案例會發現 | 約 1 分鐘 |
| `npm run spec` | 檢查規格並產生 `specs/preview.md` | 1 秒 |

第一次使用：`npm install`，然後 `git config core.hooksPath factory/hooks`（提交前自動檢查）。