import { defineFlow } from "../factory/spec/define.ts";

/** 伺服器對一則訊息的真相。只往前走。 */
export const message = defineFlow({
  id: "message.lifecycle", kind: "lifecycle", title: "一則訊息的一生（伺服器）",
  states: { unseen: "伺服器還沒收到", stored: "已存下", rejected: "不收" },
  events: { arrives: "送到，對話進行中", arrivesAgain: "同一編號又送到", arrivesAfterEnd: "送到時對話已結束", badText: "送到，文字不合規定" },
  effects: { save: "存下並編序號", ack: "回覆已收下", tellOther: "送給另一方", nack: "回覆不收與原因" },
  audience: { sender: "送的人", other: "另一方" },
  decisions: {
    delivered: { from: "owner", ref: "v0.1/F4.b" },
    once: { from: "rule", ref: "message.once" },
    truth: { from: "rule", ref: "message.truth" },
    failed: { from: "owner", ref: "v0.1/F4.c" },
    text: { from: "rule", ref: "message.text" },
  },
  initial: "unseen", start: { see: { sender: "訊息立刻出現在最下面", other: "沒有變化" }, by: "delivered" }, ends: ["stored", "rejected"],
  matrix: {
    unseen: {
      arrives: { to: "stored", see: { sender: "標示「已送達」", other: "出現這則訊息" }, effects: ["save", "ack", "tellOther"], by: "delivered" },
      arrivesAgain: { to: "stored", see: { sender: "標示「已送達」", other: "出現這則訊息" }, effects: ["save", "ack", "tellOther"], by: "once" },
      arrivesAfterEnd: { to: "rejected", see: { sender: "標示「對話已結束，這則沒有送出」", other: "沒有變化" }, effects: ["nack"], by: "failed" },
      badText: { to: "rejected", see: { sender: "說明哪裡不合規定", other: "沒有變化" }, effects: ["nack"], by: "text" },
    },
    stored: {
      arrives: { to: "stored", see: { sender: "標示「已送達」", other: "沒有變化" }, effects: ["ack"], by: "once" },
      arrivesAgain: { to: "stored", see: { sender: "標示「已送達」", other: "沒有變化" }, effects: ["ack"], by: "once" },
      arrivesAfterEnd: { to: "stored", see: { sender: "標示「已送達」", other: "沒有變化" }, effects: ["ack"], by: "truth" },
      badText: { refuse: "同一編號已經收過，以第一次為準", by: "once" },
    },
    rejected: {
      arrives: { refuse: "這則已經不收，原因不變", by: "failed" },
      arrivesAgain: { refuse: "這則已經不收，原因不變", by: "failed" },
      arrivesAfterEnd: { refuse: "這則已經不收，原因不變", by: "failed" },
      badText: { refuse: "這則已經不收，原因不變", by: "failed" },
    },
  },
});

/** 送的人畫面上的標示，可以來回。 */
export const messageMark = defineFlow({
  id: "message.mark", kind: "interaction", title: "訊息旁的標示（送的人）",
  states: { sending: "送出中", offline: "等待連線", failed: "沒有送出", delivered: "已送達", refused: "不收" },
  events: { ack: "收到確認", nack: "收到不收", lost: { title: "斷線", back: "back" }, back: "連回", slow: "連線中等了 10 秒沒有回應", resend: "按「重送」" },
  effects: { send: "用同一個編號送出", startTimer: "開始算 10 秒", stopTimer: "停止計時" },
  audience: { sender: "送的人" },
  decisions: {
    sending: { from: "owner", ref: "v0.1/F4.a" },
    resend: { from: "owner", ref: "v0.1/F4.d" },
    catchUp: { from: "owner", ref: "v0.1/F5.b" },
    truth: { from: "rule", ref: "message.truth" },
    ten: { from: "assumption", question: "多久沒回應才顯示「沒有送出」？", chosen: "連線正常時等 10 秒；斷線期間不計時，連回後重新算" },
    ui: { from: "convention", why: "沒有重送按鈕的地方按不到" },
  },
  initial: "sending", start: { see: { sender: "訊息出現在最下面，標示「送出中」" }, by: "sending" }, ends: ["delivered"],
  matrix: {
    sending: {
      ack: { to: "delivered", see: { sender: "「已送達」" }, effects: ["stopTimer"], by: "truth" },
      nack: { to: "refused", see: { sender: "說明原因" }, effects: ["stopTimer"], by: "truth" },
      lost: { to: "offline", see: { sender: "「等待連線」" }, effects: ["stopTimer"], by: "ten" },
      back: { to: "sending", see: { sender: "沒有變化" }, effects: [], by: "catchUp" },
      slow: { to: "failed", see: { sender: "「這則沒有送出，點一下重送」" }, effects: ["stopTimer"], by: "ten" },
      resend: { never: "送出中沒有重送按鈕", by: "ui" },
    },
    offline: {
      ack: { to: "delivered", see: { sender: "「已送達」（補齊時得知）" }, effects: ["stopTimer"], by: "truth" },
      nack: { to: "refused", see: { sender: "說明原因" }, effects: ["stopTimer"], by: "truth" },
      lost: { to: "offline", see: { sender: "沒有變化" }, effects: [], by: "ten" },
      back: { to: "sending", see: { sender: "「送出中」，自動補送" }, effects: ["send", "startTimer"], by: "catchUp" },
      slow: { to: "offline", see: { sender: "沒有變化" }, effects: [], by: "ten" },
      resend: { never: "等待連線時沒有重送按鈕，會自動補送", by: "ui" },
    },
    failed: {
      ack: { to: "delivered", see: { sender: "改為「已送達」" }, effects: ["stopTimer"], by: "truth" },
      nack: { to: "refused", see: { sender: "說明原因" }, effects: ["stopTimer"], by: "truth" },
      lost: { to: "offline", see: { sender: "「等待連線」" }, effects: ["stopTimer"], by: "ten" },
      back: { to: "failed", see: { sender: "沒有變化" }, effects: [], by: "catchUp" },
      slow: { to: "failed", see: { sender: "沒有變化" }, effects: [], by: "ten" },
      resend: { to: "sending", see: { sender: "「送出中」" }, effects: ["send", "startTimer"], by: "resend" },
    },
    delivered: {
      ack: { to: "delivered", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      nack: { to: "delivered", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      lost: { to: "delivered", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      back: { to: "delivered", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      slow: { to: "delivered", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      resend: { never: "已送達沒有重送按鈕", by: "ui" },
    },
    refused: {
      ack: { to: "delivered", see: { sender: "改為「已送達」，以伺服器為準" }, effects: [], by: "truth" },
      nack: { to: "refused", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      lost: { to: "refused", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      back: { to: "refused", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      slow: { to: "refused", see: { sender: "沒有變化" }, effects: [], by: "truth" },
      resend: { never: "不收的訊息沒有重送按鈕，文字可以複製", by: "ui" },
    },
  },
});