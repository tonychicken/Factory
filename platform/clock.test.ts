import { expect, it } from "vitest";
import { retry, type Clock } from "./clock";

function fakeClock(): { readonly clock: Clock; readonly waits: number[] } {
  const waits: number[] = [];
  return { waits, clock: { now: () => 0, after: (ms, run) => { waits.push(ms); run(); return () => undefined; } } };
}

it("成功就不再試", async () => {
  const { clock, waits } = fakeClock();
  expect(await retry(() => Promise.resolve(1), 3, clock)).toBe(1);
  expect(waits).toEqual([]);
});
it("失敗兩次後成功，等待加倍", async () => {
  const { clock, waits } = fakeClock();
  let n = 0;
  const job = (): Promise<string> => { n += 1; return n < 3 ? Promise.reject(new Error("x")) : Promise.resolve("ok"); };
  expect(await retry(job, 3, clock)).toBe("ok");
  expect(waits).toEqual([100, 200]);
});
it("次數用完就往外拋", async () => {
  const { clock, waits } = fakeClock();
  await expect(retry(() => Promise.reject(new Error("壞了")), 2, clock)).rejects.toThrow("壞了");
  expect(waits).toEqual([100]);
});