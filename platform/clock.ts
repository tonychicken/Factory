export interface Clock {
  readonly now: () => number;
  readonly after: (ms: number, run: () => void) => () => void;
}

/** 整個專案唯一允許出現 setTimeout 的地方。 */
export const systemClock: Clock = {
  now: () => Date.now(),
  after: (ms, run) => {
    const id = setTimeout(run, ms);
    return () => { clearTimeout(id); };
  },
};

export function delay(ms: number, clock: Clock = systemClock): Promise<void> {
  return new Promise((resolve) => { clock.after(ms, resolve); });
}

/** 失敗後等一下再試，等待時間每次加倍。最後一次失敗會往外拋。 */
export async function retry<T>(job: () => Promise<T>, times: number, clock: Clock = systemClock): Promise<T> {
  for (let i = 1; ; i += 1) {
    try {
      return await job();
    } catch (error) {
      if (i >= times) { throw error; }
      await delay(100 * 2 ** (i - 1), clock);
    }
  }
}

export function all<T>(jobs: readonly Promise<T>[]): Promise<readonly T[]> {
  return Promise.all(jobs);
}