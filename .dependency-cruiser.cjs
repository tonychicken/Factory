const allow = {
  contracts: [], domain: ["contracts"], platform: ["contracts"], server: ["contracts"], data: ["contracts"],
  ui: ["platform", "contracts"], factory: [], specs: ["factory"],
};
const ALL = "^(contracts|domain|platform|server|data|ui|factory|specs|apps/[^/]+)/";
const APPS = { visitor: ["ui", "domain", "platform", "contracts"], desk: ["ui", "domain", "platform", "contracts"], gateway: ["server", "data", "domain", "contracts"] };
const rule = (name, from, to) => ({ name, severity: "error", from: { path: from }, to: { path: ALL, pathNot: to.map((x) => `^${x}/`) } });

module.exports = {
  forbidden: [
    { name: "不准循環", severity: "error", from: {}, to: { circular: true } },
    ...Object.entries(allow).map(([k, v]) => rule(`${k} 的引用方向`, `^${k}/`, [k, ...v])),
    ...Object.entries(APPS).map(([k, v]) => rule(`apps/${k} 的引用方向`, `^apps/${k}/`, [`apps/${k}`, ...v])),
    { name: "未登記的 app", severity: "error", from: { path: "^apps/", pathNot: `^apps/(${Object.keys(APPS).join("|")})/` }, to: {} },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.base.json" }, doNotFollow: { path: "node_modules" }, exclude: { path: "\\.types/|/dist/" } },
};