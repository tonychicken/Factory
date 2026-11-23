/** v0.0 只放型別與文字，證明這一層能被檢查；狀態轉移屬於 v0.1。 */
export type ConversationState = "waiting" | "talking" | "ended";

const LABEL = { waiting: "等候中", talking: "對話中", ended: "已結束" } as const;

export function label(state: ConversationState): string {
  return LABEL[state];
}