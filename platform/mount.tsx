import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

/** 每個 app 的入口只呼叫這一個函式。 */
export function mount(app: ReactNode): void {
  const root = document.getElementById("root");
  if (root === null) { throw new Error("index.html 缺少 #root"); }
  createRoot(root).render(<StrictMode>{app}</StrictMode>);
}