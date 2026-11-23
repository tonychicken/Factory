import { expect, it } from "vitest";
import { dayKey, formatTime } from "./time";

it("跨午夜依時區分天", () => {
  expect(dayKey("2026-11-23T16:30:00Z", "Asia/Taipei")).toBe("2026-11-24");
  expect(dayKey("2026-11-23T16:30:00Z", "UTC")).toBe("2026-11-23");
});
it("顯示當地時間", () => {
  expect(formatTime("2026-11-23T16:05:00Z", "Asia/Taipei")).toBe("00:05");
});