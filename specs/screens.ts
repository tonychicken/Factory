import { defineFlow } from "../factory/spec/define.ts";

export const connection = defineFlow({
  id: "screen.connection", kind: "interaction", title: "自己的連線提示",
  states: { catchingUp: "補齊中", online: "已連線", offline: "已斷線" },
  events: { lost: { title: "斷線", back: "back" }, back: "連回", caughtUp: "補齊完成", stuck: "補齊超時", reload: "重新整理" },
  effects: { request: "要求補齊", retry: "安排重試", clear: "清除提示" },
  audience: { me: "自己" },
  decisions: { tip: { from: "owner", ref: "v0.1/F5.a" }, catchUp: { from: "owner", ref: "v0.1/F5.b" }, reload: { from: "rule", ref: "screen.reload" } },
  initial: "catchingUp", start: { see: { me: "「正在補齊訊息」" }, by: "catchUp" },
  matrix: {
    catchingUp: {
      lost: { to: "offline", see: { me: "「連線中斷，正在重試」，仍可打字" }, effects: ["retry"], by: "tip" },
      back: { to: "catchingUp", see: { me: "沒有變化" }, effects: [], by: "catchUp" },
      caughtUp: { to: "online", see: { me: "提示消失，順序與另一邊相同；原本在最底就捲到底，否則停在原處並提示有新訊息" }, effects: ["clear"], by: "catchUp" },
      stuck: { to: "offline", see: { me: "「連線中斷，正在重試」" }, effects: ["retry"], by: "tip" },
      reload: { to: "catchingUp", see: { me: "先顯示本機留著的內容，再補齊" }, effects: ["request"], by: "reload" },
    },
    online: {
      lost: { to: "offline", see: { me: "「連線中斷，正在重試」，仍可打字" }, effects: ["retry"], by: "tip" },
      back: { to: "online", see: { me: "沒有變化" }, effects: [], by: "catchUp" },
      caughtUp: { to: "online", see: { me: "沒有變化" }, effects: [], by: "catchUp" },
      stuck: { to: "online", see: { me: "沒有變化" }, effects: [], by: "catchUp" },
      reload: { to: "catchingUp", see: { me: "先顯示本機留著的內容，再補齊" }, effects: ["request"], by: "reload" },
    },
    offline: {
      lost: { to: "offline", see: { me: "沒有變化" }, effects: [], by: "tip" },
      back: { to: "catchingUp", see: { me: "「正在補齊訊息」" }, effects: ["request"], by: "catchUp" },
      caughtUp: { to: "offline", see: { me: "沒有變化" }, effects: [], by: "catchUp" },
      stuck: { to: "offline", see: { me: "沒有變化" }, effects: [], by: "catchUp" },
      reload: { to: "offline", see: { me: "本機留著的內容，加上「連線中斷，正在重試」" }, effects: ["retry"], by: "reload" },
    },
  },
});

export const visitorScreen = defineFlow({
  id: "screen.visitor", kind: "interaction", title: "訪客的畫面",
  states: { welcome: "還沒開始", asking: "正在找真人", inside: "等候或對話", confirm: "確認要不要結束", closed: "已結束" },
  events: { ask: "按「找真人」", joined: "伺服器收下", failed: "收不下或連不上", tapEnd: "按「結束」", cancel: "按「取消」", confirmEnd: "按「確定結束」", ended: "對話結束了", reload: "重新整理" },
  effects: { requestJoin: "要求找真人", requestEnd: "要求結束", restore: "還原畫面" },
  audience: { visitor: "訪客" },
  decisions: {
    start: { from: "owner", ref: "v0.1/F1.a" }, wait: { from: "owner", ref: "v0.1/F1.b" }, confirm: { from: "owner", ref: "v0.1/Q1" },
    readOnly: { from: "owner", ref: "v0.1/F7.b" }, reload: { from: "rule", ref: "screen.reload" }, once: { from: "rule", ref: "visitor.one" }, ui: { from: "convention", why: "按鈕不在這個畫面上" },
  },
  initial: "welcome", start: { see: { visitor: "「你好，有問題可以問我們」和「找真人」" }, by: "start" },
  matrix: {
    welcome: {
      ask: { to: "asking", see: { visitor: "按鈕變成「正在找人…」，不能再按" }, effects: ["requestJoin"], by: "start" },
      joined: { to: "welcome", see: { visitor: "沒有變化" }, effects: [], by: "once" }, failed: { to: "welcome", see: { visitor: "沒有變化" }, effects: [], by: "once" },
      tapEnd: { never: "沒有結束按鈕", by: "ui" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" }, ended: { to: "welcome", see: { visitor: "沒有變化" }, effects: [], by: "readOnly" },
      reload: { to: "welcome", see: { visitor: "同一個開場畫面" }, effects: ["restore"], by: "reload" },
    },
    asking: {
      ask: { to: "asking", see: { visitor: "沒有變化" }, effects: [], by: "once" }, joined: { to: "inside", see: { visitor: "「忙線中，請稍候」、輸入框、「結束」" }, effects: ["restore"], by: "wait" },
      failed: { to: "welcome", see: { visitor: "「現在連不上，請再試一次」" }, effects: ["restore"], by: "start" },
      tapEnd: { never: "還沒有結束按鈕", by: "ui" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" }, ended: { to: "closed", see: { visitor: "「對話已結束」和「再找真人」" }, effects: ["restore"], by: "readOnly" },
      reload: { to: "asking", see: { visitor: "「正在找人…」，用同一個要求再問一次" }, effects: ["requestJoin"], by: "reload" },
    },
    inside: {
      ask: { never: "沒有找真人按鈕", by: "ui" }, joined: { to: "inside", see: { visitor: "沒有變化" }, effects: [], by: "once" }, failed: { to: "inside", see: { visitor: "沒有變化" }, effects: [], by: "once" },
      tapEnd: { to: "confirm", see: { visitor: "「要結束這次對話嗎？結束後只能看」" }, effects: ["restore"], by: "confirm" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" },
      ended: { to: "closed", see: { visitor: "結束原因、內容只能看、「再找真人」；輸入框移除，草稿留著可複製" }, effects: ["restore"], by: "readOnly" },
      reload: { to: "inside", see: { visitor: "原本的內容與草稿" }, effects: ["restore"], by: "reload" },
    },
    confirm: {
      ask: { never: "被確認框蓋住", by: "ui" }, joined: { to: "confirm", see: { visitor: "沒有變化" }, effects: [], by: "once" }, failed: { to: "inside", see: { visitor: "「沒有結束成功，請再試一次」" }, effects: ["restore"], by: "confirm" },
      tapEnd: { never: "被確認框蓋住", by: "ui" }, cancel: { to: "inside", see: { visitor: "回到對話" }, effects: ["restore"], by: "confirm" }, confirmEnd: { to: "confirm", see: { visitor: "「結束中…」，不能再按" }, effects: ["requestEnd"], by: "confirm" },
      ended: { to: "closed", see: { visitor: "確認框消失，顯示結束原因" }, effects: ["restore"], by: "readOnly" }, reload: { to: "inside", see: { visitor: "回到對話，確認框不保留" }, effects: ["restore"], by: "reload" },
    },
    closed: {
      ask: { to: "asking", see: { visitor: "「正在找人…」；舊內容在上方，只能看" }, effects: ["requestJoin"], by: "wait" }, joined: { to: "closed", see: { visitor: "沒有變化" }, effects: [], by: "once" }, failed: { to: "closed", see: { visitor: "沒有變化" }, effects: [], by: "once" },
      tapEnd: { never: "沒有結束按鈕", by: "ui" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" }, ended: { to: "closed", see: { visitor: "沒有變化" }, effects: [], by: "readOnly" },
      reload: { to: "closed", see: { visitor: "同樣的內容，只能看" }, effects: ["restore"], by: "reload" },
    },
  },
});

export const deskScreen = defineFlow({
  id: "screen.desk", kind: "interaction", title: "專員的畫面",
  states: { list: "清單", accepting: "接起中", talking: "對話中", review: "剛結束，只能看" },
  events: { tapAccept: "按「接起」", accepted: "接起成功", refused: "接起被拒絕", tapEnd: "按「結束」", ended: "對話結束了", tapBack: "按「回到清單」", reload: "重新整理" },
  effects: { requestAccept: "要求接起", requestEnd: "要求結束", restore: "還原畫面" },
  audience: { agent: "專員" },
  decisions: {
    list: { from: "owner", ref: "v0.1/F2.a" }, accept: { from: "owner", ref: "v0.1/F2.b" }, one: { from: "rule", ref: "queue.capacity" }, end: { from: "owner", ref: "v0.1/F7.a" },
    review: { from: "assumption", question: "對話結束後，專員還看得到內容嗎？", chosen: "停在那一段只能看，按「回到清單」才離開；v0.1 沒有歷史清單" },
    reload: { from: "rule", ref: "screen.reload" }, ui: { from: "convention", why: "按鈕不在這個畫面上" },
  },
  initial: "list", start: { see: { agent: "等候清單；沒有人時「目前沒有人在等」" }, by: "list" },
  matrix: {
    list: {
      tapAccept: { to: "accepting", see: { agent: "按鈕變成「接起中…」，不能再按" }, effects: ["requestAccept"], by: "accept" }, accepted: { to: "talking", see: { agent: "另一個視窗接起了，這裡也進入對話" }, effects: ["restore"], by: "one" }, refused: { to: "list", see: { agent: "沒有變化" }, effects: [], by: "list" },
      tapEnd: { never: "清單沒有結束按鈕", by: "ui" }, ended: { to: "list", see: { agent: "沒有變化" }, effects: [], by: "list" }, tapBack: { never: "已經在清單", by: "ui" }, reload: { to: "list", see: { agent: "重新取得清單" }, effects: ["restore"], by: "reload" },
    },
    accepting: {
      tapAccept: { to: "accepting", see: { agent: "沒有變化" }, effects: [], by: "one" }, accepted: { to: "talking", see: { agent: "「已接通」、等候時的訊息、輸入框、「結束」" }, effects: ["restore"], by: "accept" }, refused: { to: "list", see: { agent: "「這一位已經離開」或「你正在服務另一位」，清單更新" }, effects: ["restore"], by: "one" },
      tapEnd: { never: "還沒有結束按鈕", by: "ui" }, ended: { to: "list", see: { agent: "「這一位已經離開」，清單更新" }, effects: ["restore"], by: "list" }, tapBack: { never: "沒有回清單按鈕", by: "ui" }, reload: { to: "list", see: { agent: "以伺服器為準：接起成功就直接進入對話" }, effects: ["restore"], by: "reload" },
    },
    talking: {
      tapAccept: { never: "對話中沒有接起按鈕", by: "ui" }, accepted: { to: "talking", see: { agent: "沒有變化" }, effects: [], by: "one" }, refused: { to: "talking", see: { agent: "沒有變化" }, effects: [], by: "one" },
      tapEnd: { to: "talking", see: { agent: "「結束中…」，不能再按" }, effects: ["requestEnd"], by: "end" }, ended: { to: "review", see: { agent: "結束原因、內容只能看、「回到清單」" }, effects: ["restore"], by: "review" }, tapBack: { never: "對話中沒有回清單按鈕", by: "ui" }, reload: { to: "talking", see: { agent: "原本的內容與草稿" }, effects: ["restore"], by: "reload" },
    },
    review: {
      tapAccept: { never: "這個畫面沒有接起按鈕", by: "ui" }, accepted: { to: "talking", see: { agent: "另一個視窗接起了，這裡也進入對話" }, effects: ["restore"], by: "one" }, refused: { to: "review", see: { agent: "沒有變化" }, effects: [], by: "one" },
      tapEnd: { never: "已經結束，沒有結束按鈕", by: "ui" }, ended: { to: "review", see: { agent: "沒有變化" }, effects: [], by: "review" }, tapBack: { to: "list", see: { agent: "清單" }, effects: ["restore"], by: "review" }, reload: { to: "review", see: { agent: "同樣的內容，只能看" }, effects: ["restore"], by: "reload" },
    },
  },
});