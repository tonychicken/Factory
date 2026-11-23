// 豁免登記（03 §7）。這個檔案受保護。每筆：rule、file、reason、owner、until、recoverWhen
const KEYS = ["rule", "file", "reason", "owner", "until", "recoverWhen"];

export function checkExemptions(list, today) {
  const out = [];
  list.forEach((e, i) => {
    for (const k of KEYS) if (typeof e[k] !== "string" || e[k].trim() === "") out.push(`第 ${i + 1} 筆缺少 ${k}`);
    if (/[*?]/.test(e.file ?? "")) out.push(`第 ${i + 1} 筆的 file 不能用萬用字元`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.until ?? "")) out.push(`第 ${i + 1} 筆的 until 要是日期`);
    else if (e.until < today) out.push(`第 ${i + 1} 筆已過期（${e.until}）：${e.rule} ${e.file}`);
  });
  return out;
}

export const exempt = (list, file, rule) => list.some((e) => e.file === file && e.rule === rule);