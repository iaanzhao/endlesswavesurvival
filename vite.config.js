import { defineConfig } from "vite";

const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  server: {
    port: 5174,
    strictPort: true,
    open: true,
  },
});
