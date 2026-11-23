import { z } from "zod";

/** 訊息格式第 1 版（00 §5 契約 1）。v0.0 只用來證明這一層能被檢查。 */
export const ChatMessage = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  tenant: z.string().min(1),
  seq: z.number().int().nonnegative(),
  text: z.string().min(1).max(2000),
});
export type ChatMessage = z.infer<typeof ChatMessage>;