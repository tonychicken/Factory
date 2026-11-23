import { expect, it } from "vitest";
import { ChatMessage } from "./message";

const good = { v: 1, id: "m1", tenant: "t1", seq: 0, text: "你好" };

it("合格的訊息", () => { expect(ChatMessage.safeParse(good).success).toBe(true); });
it("沒有租戶、空白文字、負的序號都不收", () => {
  expect(ChatMessage.safeParse({ ...good, tenant: "" }).success).toBe(false);
  expect(ChatMessage.safeParse({ ...good, text: "" }).success).toBe(false);
  expect(ChatMessage.safeParse({ ...good, seq: -1 }).success).toBe(false);
});