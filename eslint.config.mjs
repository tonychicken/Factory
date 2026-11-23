import { rulesFor } from "./factory/rules/config.mjs";

const at = (layer, kind, files, ignores = []) =>
  rulesFor(layer, { projectService: true, tsconfigRootDir: import.meta.dirname }, kind).map((c) => ({ ...c, files, ignores }));

const SRC = { contracts: "contracts/**", domain: "domain/**", platform: "platform/**", ui: "ui/**", apps: "apps/*/src/**" };
const TEST = ["**/*.test.ts", "**/*.test.tsx"];
const ENTRY = ["apps/*/src/main.tsx"];

export default [
  { ignores: ["**/.types/**", "**/dist/**", "**/node_modules/**", "factory/**", "specs/**", "*.ts", "*.mjs", "*.cjs"] },
  ...Object.entries(SRC).flatMap(([layer, dir]) => at(layer, "code", [`${dir}/*.ts`, `${dir}/*.tsx`], [...TEST, ...ENTRY])),
  ...at("apps", "entry", ENTRY),
];