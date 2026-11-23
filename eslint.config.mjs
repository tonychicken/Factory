import { rulesFor } from "./factory/rules/config.mjs";

const at = (layer, kind, files, ignores = []) =>
  rulesFor(layer, { projectService: true, tsconfigRootDir: import.meta.dirname }, kind).map((c) => ({ ...c, files, ignores }));

const SRC = { contracts: "contracts/**", domain: "domain/**", platform: "platform/**", server: "server/**", data: "data/**", ui: "ui/**", apps: "apps/{visitor,desk}/src/**", gateway: "apps/gateway/src/**" };
const TEST = ["**/*.test.ts", "**/*.test.tsx"];
const ENTRY = ["apps/{visitor,desk}/src/main.tsx"];
const SERVER_ENTRY = ["apps/gateway/src/main.ts"];

export default [
  { ignores: ["**/.types/**", "**/dist/**", "**/node_modules/**", "factory/**", "specs/**", "*.ts", "*.mjs", "*.cjs"] },
  ...Object.entries(SRC).flatMap(([layer, dir]) => at(layer, "code", [`${dir}/*.ts`, `${dir}/*.tsx`], [...TEST, ...ENTRY, ...SERVER_ENTRY])),
  ...at("gateway", "entry", SERVER_ENTRY),
  ...at("apps", "entry", ENTRY),
];