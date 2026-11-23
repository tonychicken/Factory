import { useCallback, useEffect, useRef } from "react";
import { systemClock, type Clock } from "@f/platform";

/** 停下來 ms 之後才執行。永遠用最新的函式；元件消失時自動取消。 */
export function useDebounced<A extends readonly unknown[]>(fn: (...args: A) => void, ms: number, clock: Clock = systemClock): (...args: A) => void {
  const latest = useRef(fn);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => { latest.current = fn; }, [fn]);
  useEffect(() => () => { cancel.current?.(); }, []);
  return useCallback((...args: A) => {
    cancel.current?.();
    cancel.current = clock.after(ms, () => { latest.current(...args); });
  }, [clock, ms]);
}