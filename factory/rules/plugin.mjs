// 工廠自訂規則
const isTypeRef = (ref) => ref.isTypeReference && !ref.isValueReference;

/** 全域變數白名單：沒列出的一律不能當值使用 */
const globalAllowlist = {
  meta: { type: "problem", schema: [{ type: "object" }], messages: { bad: "禁止使用全域 {{name}}。改用：{{hint}}" } },
  create(context) {
    const allow = new Set(context.options[0].allow);
    const hints = context.options[0].hints ?? {};
    return {
      "Program:exit"(node) {
        const scope = context.sourceCode.getScope(node);
        const globalScope = scope.type === "global" ? scope : scope.upper;
        const report = (ref) => {
          if (isTypeRef(ref) || allow.has(ref.identifier.name)) return;
          context.report({ node: ref.identifier, messageId: "bad", data: { name: ref.identifier.name, hint: Object.hasOwn(hints, ref.identifier.name) ? hints[ref.identifier.name] : "platform 或 ui 提供的功能；都沒有就停下來提出需求，不要自己做" } });
        };
        for (const ref of globalScope.through) report(ref);
        for (const v of globalScope.variables) if (v.defs.length === 0) v.references.forEach(report);
      },
    };
  },
};

/** 匯入白名單：套件與可用名稱都要列出 */
const importAllowlist = {
  meta: { type: "problem", schema: [{ type: "object" }], messages: {
    src: "禁止匯入 {{src}}。原因：不在核准的套件清單。改用：platform 或 ui",
    name: "禁止從 {{src}} 匯入 {{name}}。改用：{{hint}}",
  } },
  create(context) {
    const packages = context.options[0].packages;
    const hints = context.options[0].hints ?? {};
    const hint = (n) => (Object.hasOwn(hints, n) ? hints[n] : "ui 提供的 hook 或元件；都沒有就停下來提出需求，不要自己做");
    const check = (node, names) => {
      if (!node.source) return;
      const src = String(node.source.value);
      if (/^\.\.?\//.test(src)) {
        if (!/^[./\w-]+$/.test(src) || /\.(js|mjs|cjs|jsx|css|json)$/.test(src)) context.report({ node, messageId: "src", data: { src } });
        return;
      }
      const allowed = Object.hasOwn(packages, src) ? packages[src] : undefined;
      if (allowed === undefined) { context.report({ node, messageId: "src", data: { src } }); return; }
      if (allowed === "*") return;
      if (node.type === "ImportDeclaration") for (const s of node.specifiers) if (s.type === "ImportSpecifier" && s.imported.name !== s.local.name) context.report({ node: s, messageId: "name", data: { src, name: `${s.imported.name} 並改名`, hint: "原本的名稱" } });
      for (const n of names) if (!allowed.includes(n)) context.report({ node, messageId: "name", data: { src, name: n, hint: hint(n) } });
    };
    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") { check(node, []); return; }
        check(node, node.specifiers.filter((s) => s.importKind !== "type").map((s) =>
          s.type === "ImportSpecifier" ? s.imported.name ?? s.imported.value : s.type === "ImportDefaultSpecifier" ? "default" : "*"));
      },
      ExportNamedDeclaration(node) { check(node, node.specifiers.map((s) => s.local.name ?? s.local.value)); },
      ExportAllDeclaration(node) { check(node, ["*"]); },
    };
  },
};

/** 產品畫面只能用版面用的 HTML 標籤與少數屬性；互動一律用 ui 元件 */
const jsxAllowlist = {
  meta: { type: "problem", schema: [{ type: "object" }], messages: {
    tag: "禁止使用 <{{name}}>。改用：ui 元件",
    attr: "禁止使用屬性 {{name}}。改用：ui 元件",
    spread: "禁止在 HTML 標籤上展開屬性",
  } },
  create(context) {
    const { tags, attrs } = context.options[0];
    return {
      JSXOpeningElement(node) {
        for (const a of node.attributes) {
          if (a.type === "JSXAttribute" && ["ref", "dangerouslySetInnerHTML", "style"].includes(a.name.name)) context.report({ node: a, messageId: "attr", data: { name: a.name.name } });
        }
        if (node.name.type !== "JSXIdentifier" || !/^[a-z]/.test(node.name.name)) {
          if (node.name.type === "JSXNamespacedName") context.report({ node, messageId: "tag", data: { name: "namespaced" } });
          return;
        }
        if (!tags.includes(node.name.name)) context.report({ node, messageId: "tag", data: { name: node.name.name } });
        for (const a of node.attributes) {
          if (a.type === "JSXSpreadAttribute") { context.report({ node: a, messageId: "spread" }); continue; }
          const n = a.name.type === "JSXIdentifier" ? a.name.name : "namespaced";
          if (!attrs.includes(n) && !n.startsWith("aria-")) context.report({ node: a, messageId: "attr", data: { name: n } });
        }
      },
    };
  },
};

/** catch 必須把錯誤往外拋，或交給核准的處理函式 */
const catchMustHandle = {
  meta: { type: "problem", schema: [{ type: "object" }], messages: { bad: "catch 裡一定要處理錯誤，不能放在 if 裡。改用：throw，或 @f/platform 的 reportError(error)。只是解析 JSON 的話改用 @f/platform 的 parseJson，不需要 try" } },
  create(context) {
    const handlers = context.options[0].handlers;

    const fromPlatform = (id) => {
      let s = context.sourceCode.getScope(id);
      while (s) { const v = s.set.get(id.name); if (v) return v.defs.some((x) => x.type === "ImportBinding" && x.parent.source.value === "@f/platform"); s = s.upper; }
      return false;
    };
    return {
      CatchClause(node) {
        const name = node.param?.type === "Identifier" ? node.param.name : undefined;
        const handles = (e) => e?.type === "CallExpression" && e.callee.type === "Identifier" && handlers.includes(e.callee.name) && fromPlatform(e.callee) && e.arguments.some((x) => x.type === "Identifier" && x.name === name);
        const asResult = (e) => context.options[0].allowResult === true && e?.type === "ObjectExpression"
          && e.properties.some((p) => p.type === "Property" && p.key.name === "ok" && p.value.type === "Literal" && p.value.value === false)
          && e.properties.some((p) => p.type === "Property" && p.value.type === "Identifier" && p.value.name === name);
        const ok = node.body.body.some((s) => s.type === "ThrowStatement" || (s.type === "ExpressionStatement" && handles(s.expression)) || (s.type === "ReturnStatement" && (handles(s.argument) || asResult(s.argument))));
        if (!ok) context.report({ node, messageId: "bad" });
      },
    };
  },
};

/** Promise 不准交給 unknown：會躲過 await 檢查 */
const noPromiseToUnknown = {
  meta: { type: "problem", schema: [], messages: { bad: "Promise 不能當成 unknown 傳出去。改用：await，或把型別寫清楚" } },
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services.program.getTypeChecker();
    const check = (node) => {
      const ts = services.esTreeNodeToTSNodeMap.get(node);
      const type = checker.getTypeAtLocation(ts);
      if (type.getProperty?.("then") === undefined) return;
      const want = checker.getContextualType(ts);
      if (want && (want.flags & 3) !== 0) context.report({ node, messageId: "bad" }); // Any | Unknown
    };
    return { CallExpression: check, "Identifier.arguments": check, "Identifier.init": check, "Identifier.body": check, "ReturnStatement > Identifier": check };
  },
};

/** 動態取屬性：鍵的型別必須是數字或安全的字面值 */
const noDynamicKey = {
  meta: { type: "problem", schema: [], messages: { bad: "禁止用變數取屬性（{{type}}）。改用：Map，或寫明屬性名稱" } },
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services.program.getTypeChecker();
    const DANGER = new Set(["constructor", "prototype", "__proto__"]);
    const safe = (type) => {
      if (type.isUnion()) return type.types.every(safe);
      if ((type.flags & (8 | 256)) !== 0) return true; // number
      if (type.isNumberLiteral?.()) return true;
      if (type.isStringLiteral?.()) return !DANGER.has(type.value);
      return false;
    };
    const check = (key, node) => {
      const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(key));
      if (!safe(type)) context.report({ node, messageId: "bad", data: { type: checker.typeToString(type) } });
    };
    return {
      "MemberExpression[computed=true]"(node) { check(node.property, node); },
      "ObjectPattern > Property[computed=true]"(node) { check(node.key, node); },
      "ObjectPattern > Property[computed=false]"(node) { if (node.key.type === "Identifier" && DANGER.has(node.key.name)) context.report({ node, messageId: "bad", data: { type: node.key.name } }); },
    };
  },
};
/** 畫面函式執行時不能順便做事：元件本體與 useMemo/useState/useReducer 的計算裡，不准有「只為副作用」的呼叫 */
const noRenderEffects = {
  meta: { type: "problem", schema: [{ type: "object" }], messages: { bad: "畫面計算時不准有副作用。改用：事件處理函式，或 ui 的 hook", top: "模組載入時不准做事。改用：函式，由入口檔呼叫" } },
  create(context) {
    const isComponent = (fn) => {
      const n = fn.id?.name ?? (fn.parent?.type === "VariableDeclarator" && fn.parent.id.type === "Identifier" ? fn.parent.id.name : undefined);
      return n !== undefined && /^([A-Z]|use[A-Z])/.test(n);
    };
    const topCall = (node) => {
      let cur = node;
      while (cur.type === "CallExpression" || cur.type === "MemberExpression") cur = cur.type === "CallExpression" ? cur.callee : cur.object;
      const name = cur.type === "Identifier" ? cur.name : "";
      if (!["z", "createContext", "memo", "debounce"].includes(name) && !/^[A-Z]/.test(name)) context.report({ node, messageId: "top" });
    };
    const isFn = (n) => /Function/.test(n.type);
    const pureHooks = new Set(["useMemo", "useState", "useReducer"]);
    return {
      ExpressionStatement(node) {
        const call = node.expression;
        if (call.type === "CallExpression" && call.callee.type === "Identifier" && /^use[A-Z]/.test(call.callee.name)) return;
        if (node.parent.type === "Program" && call.type === "CallExpression" && call.callee.type === "Identifier" && (context.options[0]?.entryCalls ?? []).includes(call.callee.name)) return;
        let cur = node.parent;
        while (cur) {
          if (isFn(cur)) {
            if (isComponent(cur)) { context.report({ node, messageId: "bad" }); return; }
            const p = cur.parent;
            if (p?.type === "CallExpression" && p.arguments.includes(cur) && p.callee.type === "Identifier" && pureHooks.has(p.callee.name)) { context.report({ node, messageId: "bad" }); return; }
            return;
          }
          cur = cur.parent;
        }
        context.report({ node, messageId: "top" });
      },
      "Program > :matches(VariableDeclaration, ExportNamedDeclaration > VariableDeclaration) > VariableDeclarator > CallExpression.init"(node) { topCall(node); },
      "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > CallExpression.init"(node) { topCall(node); },
    };
  },
};

export default { rules: {
  "global-allowlist": globalAllowlist,
  "import-allowlist": importAllowlist,
  "jsx-allowlist": jsxAllowlist,
  "catch-must-handle": catchMustHandle,
  "no-render-effects": noRenderEffects,
  "no-promise-to-unknown": noPromiseToUnknown,
  "no-dynamic-key": noDynamicKey,
} };
