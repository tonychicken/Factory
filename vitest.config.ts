import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["{contracts,domain,platform,ui,apps}/**/*.test.{ts,tsx}"], retry: 0, allowOnly: false } });
