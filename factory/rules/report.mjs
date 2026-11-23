// 同一行已經有工廠規則的訊息時，隱藏只會讓人誤解的後續錯誤（例如叫你加 dom lib）
const NOISE = /^(TS2304|TS2584|TS2812|TS7016|TS2591|TS2307|TS7017|TS2339|TS2550|TS2305|@typescript-eslint\/no-unsafe-|@typescript-eslint\/no-unnecessary-|@typescript-eslint\/no-meaningless-void|@typescript-eslint\/no-confusing-void|no-unsanitized)/;
const FACTORY = /^(f\/|no-restricted-)/;
/** items: { line, rule, message }[] */
export function quiet(items) {
  const lines = new Set(items.filter((i) => FACTORY.test(i.rule)).map((i) => i.line));
  const seen = new Set();
  return items.filter((i) => {
    if (NOISE.test(i.rule) && (lines.has(i.line) || (lines.size > 0 && /error typed|could not be resolved|error. type/.test(i.message)))) return false;
    const key = `${i.line}|${i.rule}|${i.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}