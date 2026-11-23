import { expect, it } from "vitest";
import { label } from "./conversation";

it("每個狀態都有中文", () => {
  expect(label("waiting")).toBe("等候中");
  expect(label("talking")).toBe("對話中");
  expect(label("ended")).toBe("已結束");
});