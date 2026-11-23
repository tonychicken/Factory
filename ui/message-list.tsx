import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  readonly label: string;
  readonly count: number;
  readonly children: ReactNode;
}

/** 有新訊息時捲到底。產品程式不用知道怎麼捲。 */
export function MessageList({ label, count, children }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [count]);
  return <div role="log" aria-label={label}>{children}<div ref={end} /></div>;
}