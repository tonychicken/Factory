import { defineFlow } from "../factory/spec/define.ts";

const same = { visitor: "沒有變化", agent: "沒有變化" } as const;

/** 伺服器記錄的真相。只往前走。 */
export const conversation = defineFlow({
  id: "conversation.lifecycle", kind: "lifecycle", title: "對話的一生",
  states: { waiting: "等候中", talking: "對話中", ended: "已結束" },
  events: {
    accept: "專員接起", visitorSends: "訪客送訊息", agentSends: "專員送訊息", visitorEnds: "訪客確認結束", agentEnds: "專員結束",
    visitorGone: { title: "訪客離線", back: "visitorBack" }, visitorBack: "訪客連回", visitorLong: "訪客 60 秒沒連回",
    agentGone: { title: "專員離線", back: "agentBack" }, agentBack: "專員連回", asksAgain: "同一分頁再按「找真人」",
  },
  effects: {
    connect: "接通並開始計時", leaveQueue: "離開等候清單", store: "存下訊息", end: "存下結束原因與時間", markGone: "記錄離線", markBack: "記錄連回", newConversation: "開新的對話",
  },
  audience: { visitor: "訪客", agent: "專員" },
  decisions: {
    accept: { from: "owner", ref: "v0.1/F2.b" },
    talk: { from: "owner", ref: "v0.1/F3.a" },
    endable: { from: "owner", ref: "v0.1/F7.a" },
    bothEnd: { from: "owner", ref: "v0.1/Q1" },
    readOnly: { from: "owner", ref: "v0.1/F7.b" },
    newOne: { from: "owner", ref: "v0.1/Q2" },
    once: { from: "rule", ref: "visitor.one" },
    first: { from: "rule", ref: "end.first" },
    presence: { from: "convention", why: "對方離線要看得到，連回要消失" },
    typeEarly: { from: "assumption", question: "等候時訪客可以先打字嗎？", chosen: "可以，專員接起後就看得到" },
    giveUp: { from: "assumption", question: "等候時訪客關掉分頁或斷線，要不要讓出位置？", chosen: "離線滿 60 秒就結束，專員清單移除" },
    stay: { from: "assumption", question: "對話中有一方離線很久，要自動結束嗎？", chosen: "不自動結束。訪客離線滿 60 秒提示專員，由專員決定；專員離線時訪客看到提示並可自己結束" },
  },
  initial: "waiting", start: { see: { visitor: "「忙線中，請稍候」、輸入框、「結束」", agent: "清單最後多一位" }, by: "accept" }, ends: ["ended"],
  matrix: {
    waiting: {
      accept: { to: "talking", see: { visitor: "「已接通」", agent: "「已接通」，以及等候時打的訊息" }, effects: ["connect", "leaveQueue"], by: "accept" },
      visitorSends: { to: "waiting", see: { visitor: "訊息出現，標示「接通後會看到」", agent: "沒有變化" }, effects: ["store"], by: "typeEarly" },
      agentSends: { refuse: "這段對話還沒有接起", by: "accept" },
      visitorEnds: { to: "ended", see: { visitor: "「你已結束對話」，只能看", agent: "清單移除這一位" }, effects: ["end", "leaveQueue"], by: "bothEnd" },
      agentEnds: { refuse: "這段對話還沒有接起", by: "accept" },
      visitorGone: { to: "waiting", see: { visitor: "「連線中斷，正在重試」", agent: "清單標示「離線」，不能接起" }, effects: ["markGone"], by: "presence" },
      visitorBack: { to: "waiting", see: { visitor: "回到原本的等候畫面", agent: "「離線」標示消失" }, effects: ["markBack"], by: "presence" },
      visitorLong: { to: "ended", see: { visitor: "連回後看到「等候已結束」和「再找真人」", agent: "清單移除這一位" }, effects: ["end", "leaveQueue"], by: "giveUp" },
      agentGone: { to: "waiting", see: same, effects: [], by: "presence" },
      agentBack: { to: "waiting", see: same, effects: [], by: "presence" },
      asksAgain: { refuse: "已經在等了，畫面維持等候", by: "once" },
    },
    talking: {
      accept: { refuse: "這一位已經接起", by: "accept" },
      visitorSends: { to: "talking", see: { visitor: "訊息出現並標示已送達", agent: "訊息出現" }, effects: ["store"], by: "talk" },
      agentSends: { to: "talking", see: { visitor: "訊息出現", agent: "訊息出現並標示已送達" }, effects: ["store"], by: "talk" },
      visitorEnds: { to: "ended", see: { visitor: "「你已結束對話」，只能看，可「再找真人」", agent: "「訪客已結束對話」，只能看" }, effects: ["end"], by: "bothEnd" },
      agentEnds: { to: "ended", see: { visitor: "「專員已結束對話」，只能看，可「再找真人」", agent: "「你已結束對話」，只能看" }, effects: ["end"], by: "endable" },
      visitorGone: { to: "talking", see: { visitor: "「連線中斷，正在重試」", agent: "「訪客連線中斷」" }, effects: ["markGone"], by: "presence" },
      visitorBack: { to: "talking", see: { visitor: "提示消失，補齊訊息", agent: "「訪客連線中斷」消失" }, effects: ["markBack"], by: "presence" },
      visitorLong: { to: "talking", see: { visitor: "沒有變化", agent: "「訪客已離開一陣子，要結束嗎？」" }, effects: ["markGone"], by: "stay" },
      agentGone: { to: "talking", see: { visitor: "「專員連線不穩，請稍候」，可以自己結束", agent: "「連線中斷，正在重試」" }, effects: ["markGone"], by: "stay" },
      agentBack: { to: "talking", see: { visitor: "提示消失", agent: "提示消失，補齊訊息" }, effects: ["markBack"], by: "presence" },
      asksAgain: { refuse: "對話進行中，畫面維持對話", by: "once" },
    },
    ended: {
      accept: { refuse: "這段對話已經結束，清單更新", by: "readOnly" },
      visitorSends: { refuse: "對話已結束，這則沒有送出", by: "readOnly" },
      agentSends: { refuse: "對話已結束，這則沒有送出", by: "readOnly" },
      visitorEnds: { refuse: "對話已經結束，結束原因不變", by: "first" },
      agentEnds: { refuse: "對話已經結束，結束原因不變", by: "first" },
      visitorGone: { to: "ended", see: same, effects: [], by: "readOnly" },
      visitorBack: { to: "ended", see: same, effects: [], by: "readOnly" },
      visitorLong: { to: "ended", see: same, effects: [], by: "readOnly" },
      agentGone: { to: "ended", see: same, effects: [], by: "readOnly" },
      agentBack: { to: "ended", see: same, effects: [], by: "readOnly" },
      asksAgain: { to: "ended", see: { visitor: "進入新的等候；舊的內容在上方，只能看", agent: "清單多一位" }, effects: ["newConversation"], by: "newOne" },
    },
  },
});