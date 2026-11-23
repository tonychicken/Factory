// R27：產品資料夾只能放核准的檔案；HTML 只能有一個指向 /src/ 的 module script
const ROOTS = /^(apps|domain|contracts|ui|platform|server|data)\//;
const OK = /^(apps|ui|platform)\/[^.]+(\.test)?\.(ts|tsx|css)$|^(domain|contracts|server|data)\/[^.]+(\.test)?\.ts$|^apps\/[\w-]+\/index\.html$|^apps\/[\w-]+\/public\/[\w-]+\.(png|svg|webp|ico|woff2)$/;
export function checkFiles(files) {
  const out = [];
  for (const [p, text] of files) {
    if (!ROOTS.test(p)) continue;
    if (!OK.test(p)) { out.push(`${p}：不是核准的檔案類型`); continue; }
    if (p.endsWith(".html")) {
      const tags = text.match(/<script\b[^>]*>/gi) ?? [];
      if (tags.length !== 1 || !/^<script type="module" src="\/src\/[\w/-]+\.tsx?">$/.test(tags[0] ?? "")) out.push(`${p}：只能有一個指向 /src/ 的 script`);
      if (/\son\w+\s*=|javascript:|<iframe|<object|<embed|<meta[^>]+refresh/i.test(text)) out.push(`${p}：有可執行的屬性或標籤`);
    }
    if (p.endsWith(".svg") && /<script|\son\w+\s*=|javascript:|<foreignObject/i.test(text)) out.push(`${p}：SVG 裡有可執行內容`);
  }
  return out;
}