import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mismo alias que tsconfig ("@/lib/..."), para que los módulos que lo usan
// también se puedan testear.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) }],
  },
});
