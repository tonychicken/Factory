import type { ReactNode } from "react";
import { reportError } from "@f/platform";

interface Props {
  readonly onPress: () => void | Promise<void>;
  readonly children: ReactNode;
}

/** 錯誤統一回報，產品程式不用自己接。 */
export function Button({ onPress, children }: Props) {
  const run = async (): Promise<void> => {
    try { await onPress(); } catch (error) { reportError(error); }
  };
  return <button type="button" onClick={() => { run().catch(reportError); }}>{children}</button>;
}