import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { z } from "zod";
import { parseJson, toJson } from "./json";

describe("parseJson", () => {
  it("壞的 JSON 是結果，不是例外", () => {
    expect(parseJson("{", z.string())).toMatchObject({ ok: false, reason: "notJson" });
  });
  it("形狀不對", () => {
    expect(parseJson("1", z.string())).toMatchObject({ ok: false, reason: "wrongShape" });
  });
  it("任何文字都不會丟例外", () => {
    fc.assert(fc.property(fc.string(), (s) => { parseJson(s, z.unknown()); }));
  });
  it("寫出去再讀回來一樣", () => {
    fc.assert(fc.property(fc.string(), (s) => { expect(parseJson(toJson(s), z.string())).toEqual({ ok: true, value: s }); }));
  });
});