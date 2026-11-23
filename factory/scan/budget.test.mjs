import assert from "node:assert/strict";
import { test } from "node:test";
import { measure, overBudget } from "./budget.mjs";

const files = new Map([
  ["platform/a.ts", "// setTimeout(x)\nsetTimeout(x, 1);\n\nsetTimeout (y);"],
  ["platform/a.test.ts", "setTimeout(x);"],
  ["ui/b.tsx", "useEffect(() => {});\nconst r = useRef<HTMLElement>(null);\nuseLayoutEffect(() => {});"],
  ["apps/visitor/src/c.ts", "whatever"],
]);
test("數得對：註解與測試不算", () => { assert.deepEqual(measure(files), { "platform/lines": 2, "platform/timer": 2, "ui/lines": 3, "ui/effect": 2, "ui/ref": 1 }); });
test("超過上限 → 擋", () => { assert.deepEqual(overBudget({ "ui/ref": 2 }, { "ui/ref": 1 }), ["ui/ref 現在 2，上限 1"]); });
test("沒設上限 → 擋", () => { assert.equal(overBudget({ "ui/x": 0 }, {}).length, 1); });
test("變少可以", () => { assert.deepEqual(overBudget({ "ui/ref": 0 }, { "ui/ref": 1 }), []); });