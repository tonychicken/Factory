// 規則設定。改這個檔案要負責人核准（05 §6）。
// layer：contracts、domain（純邏輯）、ui、apps（瀏覽器）、gateway（伺服器的產品碼）
//        platform（瀏覽器邊界）、server（Node 邊界）、data（資料庫邊界）
// kind：code、test、entry
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import effect from "eslint-plugin-react-you-might-not-need-an-effect";
import unsanitized from "eslint-plugin-no-unsanitized";
import f from "./plugin.mjs";


const errorAll = (rules) => Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, Array.isArray(v) ? ["error", ...v.slice(1)] : "error"]));

// 產品碼可用的語言功能。沒有 Promise（只能 async/await）、Date、Intl、Reflect、globalThis
const LANG = ["undefined", "NaN", "Infinity", "Error", "TypeError", "RangeError", "Array", "Object", "Map", "Set", "Number", "String", "Boolean", "BigInt", "Math"];
const HINTS = {
  setTimeout: "輸入延遲用 @f/ui 的 useDebounced；重試用 @f/platform 的 retry",
  setInterval: "需要定時更新的畫面用 ui 元件；沒有就提出需求",
  Date: "@f/platform 的 dayKey、formatTime（時間由參數傳入）",
  Intl: "@f/platform 的 formatTime",
  JSON: "@f/platform 的 parseJson 或 toJson（在邊界解析，domain 只收解析好的資料）",
  Promise: "async/await；同時等多個用 @f/platform 的 all",
  fetch: "@f/contracts 產生的 client",
  document: "ui 元件", window: "ui 元件或 platform", localStorage: "@f/platform 的儲存",
  console: "@f/platform 的 log", crypto: "由參數傳入的編號",
};
const IMPORT_HINTS = {
  useEffect: "輸入延遲用 @f/ui 的 useDebounced；訂閱用 ui 提供的 hook；計算用 useMemo",
  useLayoutEffect: "捲動與量測用 ui 元件（例如 MessageList）", useRef: "ui 元件", default: "具名匯入",
};
const REACT = ["useState", "useReducer", "useMemo", "useCallback", "useId", "useContext", "createContext", "memo", "Fragment", "useDeferredValue"];
const TIMING = ["setTimeout", "setInterval", "setImmediate", "queueMicrotask", "requestAnimationFrame", "requestIdleCallback", "postTask", "defaultView", "ownerDocument", "constructor", "__proto__", "animate", "onfinish"];

const sel = (selector, message) => ({ selector, message });
const PRODUCT_SYNTAX = [
  sel("[declare=true]", "禁止 declare：不能自己宣告不存在的東西"),
  sel("TSDeclareFunction", "禁止函式多載：會變成型別斷言"),
  sel("TSTypePredicate", "禁止自訂型別守衛：改用 Zod 或可辨識聯集"),
  sel("[definite=true]", "禁止 let x!: T"),
  sel("TSIndexSignature", "禁止索引簽章：改用 Map"),
  sel("TSTypeReference[typeName.name='Record'][typeArguments.params.0.type='TSStringKeyword']", "禁止 Record<string, …>：改用 Map"),
  sel("TSModuleDeclaration:not([declare=true])", "禁止 namespace"),
  sel("TSObjectKeyword", "禁止 object 型別：寫出實際的欄位"),
  sel("TSAsExpression:not([typeAnnotation.typeName.name='const'])", "禁止 as 轉型。改用：contracts 的 Zod schema 驗證，或可辨識聯集"),
  sel("TSTypeAssertion", "禁止 <T> 轉型。改用：contracts 的 Zod schema 驗證"),
  sel("AssignmentExpression[left.type='MemberExpression']", "禁止改物件的屬性。改用：產生新物件 { ...old, x: 1 }"),
  sel("UpdateExpression[argument.type='MemberExpression']", "禁止改物件的屬性。改用：產生新物件"),
  sel("UnaryExpression[operator='delete']", "禁止 delete。改用：產生新物件或 Map"),
  sel("MemberExpression[object.name='Object']:not([property.name=/^(keys|values|entries|fromEntries|hasOwn|groupBy)$/])", "Object 只准用 keys、values、entries、fromEntries、hasOwn、groupBy"),
  sel("Program > :matches(VariableDeclaration, ExportNamedDeclaration) Literal[regex.flags=/[gy]/]:not(:function Literal)", "模組層的正規表示式不准用 g 或 y（會記住位置）"),
  sel("CallExpression[callee.property.name=/^replace(All)?$/] > :matches(ArrowFunctionExpression, FunctionExpression)[params.length>1]", "replace 的函式只准用第一個參數（其餘沒有型別）"),
  sel("CallExpression[callee.object.name='Array'][callee.property.name='from'][typeArguments]", "禁止 Array.from<T>：型別不會被檢查"),
  sel("TSImportEqualsDeclaration", "禁止 import = require"),
  sel("TSEnumDeclaration", "禁止 enum：改用 as const"),
  sel("ImportExpression", "禁止動態 import"),
  sel("MetaProperty", "禁止 import.meta"),
  sel(":matches(ClassDeclaration, ClassExpression)", "產品碼不用 class"),
  sel("CallExpression[callee.property.name=/^(then|catch|finally)$/]", "改用 async/await"),
  sel("Property[key.name='then']", "禁止自製 thenable"),
  sel("CallExpression[callee.property.name='fromAsync']", "禁止 fromAsync"),
  sel(":matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)[generator=true]", "禁止 generator"),
  sel("ForOfStatement[await=true]", "禁止 for await"),
  sel("WhileStatement", "禁止 while：改用 for...of 或陣列方法"),
  sel("DoWhileStatement", "禁止 do...while"),
  sel("ForStatement", "禁止 for(;;)：改用 for...of 或陣列方法"),
  sel("ForInStatement", "禁止 for...in"),
  sel("Program > VariableDeclaration[kind!='const']", "禁止模組層可變狀態"),
  sel("Program > ExportNamedDeclaration > VariableDeclaration[kind!='const']", "禁止模組層可變狀態"),
  sel("Program > :matches(VariableDeclaration, ExportNamedDeclaration) NewExpression[callee.name=/^(Map|Set|Array|Object)$/]:not(:function NewExpression)", "禁止模組層可變容器"),
  sel("Program > VariableDeclaration > VariableDeclarator[init.type=/^(ArrayExpression|ObjectExpression)$/]", "模組層的陣列與物件要加 as const"),
  sel("Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type=/^(ArrayExpression|ObjectExpression)$/]", "模組層的陣列與物件要加 as const"),
  sel("CallExpression[callee.property.name='addEventListener']", "事件只能寫在 ui 元件上"),
  sel("MemberExpression[property.name=/^(skip|only|todo|skipIf|runIf|fails)$/]", "不准跳過測試"),
  sel(":matches(MemberExpression[property.name=/^(any|custom|instanceof)$/], ObjectPattern > Property[key.name=/^(any|custom|instanceof)$/])", "Zod 不可產生未驗證的型別"),
  sel("Literal[value=/^\\s*javascript:/i]", "禁止 javascript: 連結"),
  sel("UnaryExpression[operator='void']", "禁止 void 丟棄結果：改用 await"),
];

const EDGE_SYNTAX = [
  sel("[declare=true]", "禁止 declare"),
  sel("ImportExpression", "禁止動態 import"),
  sel("TSTypePredicate", "禁止自訂型別守衛：改用 Zod"),
  sel("JSXAttribute[name.name='dangerouslySetInnerHTML']", "改用 ui 的訊息元件"),
];
const EDGE_PACKAGES = {
  platform: { react: ["StrictMode"], "react-dom/client": ["createRoot"], zod: ["z"], "@f/contracts": "*" },
  server: { "node:crypto": ["randomUUID"], "node:http": "*", hono: "*", "@hono/node-server": "*", zod: ["z"], "@f/contracts": "*" },
  data: { "drizzle-orm": "*", "drizzle-orm/pg-core": "*", "drizzle-orm/node-postgres": "*", pg: "*", zod: ["z"], "@f/contracts": "*" },
};

/** parser：案例庫給 { programs: [program] }；真專案給 { projectService: true } */
export function rulesFor(layer, parser, kind = "code") {
  const product = ["apps", "gateway", "domain", "contracts"].includes(layer);
  const pure = layer === "domain" || layer === "contracts";
  const edge = ["platform", "server", "data"].includes(layer);
  const isTest = kind === "test";
  const isEntry = kind === "entry";
  return [
    ...tseslint.configs.strictTypeChecked,
    {
      files: ["**/*.ts", "**/*.tsx"],
      linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
      languageOptions: { parserOptions: { ...parser, ecmaFeatures: { jsx: true } } },
      plugins: { "react-hooks": hooks, "no-unsanitized": unsanitized, e: effect, f },
      rules: {
        ...errorAll(hooks.configs.flat.recommended.rules),
        ...Object.fromEntries(Object.keys(effect.rules).map((r) => [`e/${r}`, "error"])),
        "no-unsanitized/method": "error",
        "no-unsanitized/property": "error",
        "no-eval": "error",
        "no-unsafe-finally": "error",
        "no-empty-function": "error",
        "@typescript-eslint/switch-exhaustiveness-check": ["error", { requireDefaultForNonUnion: true }],
        "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": true }],
        "@typescript-eslint/triple-slash-reference": ["error", { lib: "never", path: "never", types: "never" }],
        "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: false, ignoreIIFE: false }],
        "@typescript-eslint/method-signature-style": ["error", "property"],
        // HTML 事件的 void 回傳由 ui 的型別決定，允許簡寫
        "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
        "f/catch-must-handle": ["error", { handlers: ["reportError"], allowResult: edge }],
        ...(layer !== "platform" && layer !== "server" && {
          "no-restricted-properties": ["error", ...TIMING.map((property) => ({ property, message: "禁止碰計時或全域物件" })),
            { object: "Math", property: "random", message: "改用傳入的亂數" }],
        }),
        ...(layer === "ui" && {
          "f/global-allowlist": ["error", { allow: LANG, hints: HINTS }],
          "f/import-allowlist": ["error", { hints: IMPORT_HINTS, packages: { react: [...REACT, "useEffect", "useRef", "useSyncExternalStore", "useLayoutEffect"], "@f/platform": "*", "@f/contracts": "*" } }],
          "no-restricted-syntax": ["error", sel("[declare=true]", "禁止 declare"), sel("ImportExpression", "禁止動態 import"), sel("TSTypePredicate", "禁止自訂型別守衛"),
            sel("JSXAttribute[name.name='dangerouslySetInnerHTML']", "改用訊息元件"), sel("CallExpression[callee.property.name='addEventListener']", "改用 platform 的訂閱")],
          "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
        }),
        ...(edge && {
          "f/import-allowlist": ["error", { hints: IMPORT_HINTS, packages: EDGE_PACKAGES[layer] }],
          "no-restricted-syntax": ["error", ...EDGE_SYNTAX],
          "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
          ...(layer === "data" && { "f/global-allowlist": ["error", { allow: LANG, hints: HINTS }] }),
        }),
        ...(product && {
          "f/global-allowlist": ["error", { allow: LANG, hints: HINTS }],
          "f/no-promise-to-unknown": "error",
          "f/no-dynamic-key": "error",
          "f/import-allowlist": ["error", { hints: IMPORT_HINTS, packages: {
            zod: ["z"], "@f/contracts": "*", "@f/domain": "*",
            ...(layer === "apps" && { react: REACT, "@f/ui": "*", "@f/platform": "*" }),
            ...(layer === "gateway" && { "@f/server": "*", "@f/data": "*" }),
            ...(isTest && { vitest: ["describe", "it", "expect"], "fast-check": "*" }),
          } }],
          "f/jsx-allowlist": ["error", {
            tags: layer !== "apps" ? [] : ["div", "section", "header", "footer", "main", "nav", "aside", "article", "p", "span", "ul", "ol", "li", "h1", "h2", "h3", "strong", "em", "time"],
            attrs: ["className", "key", "role", "lang", "dateTime"],
          }],
          ...(!isTest && { "f/no-render-effects": ["error", { entryCalls: isEntry ? [layer === "gateway" ? "start" : "mount"] : [] }] }),
          "no-restricted-syntax": ["error", ...PRODUCT_SYNTAX,
            ...(pure ? [sel("[async=true]", "純邏輯不准有非同步")] : [])],
        }),
      },
    },
  ];
}
