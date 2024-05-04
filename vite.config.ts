import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      components: "/src/components",
      context: "/src/context",
      hooks: "/src/hooks",
      lib: "/src/lib",
      pages: "/src/pages",
    },
  },
});
