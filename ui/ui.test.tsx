// @vitest-environment jsdom
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { onReport, type Clock } from "@f/platform";
import { Button, MessageList, TextField, useDebounced } from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Element.prototype.scrollIntoView = () => { scrolled += 1; };
  scrolled = 0;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => { act(() => { root.unmount(); }); host.remove(); });
let scrolled = 0;

function fakeClock() {
  const jobs: { run: () => void; live: boolean }[] = [];
  const clock: Clock = { now: () => 0, after: (_ms, run) => { const j = { run, live: true }; jobs.push(j); return () => { j.live = false; }; } };
  return { clock, fire: () => { for (const j of jobs.splice(0)) { if (j.live) { j.run(); } } } };
}

it("Button：非同步失敗會回報，不會變成沒人接的錯誤", async () => {
  const got: unknown[] = [];
  const off = onReport((e) => { got.push(e); });
  act(() => { root.render(<Button onPress={() => Promise.reject(new Error("斷線"))}>送出</Button>); });
  await act(async () => { host.querySelector("button")?.click(); await Promise.resolve(); });
  off();
  expect(got).toHaveLength(1);
});

it("TextField：回傳文字而不是事件", () => {
  const seen: string[] = [];
  act(() => { root.render(<TextField label="訊息" value="" onChange={(v) => { seen.push(v); }} />); });
  const input = host.querySelector("input");
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "你好");
    input?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(seen).toEqual(["你好"]);
});

it("MessageList：數量變了才捲到底", () => {
  const show = (n: number) => { act(() => { root.render(<MessageList label="對話" count={n}>{n}</MessageList>); }); };
  show(1);
  const first = scrolled;
  show(1);
  expect(scrolled).toBe(first);
  show(2);
  expect(scrolled).toBe(first + 1);
});

it("useDebounced：只執行最後一次、用最新的函式、消失時取消（StrictMode 下）", () => {
  const { clock, fire } = fakeClock();
  const calls: string[] = [];
  let press: (v: string) => void = () => undefined;
  let rename: (v: string) => void = () => undefined;
  function Probe() {
    const [name, setName] = useState("舊");
    rename = setName;
    press = useDebounced((v: string) => { calls.push(`${name}:${v}`); }, 300, clock);
    return null;
  }
  act(() => { root.render(<StrictMode><Probe /></StrictMode>); });
  press("a"); press("b");
  act(() => { rename("新"); });
  fire();
  expect(calls).toEqual(["新:b"]);
  press("c");
  act(() => { root.render(null); });
  fire();
  expect(calls).toEqual(["新:b"]);
});