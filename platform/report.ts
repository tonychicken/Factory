type Listener = (error: unknown) => void;
const listeners = new Set<Listener>();

/** 啟動時登記錯誤要送去哪裡。 */
export function onReport(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function reportError(error: unknown): void {
  for (const l of listeners) { l(error); }
}