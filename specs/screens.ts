import { defineFlow } from "../factory/spec/define.ts";

export const connection = defineFlow({
  id: "screen.connection", kind: "interaction", title: "自己的連線提示",
  states: { catchingUp: "補齊中", online: "已連線", offline: "已斷線" },
  events: { lost: { title: "斷線", back: "back" }, back: "連回", caughtUp: "補齊完成", stuck: "補齊超時", reload: "重新整理" },
  effects: { request: "要求補齊", retry: "重新連線後再補齊", clear: "清除提示" },
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

const still = { visitor: "沒有變化" } as const;

export const visitorScreen = defineFlow({
  id: "screen.visitor", kind: "interaction", title: "訪客的畫面",
  states: { welcome: "還沒開始", asking: "正在找真人", inside: "等候或對話", confirm: "確認要不要結束", ending: "結束中", closed: "已結束", reasking: "再找真人中" },
  events: { ask: "按「找真人」", joined: "伺服器收下找真人", failed: "收不下或連不上", tapEnd: "按「結束」", cancel: "按「取消」", confirmEnd: "按「確定結束」", ended: "對話結束了", reload: "重新整理" },
  effects: { requestJoin: "要求找真人（同一個要求編號）", requestEnd: "要求結束", restore: "還原畫面" },
  audience: { visitor: "訪客" },
  decisions: {
    start: { from: "owner", ref: "v0.1/F1.a" }, wait: { from: "owner", ref: "v0.1/F1.b" }, confirm: { from: "owner", ref: "v0.1/Q1" },
    readOnly: { from: "owner", ref: "v0.1/F7.b" }, reload: { from: "rule", ref: "screen.reload" }, once: { from: "rule", ref: "visitor.one" }, ui: { from: "convention", why: "按鈕不在這個畫面上" },
  },
  initial: "welcome", start: { see: { visitor: "「你好，有問題可以問我們」和「找真人」" }, by: "start" },
  matrix: {
    welcome: {
      ask: { to: "asking", see: { visitor: "按鈕變成「正在找人…」，不能再按" }, effects: ["requestJoin"], by: "start" },
      joined: { to: "inside", see: { visitor: "晚到的確認：進入等候畫面" }, effects: ["restore"], by: "once" }, failed: { to: "welcome", see: still, effects: [], by: "once" },
      tapEnd: { never: "沒有結束按鈕", by: "ui" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" }, ended: { to: "welcome", see: still, effects: [], by: "readOnly" },
      reload: { to: "welcome", see: { visitor: "以伺服器為準：已經在等就直接進入等候" }, effects: ["restore"], by: "reload" },
    },
    asking: {
      ask: { to: "asking", see: still, effects: [], by: "once" }, joined: { to: "inside", see: { visitor: "「忙線中，請稍候」、輸入框、「結束」" }, effects: ["restore"], by: "wait" },
      failed: { to: "welcome", see: { visitor: "「現在連不上，請再試一次」" }, effects: ["restore"], by: "start" },
      tapEnd: { never: "還沒有結束按鈕", by: "ui" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" }, ended: { to: "closed", see: { visitor: "「對話已結束」和「再找真人」" }, effects: ["restore"], by: "readOnly" },
      reload: { to: "asking", see: { visitor: "「正在找人…」，用同一個要求再問一次" }, effects: ["requestJoin"], by: "reload" },
    },
    inside: {
      ask: { to: "inside", see: still, effects: [], by: "once" }, joined: { to: "inside", see: still, effects: [], by: "once" }, failed: { to: "inside", see: still, effects: [], by: "once" },
      tapEnd: { to: "confirm", see: { visitor: "「要結束這次對話嗎？結束後只能看」" }, effects: ["restore"], by: "confirm" }, cancel: { to: "inside", see: still, effects: [], by: "confirm" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" },
      ended: { to: "closed", see: { visitor: "結束原因、內容只能看、「再找真人」；輸入框移除，草稿留著可複製" }, effects: ["restore"], by: "readOnly" },
      reload: { to: "inside", see: { visitor: "原本的內容與草稿" }, effects: ["restore"], by: "reload" },
    },
    confirm: {
      ask: { to: "confirm", see: still, effects: [], by: "once" }, joined: { to: "confirm", see: still, effects: [], by: "once" }, failed: { to: "confirm", see: still, effects: [], by: "confirm" },
      tapEnd: { to: "confirm", see: still, effects: [], by: "confirm" }, cancel: { to: "inside", see: { visitor: "回到對話（按 Esc 或框外也一樣）" }, effects: ["restore"], by: "confirm" },
      confirmEnd: { to: "ending", see: { visitor: "「結束中…」，不能再按" }, effects: ["requestEnd"], by: "confirm" },
      ended: { to: "closed", see: { visitor: "確認框消失，顯示結束原因" }, effects: ["restore"], by: "readOnly" }, reload: { to: "inside", see: { visitor: "回到對話，確認框不保留" }, effects: ["restore"], by: "reload" },
    },
    ending: {
      ask: { to: "ending", see: still, effects: [], by: "once" }, joined: { to: "ending", see: still, effects: [], by: "once" }, failed: { to: "inside", see: { visitor: "「沒有結束成功，請再試一次」" }, effects: ["restore"], by: "confirm" },
      tapEnd: { to: "ending", see: still, effects: [], by: "confirm" }, cancel: { to: "ending", see: still, effects: [], by: "confirm" }, confirmEnd: { to: "ending", see: still, effects: [], by: "confirm" },
      ended: { to: "closed", see: { visitor: "結束原因、內容只能看、「再找真人」" }, effects: ["restore"], by: "readOnly" }, reload: { to: "inside", see: { visitor: "以伺服器為準：已結束就顯示已結束" }, effects: ["restore"], by: "reload" },
    },
    closed: {
      ask: { to: "reasking", see: { visitor: "「正在找人…」；舊內容在上方，只能看" }, effects: ["requestJoin"], by: "wait" }, joined: { to: "inside", see: { visitor: "晚到的確認：進入新的等候，舊內容在上方" }, effects: ["restore"], by: "once" }, failed: { to: "closed", see: still, effects: [], by: "once" },
      tapEnd: { never: "沒有結束按鈕", by: "ui" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" }, ended: { to: "closed", see: still, effects: [], by: "readOnly" },
      reload: { to: "closed", see: { visitor: "同樣的內容，只能看" }, effects: ["restore"], by: "reload" },
    },
    reasking: {
      ask: { to: "reasking", see: still, effects: [], by: "once" }, joined: { to: "inside", see: { visitor: "新的等候畫面；舊內容在上方，只能看" }, effects: ["restore"], by: "wait" }, failed: { to: "closed", see: { visitor: "「現在連不上，請再試一次」，舊內容不變" }, effects: ["restore"], by: "wait" },
      tapEnd: { never: "沒有結束按鈕", by: "ui" }, cancel: { never: "沒有取消按鈕", by: "ui" }, confirmEnd: { never: "沒有確定按鈕", by: "ui" }, ended: { to: "reasking", see: still, effects: [], by: "readOnly" },
      reload: { to: "reasking", see: { visitor: "「正在找人…」，用同一個要求再問一次" }, effects: ["requestJoin"], by: "reload" },
    },
  },
});

const calm = { agent: "沒有變化" } as const;

export const deskScreen = defineFlow({
  id: "screen.desk", kind: "interaction", title: "專員的畫面",
  states: { list: "清單", accepting: "接起中", talking: "對話中", ending: "結束中", review: "剛結束，只能看" },
  events: { tapAccept: "按「接起下一位」", accepted: "接起成功", refused: "接起被拒絕", failed: "收不下或連不上", tapEnd: "按「結束」", ended: "自己的對話結束了", tapBack: "按「回到清單」", reload: "重新整理" },
  effects: { requestAccept: "要求接起", requestEnd: "要求結束", restore: "還原畫面" },
  audience: { agent: "專員" },
  decisions: {
    list: { from: "owner", ref: "v0.1/F2.a" }, accept: { from: "owner", ref: "v0.1/F2.b" }, one: { from: "rule", ref: "queue.capacity" }, end: { from: "owner", ref: "v0.1/F7.a" },
    review: { from: "assumption", question: "對話結束後，專員還看得到內容嗎？", chosen: "停在那一段只能看，按「回到清單」才離開；v0.1 沒有歷史清單" },
    reload: { from: "rule", ref: "screen.reload" }, ui: { from: "convention", why: "按鈕不在這個畫面上" },
  },
  initial: "list", start: { see: { agent: "等候清單與「接起下一位」；沒有人時「目前沒有人在等」，按鈕停用" }, by: "list" },
  matrix: {
    list: {
      tapAccept: { to: "accepting", see: { agent: "按鈕變成「接起中…」，不能再按" }, effects: ["requestAccept"], by: "accept" }, accepted: { to: "talking", see: { agent: "另一個視窗接起了，這裡也進入對話" }, effects: ["restore"], by: "one" }, refused: { to: "list", see: calm, effects: [], by: "list" }, failed: { to: "list", see: calm, effects: [], by: "list" },
      tapEnd: { never: "清單沒有結束按鈕", by: "ui" }, ended: { to: "list", see: calm, effects: [], by: "list" }, tapBack: { to: "list", see: calm, effects: [], by: "list" }, reload: { to: "list", see: { agent: "以伺服器為準重新取得清單" }, effects: ["restore"], by: "reload" },
    },
    accepting: {
      tapAccept: { to: "accepting", see: calm, effects: [], by: "one" }, accepted: { to: "talking", see: { agent: "「已接通」、等候時的訊息、輸入框、「結束」" }, effects: ["restore"], by: "accept" }, refused: { to: "list", see: { agent: "「沒有人在等了」或「你正在服務另一位」，清單更新" }, effects: ["restore"], by: "one" }, failed: { to: "list", see: { agent: "「沒有接起成功，請再試一次」；若其實成功，連回後直接進入對話" }, effects: ["restore"], by: "accept" },
      tapEnd: { never: "還沒有結束按鈕", by: "ui" }, ended: { to: "review", see: { agent: "剛接通就結束了：顯示原因，只能看" }, effects: ["restore"], by: "review" }, tapBack: { never: "沒有回清單按鈕", by: "ui" }, reload: { to: "list", see: { agent: "以伺服器為準：接起成功就直接進入對話" }, effects: ["restore"], by: "reload" },
    },
    talking: {
      tapAccept: { to: "talking", see: calm, effects: [], by: "one" }, accepted: { to: "talking", see: calm, effects: [], by: "one" }, refused: { to: "talking", see: calm, effects: [], by: "one" }, failed: { to: "talking", see: calm, effects: [], by: "one" },
      tapEnd: { to: "ending", see: { agent: "「結束中…」，不能再按" }, effects: ["requestEnd"], by: "end" }, ended: { to: "review", see: { agent: "結束原因、內容只能看、「回到清單」" }, effects: ["restore"], by: "review" }, tapBack: { never: "對話中沒有回清單按鈕", by: "ui" }, reload: { to: "talking", see: { agent: "原本的內容與草稿" }, effects: ["restore"], by: "reload" },
    },
    ending: {
      tapAccept: { to: "ending", see: calm, effects: [], by: "one" }, accepted: { to: "ending", see: calm, effects: [], by: "one" }, refused: { to: "ending", see: calm, effects: [], by: "one" }, failed: { to: "talking", see: { agent: "「沒有結束成功，請再試一次」" }, effects: ["restore"], by: "end" },
      tapEnd: { to: "ending", see: calm, effects: [], by: "end" }, ended: { to: "review", see: { agent: "結束原因、內容只能看、「回到清單」" }, effects: ["restore"], by: "review" }, tapBack: { never: "結束中沒有回清單按鈕", by: "ui" }, reload: { to: "talking", see: { agent: "以伺服器為準：已結束就顯示已結束" }, effects: ["restore"], by: "reload" },
    },
    review: {
      tapAccept: { to: "review", see: calm, effects: [], by: "one" }, accepted: { to: "review", see: { agent: "停在這裡，顯示「已接起下一位，按回到清單查看」" }, effects: ["restore"], by: "review" }, refused: { to: "review", see: calm, effects: [], by: "one" }, failed: { to: "review", see: calm, effects: [], by: "one" },
      tapEnd: { never: "已經結束，沒有結束按鈕", by: "ui" }, ended: { to: "review", see: calm, effects: [], by: "review" }, tapBack: { to: "list", see: { agent: "清單；若已接起下一位就進入那段對話" }, effects: ["restore"], by: "review" }, reload: { to: "review", see: { agent: "同樣的內容，只能看" }, effects: ["restore"], by: "reload" },
    },
  },
});
