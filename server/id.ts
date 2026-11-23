import { randomUUID } from "node:crypto";

/** 伺服器產生編號的唯一地方。HTTP 與長連線在 v0.1 加入（新增依賴要負責人核准）。 */
export function newId(): string {
  return randomUUID();
}