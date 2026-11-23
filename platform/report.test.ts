import { expect, it } from "vitest";
import { onReport, reportError } from "./report";

it("登記後收得到，取消後收不到", () => {
  const got: unknown[] = [];
  const off = onReport((e) => { got.push(e); });
  reportError("a");
  off();
  reportError("b");
  expect(got).toEqual(["a"]);
});