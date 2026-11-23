// 案例庫的執行器：每個案例獨立建立型別環境，避免互相污染
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { Linter } from "eslint";

const here = import.meta.dirname.replaceAll("\\", "/");
export const root = path.resolve(here, "../../..").replaceAll("\\", "/");
const pure = ["lib.es2024.d.ts"];
const dom = ["lib.es2024.d.ts", "lib.dom.d.ts"];
const LIB = { contracts: pure, domain: pure, apps: pure, ui: dom, platform: dom };
const DIR = { contracts: "contracts", domain: "domain", apps: "apps/visitor/src", ui: "ui", platform: "platform" };
const stub = (n) => [`${here}/stubs/${n}.d.ts`];
const cache = new Map();

export const cases = JSON.parse(fs.readFileSync(`${here}/cases.json`, "utf8")).map((c) => ({ ...c, code: c.code.join("\n") }));

export function prepare(c, i) {
  const file = `${root}/${DIR[c.layer]}/case${i}${c.kind === "test" ? ".test" : ""}.${c.ext}`;
  const options = {
    target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true, noUncheckedSideEffectImports: true,
    isolatedModules: true, noEmit: true, skipLibCheck: true, rootDir: root, types: [], lib: LIB[c.layer],
    paths: { "@f/platform": stub("platform"), "@f/ui": stub("ui"), "@f/contracts": stub("contracts") },
  };
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  const same = (n) => n.replaceAll("\\", "/") === file;
  host.fileExists = (n) => same(n) || fileExists.call(host, n);
  host.readFile = (n) => (same(n) ? c.code : readFile.call(host, n));
  host.getSourceFile = (n, o) => {
    if (same(n)) return ts.createSourceFile(n, c.code, o, true);
    if (!cache.has(n)) cache.set(n, getSourceFile.call(host, n, o));
    return cache.get(n);
  };
  const program = ts.createProgram([file], options, host);
  const types = ts.getPreEmitDiagnostics(program).filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map((d) => ({ line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : 0, rule: `TS${d.code}`, message: ts.flattenDiagnosticMessageText(d.messageText, " ") }));
  return { file, program, types };
}

export function lint(c, p, config) {
  return new Linter({ cwd: root, configType: "flat" }).verify(c.code, config, { filename: p.file })
    .map((m) => ({ line: m.line, rule: m.ruleId ?? "eslint", message: m.message, fatal: m.fatal === true }));
}