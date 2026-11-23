// 最鬆的三層（platform、server、ui）設上限：變多就失敗，要負責人核准 budget.json 才能放寬（07 §7）
const COUNT = {
  timer: /\b(?:setTimeout|setInterval|setImmediate|queueMicrotask|requestAnimationFrame|requestIdleCallback)\s*\(/g,
  effect: /\buse(?:Layout|Insertion)?Effect\s*\(/g,
  ref: /\buseRef\s*[<(]/g,
};

/** files：路徑 → 內容（不含測試） */
export function measure(files) {
  const out = {};
  const add = (k, n) => { out[k] = (out[k] ?? 0) + n; };
  for (const [p, text] of files) {
    const layer = p.split("/")[0];
    if (!["platform", "server", "ui"].includes(layer) || /\.test\.tsx?$/.test(p) || !/\.tsx?$/.test(p)) continue;
    const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    add(`${layer}/lines`, code.split("\n").filter((l) => l.trim() !== "").length);
    if (layer === "ui") { add("ui/effect", (code.match(COUNT.effect) ?? []).length); add("ui/ref", (code.match(COUNT.ref) ?? []).length); }
    else add(`${layer}/timer`, (code.match(COUNT.timer) ?? []).length);
  }
  return out;
}

export function overBudget(now, budget) {
  return Object.entries(now).flatMap(([k, n]) => (k in budget ? (n > budget[k] ? [`${k} 現在 ${n}，上限 ${budget[k]}`] : []) : [`${k} 沒有設上限`]));
}